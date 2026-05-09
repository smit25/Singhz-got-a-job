# Mode: batch-apply — Batch Application Orchestrator

Fill and submit applications for all jobs in the approve queue. Human reviews each completed form before clicking Submit — Claude fills everything else.

## Architecture

```text
Phase 1: Form Extraction  (parallel subagents, read-only)
  → Navigate each URL, detect platform, extract all fields
  → Match fields to report Section H (Draft Application Answers)
  → Tag each field: answered | partial | needs_input

Phase 2: Gap Collection   (user-facing, one pass)
  → Aggregate ALL needs_input questions across all jobs
  → Deduplicate common questions (salary, visa, etc.)
  → Ask user once — answers fan back out to all matching forms

Phase 3: Form Filling     (sequential, Playwright)
  → Fill each form with complete answers
  → Attach PDF if upload field detected
  → STOP before Submit — show user the complete form

Phase 4: Final Review     (user-driven, one job at a time)
  → User reviews each filled form
  → User clicks Submit
  → Claude updates apply-queue.md + applications.md to Applied
```

**Hard rule: Claude NEVER clicks Submit or Send. The user does.**

---

## Prerequisites

1. `data/apply-queue.md` must have rows with status `Queued`
2. PDF must exist in `output/` for each job (or generate via `/career-ops pdf` first)
3. For LinkedIn Easy Apply: user must be logged into LinkedIn in Chrome (`claude --chrome` mode)

If apply-queue.md is empty or has no `Queued` rows:
```
Apply queue is empty. Run /career-ops approve first to select jobs.
```

---

## Phase 1 — Form Extraction

Read `data/apply-queue.md` → collect all rows with status `Queued`.

For each job, extract the form **in parallel** (subagents, background):

```
For each queued job:
  1. Navigate to URL with Playwright (browser_navigate + browser_snapshot)
  2. Detect platform (see Platform Detection below)
  3. Extract all visible form fields
  4. Match fields to Section H of the report
  5. Tag each field
  6. Update apply-queue.md status: Queued → Form Extracted
```

Launch up to 3 extraction subagents in parallel (read-only, no form interaction):

```python
Agent(
  subagent_type="general-purpose",
  prompt="Extract form fields from {url}. Load report at {report_path}. Find Section H (Draft Application Answers). For each visible form field, check if Section H has an answer. Return JSON: {fields: [{label, type, answer_status, draft_answer, form_selector}]}",
  run_in_background=True
)
```

### Platform Detection

| Signal | Platform | Apply strategy |
|--------|----------|---------------|
| `jobs.ashbyhq.com` | Ashby | Direct Playwright form fill |
| `boards.greenhouse.io` or `job-boards.greenhouse.io` | Greenhouse | Direct Playwright form fill |
| `jobs.lever.co` | Lever | Direct Playwright form fill |
| `myworkdayjobs.com` | Workday | Playwright — multi-step wizard |
| `linkedin.com/jobs/` + "Easy Apply" button | LinkedIn Easy Apply | Authenticated session required |
| `apply.workable.com` | Workable | Direct Playwright form fill |
| Custom career page | Unknown | Playwright — infer from DOM |

### Field Classification

For each extracted field:

| Tag | Meaning | Source |
|-----|---------|--------|
| `answered` | Section H has a complete answer | Copy directly |
| `partial` | Section H has a relevant answer that needs adaptation | Adapt from H |
| `needs_input` | Not in Section H, cannot answer from CV | Ask user |
| `auto` | Deterministic answer from profile.yml (name, email, phone, LinkedIn, location, visa) | Fill from config/profile.yml |
| `upload` | File upload field (resume, cover letter) | Use PDF from output/ |

**Auto-fill from `config/profile.yml`** (never ask user for these):
- Full name → `candidate.full_name`
- Email → `candidate.email`
- Phone → `candidate.phone`
- LinkedIn URL → `candidate.linkedin`
- Location / City → `candidate.location`
- Work authorization / Visa → `candidate.visa_status`
- Salary expectation → `compensation.target_range` (adapt phrasing per field)
- Portfolio URL → `candidate.portfolio_url`
- GitHub → `candidate.github`

---

## Phase 2 — Gap Collection

