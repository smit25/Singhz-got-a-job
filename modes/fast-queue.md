# Mode: fast-queue — Pipeline → Apply Queue (no evaluation)

Move jobs from `data/pipeline.md` into `data/apply-queue.md` **without** evaluation, reports, PDFs, or tracker updates.

## Token budget (CRITICAL)

This mode is **file I/O only**. Minimize tokens:

| DO | DO NOT |
|----|--------|
| Read `data/pipeline.md`, `data/apply-queue.md` | Load `modes/_shared.md` |
| Parse checkbox lines, append table rows | Load `cv.md`, `config/profile.yml` |
| Edit those two files | Run `oferta`, `pdf`, `approve`, `pipeline` |
| Print a short summary table | WebSearch, WebFetch, Playwright |
| | Agent subagents |
| | Evaluate jobs or invent scores |

If the user did not pass `all`, only process lines the user marked ready (see Step 1).

---

## When to use

After **manually editing** `data/pipeline.md`:

1. Curate **Pendientes** (delete rows you do not want).
2. Mark jobs to queue: change `[ ]` → `[x]` on each line you want in the apply queue.
3. Run `/singhz-got-a-job fast-queue` (or `fast-queue all` for every unchecked line).

---

## Pipeline line format

```markdown
- [x] https://jobs.lever.co/company/abc | Company Name | Role Title
```

- **URL** — required (`http` or `https`)
- **Company** — optional; second `|` field
- **Role** — optional; third `|` field
- Skip lines that are blank, headers, or not job rows (no URL)

---

## Step 1 — Select lines to queue

Read `data/pipeline.md` → section `## Pendientes` (stop at next `##` heading).

| User input | Lines to queue |
|------------|----------------|
| `fast-queue` or `fast-queue selected` (default) | Only `- [x]` |
| `fast-queue all` | Every `- [ ]` and `- [x]` with a URL |

If default mode finds **zero** `[x]` lines, say:

```text
No jobs marked [x] in Pendientes.
→ Check [x] on rows you want, then run fast-queue again
→ Or run: /singhz-got-a-job fast-queue all
```

Do not proceed until the user picks one of those paths (unless they already said `all`).

---

## Step 2 — Dedup

Before appending, read `data/apply-queue.md` (existing table rows).

**Skip** a candidate if any of these match (case-insensitive):

- Same **URL** already in apply-queue
- Same **company + role** already in apply-queue

Collect skipped items for the summary (do not error).

---

## Step 3 — Append to apply-queue.md

For each new job, append one row:

```markdown
| — | {YYYY-MM-DD} | {company} | {role} | — | — | {url} | Queued |
```

- **#** and **Score** and **Report**: always `—` (no evaluation)
- **Date**: today `YYYY-MM-DD`
- **Status**: `Queued`
- If company or role missing on the pipeline line, use `Unknown` for that field

Ensure the table header exists in `data/apply-queue.md` (create from template if file is empty).

**RULE: NEVER duplicate** company+role or URL in apply-queue.

---

## Step 4 — Update pipeline.md

For each queued job:

1. **Remove** the line from `## Pendientes`
2. **Append** to `## Procesados`:

```markdown
- [x] fast-queued | {url} | {company} | {role} | no-eval
```

Keep other Pendientes / Procesados lines unchanged.

---

## Step 5 — Output

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  fast-queue — {N} added to apply queue (no eval)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Queued:
  ✓ {company} — {role}
  ...

  Skipped (duplicate): {M}
  ...

  Next: /singhz-got-a-job pdf {url}  (optional, per job)
        /singhz-got-a-job batch-apply  (fill forms; works better after pdf)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Do **not** write to `data/applications.md` or `reports/` in this mode.

---

## Optional args

| Arg | Behavior |
|-----|----------|
| `all` | Queue every pending line with a URL in Pendientes |
| `dry-run` | Print what would be queued; do not write files |

---

## Downstream notes (tell user only if they ask)

- **batch-apply** works without a report; reusable answers load from `data/form-answers.yml`. Run **pdf** per URL when you want a tailored resume.
- **approve** is for score-ranked jobs after **pipeline** / **oferta** — not needed if you used **fast-queue**.
