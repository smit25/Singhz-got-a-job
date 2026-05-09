# Mode: approve — Approval Queue

Review evaluated jobs and approve which ones to apply to. This is the human-in-the-loop gate between evaluation and application.

## When to use

Run after `/career-ops pipeline` or `/career-ops scan` has evaluated new offers. You'll see a ranked table, pick which ones to pursue, and they get added to the apply queue for `/career-ops batch-apply`.

## Workflow

```text
1. SCAN      → Find evaluated reports not yet in apply-queue or applications
2. RANK      → Sort by score, annotate with key signals
3. PRESENT   → Show ranked approval table to user
4. COLLECT   → Parse user's approval input (numbers, range, threshold)
5. QUEUE     → Write approved jobs to data/apply-queue.md
6. PDF       → Generate tailored PDFs for approved jobs that don't have one
```

---

## Step 1 — Collect candidates

Find jobs that are evaluated but not yet approved or acted on:

1. **List all reports** in `reports/` → extract num, company, role, score, date from filename + header
2. **Exclude** any entry already in `data/apply-queue.md` (any status)
3. **Exclude** any entry in `data/applications.md` with status `Applied`, `Interview`, `Offer`, `Rejected`, `Discarded`, `SKIP`
4. **Include** entries with status `Evaluated` in applications.md that are NOT in apply-queue.md
5. **Filter by recency** (default: last 30 days — configurable: user can say "show all" or "last 7 days")

For each candidate, read the report header to extract:
- Score
- Archetype
- Remote/hybrid/onsite
- Legitimacy tier (Block G)
- Location
- Comp range (if mentioned in report)
- 1-line TL;DR from Block A

---

## Step 2 — Rank and annotate

Sort candidates:

**Primary sort**: Score descending  
**Secondary sort**: Legitimacy tier (Verified > Likely Real > Uncertain > Red Flags)  
**Tertiary sort**: Date evaluated descending

Add signal flags per row:
- `🟢` score ≥ 4.5
- `🟡` score 4.0–4.4
- `🟠` score 3.5–3.9
- `🔴` score < 3.5 (apply only with explicit override)
- `⚠️` Legitimacy: Uncertain or Red Flags
- `📄` PDF already generated
- `🌐` Remote
- `🏢` On-site / Hybrid

---

## Step 3 — Present approval table

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Approval Queue — {N} jobs ready for review
  Sorted by score. Recommendation: approve jobs ≥ 4.0 (🟢🟡)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  #  │ Score │ Company           │ Role                      │ Arch   │ Mode   │ Flags
  ───┼───────┼───────────────────┼───────────────────────────┼────────┼────────┼──────────────
  1  │ 🟢4.8 │ Anthropic         │ AI Research Engineer      │ LLMOps │ 🌐 Remote  │ 📄
  2  │ 🟢4.6 │ Scale AI          │ ML Platform Engineer      │ LLMOps │ 🌐 Remote  │
  3  │ 🟡4.3 │ Cohere            │ Applied AI Engineer       │ Agentic│ 🌐 Remote  │ 📄
  4  │ 🟡4.1 │ Databricks        │ Solutions Architect, AI   │ SA     │ 🏢 Hybrid  │
  5  │ 🟡4.0 │ Hugging Face      │ AI Engineer               │ LLMOps │ 🌐 Remote  │
  6  │ 🟠3.8 │ Pendo             │ Data Scientist            │ DS     │ 🌐 Remote  │ ⚠️
  7  │ 🟠3.6 │ Weights & Biases  │ ML Engineer               │ LLMOps │ 🌐 Remote  │
  8  │ 🔴2.9 │ Acme Corp         │ AI Analyst                │ DS     │ 🏢 Onsite  │

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Commands:
  approve 1 2 3          → approve specific jobs by number
  approve 1-5            → approve a range
  approve all            → approve all shown (including 🔴)
  approve above 4.0      → approve all jobs scoring ≥ 4.0
  skip 6 8               → mark as SKIP (won't appear again)
  details 4              → show full report summary for job #4
  refresh                → re-scan for new evaluated reports
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If there are no candidates:
```
No evaluated jobs pending approval.
→ Run /career-ops scan to discover new offers
→ Run /career-ops pipeline to evaluate pending URLs
```

---

## Step 4 — Parse approval input

| Input | Action |
|-------|--------|
| `approve 1 3 5` | Approve jobs at positions 1, 3, 5 |
| `approve 1-5` | Approve jobs 1 through 5 |
| `approve all` | Approve all shown jobs |
| `approve above 4.0` | Approve all with score ≥ 4.0 |
| `approve above 4.5` | Approve all with score ≥ 4.5 |
| `skip 6 8` | Mark as SKIP in applications.md, never show again |
| `details 4` | Show Block A + B summary from report for job #4 |
| `q` or `quit` | Exit without changes |

After parsing, confirm what will be queued:
```
Approving 5 jobs:
  ✓ Anthropic — AI Research Engineer (4.8/5)
  ✓ Scale AI — ML Platform Engineer (4.6/5)
  ✓ Cohere — Applied AI Engineer (4.3/5)
  ✓ Databricks — Solutions Architect, AI (4.1/5)
  ✓ Hugging Face — AI Engineer (4.0/5)

Skipping 1:
  ✗ Acme Corp — AI Analyst (2.9/5)

Proceed? (y/n)
```

---

## Step 5 — Write to apply-queue.md

For each approved job, append a row to `data/apply-queue.md`:

```
| {num} | {YYYY-MM-DD} | {company} | {role} | {score}/5 | [{report_num}](reports/{report_file}) | {url} | Queued |
```

**Status values for apply-queue.md:**
- `Queued` — approved, waiting for batch-apply
- `Form Extracted` — batch-apply has read the form
- `Answers Ready` — all questions answered, ready to fill
- `Applied` — application submitted by user

**RULE: NEVER duplicate.** Before appending, check if company+role already exists in apply-queue.md.

For skipped jobs: update `data/applications.md` status to `SKIP`.

---

## Step 6 — PDF generation for approved jobs

For each approved job that doesn't already have a PDF (`📄` flag not shown):
1. Check if `output/{report_num}-*.pdf` or `output/{report_num}-*.tex` exists
2. If not: offer to generate now or defer to batch-apply step

```
3 approved jobs don't have PDFs yet. Generate now? (y/n/defer)
→ "y" runs pdf mode for each
→ "defer" batch-apply will generate them as part of its workflow
```

---

## Output confirmation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ 5 jobs added to apply queue
  📄 2 PDFs generated
  🚫 1 job marked SKIP

  Next step: /career-ops batch-apply
  This will fill all 5 forms, collect missing questions, and
  walk you through final review before you submit each one.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