After all extractions complete, aggregate every `needs_input` field across all jobs.

**Deduplication**: Group by semantic similarity. Common question types appear across many forms:
- "Expected salary" / "Compensation expectations" / "Desired salary" → one group
- "Work authorization status" → one group  
- "Years of experience in X" → one group per skill X
- "How did you hear about us?" → one group
- "Cover letter" / "Why do you want to work here?" → per-company (cannot deduplicate, answers differ)

Present to user in a single block:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Missing info — {N} questions I couldn't answer from your CV
  Your answers will be applied to all matching forms at once.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SHARED (applies to multiple jobs):

  [1] Expected base salary
      Asked by: Anthropic, Scale AI, Cohere, Databricks (4 jobs)
      → Your answer: ___

  [2] How did you hear about this role?
      Asked by: Scale AI, Hugging Face (2 jobs)
      → Your answer: ___

  [3] Do you require visa sponsorship?
      Asked by: all 5 jobs
      Suggested: "Yes — OPT/H-1B sponsorship required"
      → Accept suggestion or override: ___

  PER-JOB (company-specific):

  [4] Anthropic — "What draws you specifically to Anthropic's safety mission?"
      (cover letter style, ~200 words)
      → Your answer: ___

  [5] Databricks — "Describe a time you influenced a technical decision without authority"
      → Your answer: ___

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Type your answers above (or say "generate" and I'll draft them
  from your CV and the company reports, then you review).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Gap handling options

**If user says "generate"**: Draft answers from `cv.md` + report context, then show for review before accepting.

**For company-specific narrative questions**: Always generate a draft from the report (Block A TL;DR + Block B proof points + Block F STAR stories). User reviews before accepting.

**If a field is truly unanswerable** (e.g., "current employer's name" when freelancing): ask user directly.

**If user wants to skip a question**: mark as `skipped` — Claude will leave the field blank, user fills manually during review.

Once user provides all answers, confirm:
```
✅ Got all answers. Ready to fill {N} forms.
```

Update apply-queue.md status: `Form Extracted` → `Answers Ready`

---

## Phase 3 — Form Filling

Fill each form **sequentially** (one at a time, Playwright visible mode).

For each job with status `Answers Ready`:

```
Filling form: {Company} — {Role}  ({N} of {total})
```

### Per-platform filling strategy

**Ashby / Greenhouse / Lever / Workable:**
1. `browser_navigate` to application URL
2. `browser_snapshot` to confirm form is visible
3. For each field, `browser_type` or `browser_select` using the form_selector
4. For file uploads: `browser_upload` the PDF path from `output/`
5. `browser_snapshot` to confirm fields are filled
6. Stop at Submit/Apply button — DO NOT click

**Workday (multi-step wizard):**
1. Navigate to posting, click "Apply"
2. Step through wizard pages, filling each
3. At final step, show review page snapshot to user
4. Stop before "Submit" button — DO NOT click

**LinkedIn Easy Apply:**
1. Requires `claude --chrome` with authenticated LinkedIn session
2. Navigate to job posting URL
3. Click "Easy Apply" button
4. Fill each modal page (name, phone, resume, questions)
5. At final "Review your application" screen, STOP
6. Show user a snapshot for review
7. DO NOT click "Submit application"

**If Playwright is not available:**
- Generate a formatted "fill card" for each job — a clean document with all field labels and answers the user can paste manually
- Save to `output/{report_num}-fill-card.md`

### Upload handling

If the form has a resume upload field:
1. Look for `output/{report_num}-{company-slug}-*.pdf`
2. If found: `browser_upload(selector, pdf_path)`
3. If not found: run pdf mode first, then upload
4. Cover letter upload (if separate field): generate cover letter to `output/{report_num}-cover-{company-slug}.pdf`

---

## Phase 4 — Final Review

