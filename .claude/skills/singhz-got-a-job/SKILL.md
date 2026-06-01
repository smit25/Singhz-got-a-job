---
name: singhz-got-a-job
description: Singhz Got a Job — AI job search command center; evaluate offers, generate CVs, scan portals, track applications
user_invocable: true
args: mode
argument-hint: "[scan | deep | pdf | resume | oferta | ofertas | apply | batch | approve | fast-queue | batch-apply | tracker | pipeline | contacto | training | project | interview-prep | update]"
---

# Singhz Got a Job — Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| JD text or URL (no sub-command) | **`auto-pipeline`** |
| `oferta` | `oferta` |
| `ofertas` | `ofertas` |
| `contacto` | `contacto` |
| `deep` | `deep` |
| `pdf` | `pdf` |
| `resume` | `resume` |
| `training` | `training` |
| `project` | `project` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `apply` | `apply` |
| `scan` | `scan` |
| `batch` | `batch` |
| `patterns` | `patterns` |
| `followup` | `followup` |
| `approve` | `approve` |
| `fast-queue` or `fast_queue` (alias) | `fast-queue` |
| `batch-apply` | `batch-apply` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains JD text (keywords: "responsibilities", "requirements", "qualifications", "about the role", "we're looking for", company name + role) or a URL to a JD, execute `auto-pipeline`.

If `{{mode}}` is not a sub-command AND doesn't look like a JD, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
Singhz Got a Job — Command Center

Available commands:
  /singhz-got-a-job {JD}      → AUTO-PIPELINE: evaluate + report + PDF + tracker (paste text or URL)
  /singhz-got-a-job pipeline  → Process pending URLs from inbox (data/pipeline.md)
  /singhz-got-a-job oferta    → Evaluation only A-F (no auto PDF)
  /singhz-got-a-job ofertas   → Compare and rank multiple offers
  /singhz-got-a-job contacto  → LinkedIn power move: find contacts + draft message
  /singhz-got-a-job deep      → Deep research prompt about company
  /singhz-got-a-job pdf       → PDF only, ATS-optimized CV (per job)
  /singhz-got-a-job resume    → Build/store master resume PDF (default upload)
  /singhz-got-a-job training  → Evaluate course/cert against North Star
  /singhz-got-a-job project   → Evaluate portfolio project idea
  /singhz-got-a-job tracker   → Application status overview
  /singhz-got-a-job apply     → Live application assistant (reads form + generates answers)
  /singhz-got-a-job scan        → Scan portals and discover new offers
  /singhz-got-a-job batch       → Batch processing with parallel workers
  /singhz-got-a-job approve     → Review evaluated jobs and pick which ones to apply to
  /singhz-got-a-job fast-queue  → Move [x] rows from pipeline.md to apply-queue (no eval, file-only)
  /singhz-got-a-job batch-apply → Fill all approved forms, ask for missing info once, you submit
  /singhz-got-a-job patterns    → Analyze rejection patterns and improve targeting
  /singhz-got-a-job followup    → Follow-up cadence tracker: flag overdue, generate drafts

Full pipeline: scan → pipeline → approve → batch-apply
Fast apply: scan → edit pipeline.md ([x] rows) → fast-queue → resume (once) → batch-apply
Inbox: add URLs to data/pipeline.md → /singhz-got-a-job pipeline
Or paste a JD directly to run the full pipeline.
```

---

## Context Loading by Mode

After determining the mode, load the necessary files before executing:

### Modes that require `_shared.md` + their mode file:
Read `modes/_shared.md` + `modes/{mode}.md`

Applies to: `auto-pipeline`, `oferta`, `ofertas`, `pdf`, `resume`, `contacto`, `apply`, `pipeline`, `scan`, `batch`, `approve`, `batch-apply`

### Standalone modes (only their mode file):
Read `modes/{mode}.md`

Applies to: `tracker`, `deep`, `training`, `project`, `patterns`, `followup`, `fast-queue` (not `resume` — uses `modes/resume.md` + `modes/pdf.md` template only)

**fast-queue:** Do NOT load `_shared.md`. File parsing and writes only — no evaluation, fetch, or subagents.

### Modes delegated to subagent:
For `scan`, `apply` (with Playwright), and `pipeline` (3+ URLs): launch as Agent with `_shared.md` + `modes/{mode}.md`.

For **`batch-apply`**:
1. Parent reads `modes/batch-apply.md` + `data/apply-queue.md` + `data/form-answers.yml`.
2. Parent builds the **manifest** (Queued rows only — see Scope lock in batch-apply.md). Print N before any browser work.
3. Phase 1 subagents get **one manifest job each** — prompt must include that single URL and say DO NOT read pipeline.md or scan-history.tsv. Do **not** pass `_shared.md` to extraction subagents.
4. Never process more jobs than Queued rows in apply-queue.md.

```
Agent(
  subagent_type="general-purpose",
  prompt="[batch-apply extraction prompt for ONE manifest job — see modes/batch-apply.md]",
  description="singhz-got-a-job batch-apply extract"
)
```

For other subagent modes:
```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of modes/{mode}.md]\n\n[invocation-specific data]",
  description="singhz-got-a-job {mode}"
)
```

Execute the instructions from the loaded mode file.