After filling each form, show the user a snapshot and a structured summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Application #{N} of {total} — READY FOR YOUR REVIEW
  {Company} — {Role}
  Score: {score}/5 | Report: #{report_num}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📄 Resume PDF: output/{report_num}-{slug}.pdf ✅
  🌐 Form URL: {url}

  Form fields filled:
  ─────────────────────────────────────────────────────────────
  Name                    Smit Patel
  Email                   smitpatel2360@gmail.com
  Phone                   +1-555-0123
  LinkedIn                linkedin.com/in/smitpatel
  Location                San Francisco, CA
  Work Authorization      Requires sponsorship (OPT/H-1B)
  Expected Salary         $130K–150K base
  Resume                  ✅ Uploaded

  Why this role?
  > "Anthropic's work on interpretability and Constitutional AI maps
    directly to the production eval pipelines I built at..."

  Relevant experience?
  > "Built a multi-agent RAG system serving 40K requests/day with
    p99 latency under 200ms. Reduced hallucination rate by 60%..."

  How did you hear about us?
  > "Found via career-ops portal scan, evaluated against my criteria,
    scored highest of the week."
  ─────────────────────────────────────────────────────────────

  ⚠️  REVIEW THE FORM IN YOUR BROWSER BEFORE SUBMITTING.
  The form is open and filled. Check it looks right, then click Submit.

  Commands:
  done       → confirm submitted, move to Applied status
  edit N     → I'll fix field N (provide correction)
  skip       → skip this application, leave as Answers Ready
  abort all  → stop batch, leave remaining as Answers Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### After user says "done"

1. Update `data/apply-queue.md` row status: `Answers Ready` → `Applied`
2. Update `data/applications.md`: change status from `Evaluated` to `Applied`
3. If Section H of the report doesn't have the final answers yet: append them to the report
4. Log: `Applied {YYYY-MM-DD HH:MM}` in notes column
5. Move to next job

### After all jobs processed

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Batch Apply Complete

  Applied:   {N} ✅
  Skipped:   {N} (still in queue)
  Failed:    {N} (form errors — check logs)

  Companies applied to today:
  ✅ Anthropic — AI Research Engineer
  ✅ Scale AI — ML Platform Engineer
  ✅ Cohere — Applied AI Engineer
  ⏩ Databricks — (skipped, will revisit)

  Next steps:
  → /career-ops followup    check follow-up cadence in 7 days
  → /career-ops contacto    LinkedIn outreach to hiring manager
  → /career-ops batch-apply restart to process remaining queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Run `node merge-tracker.mjs` after batch to sync tracker additions.

---

## LinkedIn Easy Apply — Special Notes

LinkedIn Easy Apply requires an authenticated session. This mode works best with `claude --chrome`.

**Before starting LinkedIn jobs:**
```
{N} jobs use LinkedIn Easy Apply.
This requires you to be logged into LinkedIn in your browser.
Open Chrome, log into LinkedIn, then say "ready".
```

**Reuse answers across LinkedIn forms:** LinkedIn often pre-fills from your profile. Only fill fields that are blank or wrong.

**LinkedIn-specific questions often asked:**
- "How many years of experience do you have with X?" → read from cv.md, answer numerically
- "Are you legally authorized to work in the US?" → from profile.yml `visa_status`
- "Will you now or in the future require sponsorship?" → from profile.yml
- "What is your desired salary?" → from `compensation.target_range`

**Anti-bot note:** LinkedIn detects automated interactions. Use human-paced typing (`browser_type` with deliberate delays between fields). If LinkedIn shows a CAPTCHA or verification, pause and notify user to solve it.

---

## Error handling

| Error | Recovery |
|-------|----------|
| Form has CAPTCHA | Notify user, pause, wait for "continue" |
| Upload fails | Skip upload, user uploads manually, continue |
| Required field missing | Add to needs_input, re-collect from user |
| Playwright crash | Save state to apply-queue.md, re-run to resume |
| LinkedIn session expired | Prompt user to re-login, then resume |
| Form changed layout | Take new snapshot, re-extract, continue |
| "Position no longer available" | Mark as `Discarded` in both files, skip |

---

## Resumability

`data/apply-queue.md` is the state file. Re-run `/career-ops batch-apply` at any time:
- `Queued` → will extract form
- `Form Extracted` → will re-use extracted fields (or re-extract if stale)
- `Answers Ready` → will go straight to Phase 3 (form filling)
- `Applied` → skipped

**Idempotent**: Running batch-apply twice on the same queue is safe. Already-applied jobs are skipped.
