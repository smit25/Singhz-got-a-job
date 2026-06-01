# Singhz Got a Job

> AI-powered job search pipeline: scrape → rank → tailor → apply.

Built on Claude Code + Playwright. Searches every major job portal, scores every listing against your resume, tailors your CV per role, and fills out every application form — you just click Submit.

---

## What It Does

| Step | What happens |
|------|-------------|
| **1. Scrape** | Scans every major job board and ATS platform for roles matching your keywords |
| **2. Rank** | Scores each listing 1–5 against your actual CV and preferences |
| **3. Tailor** | Generates an ATS-optimized CV and cover letter specific to that job |
| **4. Apply** | Fills every form field automatically — you review and click Submit |

---

## Getting Started

### Prerequisites

Before you begin, install:

- **[Claude Code](https://claude.ai/code)** — the AI CLI this runs on
- **Node.js 18+** — runtime for all scripts ([download](https://nodejs.org))
- **Git** — to clone the repo

---

### Step 1 — Clone and install

```bash
git clone https://github.com/smit25/Singhz-got-a-job.git
cd Singhz-got-a-job
npm install
npx playwright install chromium
```

`npm install` installs all dependencies. `playwright install chromium` downloads the browser used for form-filling and PDF generation.

---

### Step 1b — Enable browser automation in Claude Code

`batch-apply` and `apply` use Playwright to open forms, fill fields, and attach your CV. Without this step, those commands fall back to generating fill cards you paste manually.

Run this once (globally, outside the repo):

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Then restart Claude Code. To verify it worked, start a session and run:

```
/singhz-got-a-job apply
```

If the browser opens automatically when you navigate to a job URL, Playwright is working.

**What this enables:**
- `batch-apply` fills every form field in your browser automatically
- `apply` opens the live form and types answers in real time
- `pdf` generates CV PDFs via headless Chromium
- Liveness verification (`check-liveness.mjs`) reads the live page instead of relying on cached data

**Troubleshooting:**
- If `claude mcp add` is not recognized, update Claude Code: `npm install -g @anthropic-ai/claude-code`
- To confirm the MCP server registered: `claude mcp list` — you should see `playwright` in the output
- If you get a permissions error on macOS: run with `sudo` or fix npm global permissions

---

### Step 2 — Open Claude Code in this folder

```bash
cd Singhz-got-a-job
claude
```

Or open the folder in VS Code / Cursor and launch Claude Code from there.

---

### Step 3 — Run the onboarding

Type this in Claude Code:

```
/singhz-got-a-job
```

The system will guide you through setup. You'll need to provide:

| What | Where it's stored | Why |
|------|------------------|-----|
| Your CV | `cv.md` | Source of truth for all evaluations and PDF generation |
| Your name, email, phone | `config/profile.yml` | Auto-filled into every application form |
| Target roles and keywords | `portals.yml` → `title_filter.positive` | Filters which jobs are shown to you |
| Salary range and preferences | `config/profile.yml` | Used in offer scoring and negotiation scripts |

You can paste your CV as text, share a LinkedIn URL, or describe your experience — the system will format it.

---

### Step 4 — Customize your role keywords

Open `portals.yml` and edit the `title_filter.positive` section:

```yaml
title_filter:
  positive:
    - "Machine Learning Engineer"
    - "Data Scientist"
    - "AI Engineer"
    # add your target role keywords here
  negative:
    - "Product Manager"
    - "Junior"
    # add roles you want to exclude
```

These keywords filter every result from every portal. Your `portals.yml` is also scoped to **US-based** roles. Only jobs whose titles match at least one positive keyword (and zero negative keywords) will be shown to you.

Also set up **`data/form-answers.yml`** (copy from `templates/form-answers.example.yml`) so salary, visa, and “how did you hear” questions are answered once and reused on every apply.

---

### Step 5 — Run your first scan

```
/singhz-got-a-job scan
```

This searches all enabled portals in `portals.yml` for new listings matching your keywords. Results land in `data/pipeline.md` (**Pendientes**).

Zero-token API scan (optional): `npm run scan`

---

### Step 6 — Choose your path to the apply queue

**Path A — Evaluate first (recommended when unsure):**

```
/singhz-got-a-job pipeline
```

Evaluates every pending URL in **Pendientes**. Each job gets a report (blocks A–G) with a 1–5 score in `reports/`. Then:

```
/singhz-got-a-job approve
```

Pick which evaluated jobs go to `data/apply-queue.md`.

Single job: `/singhz-got-a-job oferta https://jobs.example.com/apply/12345`

**Path B — Skip evaluation (you already know you want to apply):**

1. In `data/pipeline.md`, mark rows `[x]` you want (or delete the rest).
2. Run:

```
/singhz-got-a-job fast-queue
```

Moves only those jobs into `data/apply-queue.md` with status `Queued` (no report, no score).

---

### Step 7 — Generate tailored CVs (optional)

```
/singhz-got-a-job pdf
```

Generates an ATS-optimized PDF for each approved job, tailored to that specific JD. Saved to `output/`.

---

### Step 8 — Apply

**Single job:**

```
/singhz-got-a-job apply
```

Opens the form, reads all questions, generates answers from your CV (+ report if you have one). Uses `data/form-answers.yml` for questions you answered before.

**Multiple jobs at once:**

```
/singhz-got-a-job batch-apply
```

**Important:** Only processes rows in `data/apply-queue.md` with status **`Queued`** — not everything in `pipeline.md` Procesados.

4-phase process:
1. Prints a manifest (N jobs from apply-queue only), then extracts form fields (up to 3 URLs in parallel)
2. Fills known answers from `config/profile.yml` + `data/form-answers.yml`; asks you once for anything new (saved to form-answers for next time)
3. Fills each form in the browser — PDF attached when available
4. Stops before Submit — you review and click Submit for each one

---

### Step 9 — Track and follow up

```
/singhz-got-a-job tracker       # see all application statuses
/singhz-got-a-job followup      # follow-up cadence and draft messages
/singhz-got-a-job patterns      # what's working, what isn't
```

---

## Job Portals Covered

The scanner works across every major job platform — no company list needed. Add your role keywords to `portals.yml` and it searches everywhere.

### ATS Platforms (searched across all companies on each platform)

| Platform | Who uses it | Search method |
|----------|------------|---------------|
| **Greenhouse** | Thousands of tech companies | API (zero-token, instant) + WebSearch |
| **Ashby** | Startups and scale-ups | WebSearch |
| **Lever** | Mid-size tech and startups | WebSearch |
| **Workable** | European companies, SMBs | WebSearch |
| **Workday** | Enterprises and Fortune 500 | WebSearch + Playwright |
| **SmartRecruiters** | Mid-market and enterprise | WebSearch |
| **Rippling** | Tech companies | WebSearch |
| **BambooHR** | SMBs | WebSearch |

### General Job Boards

| Portal | Focus |
|--------|-------|
| **LinkedIn** | Largest global job board — best with authenticated session (`claude --chrome`) |
| **Indeed** | Highest traffic globally |
| **Glassdoor** | Jobs with salary data and company reviews |
| **Wellfound** (AngelList) | Startups — seed through Series C |
| **Y Combinator / Work at a Startup** | YC-backed companies only, very high signal |
| **Hacker News — Who's Hiring** | Monthly thread, high-signal for eng/AI roles |
| **Built In** | US tech hubs (SF, NYC, Austin, Chicago) |
| **Dice** | Tech-specialist board |
| **Simplify.jobs** | Aggregator with one-click Easy Apply |
| **Levels.fyi** | Compensation-transparent tech jobs |

### Remote-Focused Boards

| Portal | Focus |
|--------|-------|
| **Remotive** | Curated remote tech jobs |
| **WeWorkRemotely** | Largest remote-only board |
| **RemoteOK** | Real-time remote listings |
| **Himalayas** | Remote jobs with salary transparency |
| **Working Nomads** | Remote work for digital workers |
| **EU Remote Jobs** | Remote roles targeting Europe |

### Specialized / Niche Boards

| Portal | Focus |
|--------|-------|
| **ai-jobs.net** | AI/ML roles only |
| **fwddeploy.com** | Solutions Engineering and Forward Deployed roles |
| **TrueUp** | Tech jobs with real-time salary data |
| **Remote Rocketship** | Remote tech aggregator |
| **Welcome to the Jungle** | Startup and scale-up roles (Europe-heavy) |
| **EU Data Jobs** | Data and ML roles focused on Europe |
| **DevRelX / DevRel Job Board** | Developer Relations roles (disabled by default) |

**To add a portal not listed:** add a new entry to `search_queries` in `portals.yml`:

```yaml
- name: My Portal — Engineering roles
  query: 'site:myportal.com "Software Engineer" OR "AI Engineer" remote'
  enabled: true
```

---

## Application Form Support

The auto-fill engine supports every major application platform:

| Platform | Detection | Fill method |
|----------|-----------|-------------|
| Ashby | `jobs.ashbyhq.com` | Direct Playwright |
| Greenhouse | `boards.greenhouse.io` | Direct Playwright |
| Lever | `jobs.lever.co` | Direct Playwright |
| Workday | `myworkdayjobs.com` | Playwright — multi-step wizard |
| LinkedIn Easy Apply | `linkedin.com/jobs/` + Easy Apply | Authenticated session |
| Workable | `apply.workable.com` | Direct Playwright |
| SmartRecruiters | `jobs.smartrecruiters.com` | Playwright |
| Custom / any other URL | Any | Playwright best-effort |

**What gets auto-filled:** name, email, phone, LinkedIn URL, location, work authorization, visa status — all from `config/profile.yml`. Reusable form Q&A (salary, sponsorship, “how did you hear,” etc.) is stored in `data/form-answers.yml` — answer once, similar questions are skipped on future applies. Essay questions are generated from your CV and the job evaluation report. Resume PDF is attached automatically.

**What you always do yourself:** click Submit.

---

## How Scoring Works

Every job gets a structured evaluation report with a score from 1–5:

| Block | What it checks |
|-------|---------------|
| **A — Summary** | Role type, seniority, remote policy, one-line TL;DR |
| **B — CV Match** | Every JD requirement mapped to your CV proof points; gaps identified |
| **C — Level Strategy** | Your level vs the role's level; negotiation framing |
| **D — Comp Research** | Salary ranges from Glassdoor and Levels.fyi; company comp reputation |
| **E — Personalization** | Top 5 specific edits to make to your CV for this role |
| **F — Interview Prep** | 6–10 STAR+R stories mapped to JD requirements; story bank updated |
| **G — Legitimacy** | Ghost job signals; posting freshness; recruiter credibility |

| Score | Recommendation |
|-------|---------------|
| 4.5 – 5.0 | Strong match — apply |
| 4.0 – 4.4 | Good match — apply |
| 3.5 – 3.9 | Borderline — apply only if you have a specific reason |
| < 3.5 | System recommends against — proceed only on override |

---

## Full Command Reference

| Command | What it does |
|---------|-------------|
| `/singhz-got-a-job scan` | Scan all portals for new listings matching your keywords |
| `/singhz-got-a-job pipeline` | Evaluate all pending URLs from `data/pipeline.md` |
| `/singhz-got-a-job oferta` | Evaluate a single job (paste URL or JD text) |
| `/singhz-got-a-job ofertas` | Compare and rank two or more jobs side by side |
| `/singhz-got-a-job approve` | Review evaluated jobs and pick which to apply to |
| `/singhz-got-a-job fast-queue` | Move `[x]` rows from `pipeline.md` to apply-queue (no evaluation) |
| `/singhz-got-a-job pdf` | Generate a tailored ATS-optimized CV PDF for a specific role |
| `/singhz-got-a-job apply` | Live form assistant for a single application |
| `/singhz-got-a-job batch-apply` | Fill all approved application forms in one session |
| `/singhz-got-a-job batch` | Evaluate 10+ jobs in parallel with sub-agents |
| `/singhz-got-a-job tracker` | View all application statuses in one table |
| `/singhz-got-a-job patterns` | Analyze what's working, what's getting rejected |
| `/singhz-got-a-job followup` | Follow-up timing tracker and draft message generator |
| `/singhz-got-a-job deep` | Deep research on a specific company |
| `/singhz-got-a-job contacto` | Find a LinkedIn contact at a company and draft an outreach message |
| `/singhz-got-a-job interview-prep` | Generate STAR stories and interview intel for a company |
| `/singhz-got-a-job training` | Evaluate a course or certification against your career goals |
| `/singhz-got-a-job project` | Evaluate a portfolio project idea |

---

## File Structure

```
Singhz-got-a-job/
├── cv.md                     ← your CV (canonical source of truth — edit freely)
├── article-digest.md         ← proof points, portfolio highlights (optional but recommended)
├── portals.yml               ← portal config: keywords, search queries, on/off toggles
│
├── config/
│   └── profile.yml           ← your personal details, salary target, preferences
│
├── modes/
│   ├── _profile.md           ← your personalization layer (never overwritten by updates)
│   ├── _shared.md            ← system scoring logic (auto-updated)
│   ├── apply.md              ← single-form assistant
│   ├── batch-apply.md        ← batch form filler (apply-queue Queued rows only)
│   ├── fast-queue.md         ← pipeline → apply-queue without evaluation
│   ├── oferta.md             ← job evaluation (A–G blocks)
│   └── ...                   ← all other modes
│
├── data/
│   ├── applications.md       ← master application tracker
│   ├── pipeline.md           ← inbox: pending URLs waiting for evaluation
│   ├── apply-queue.md        ← approved jobs queued for application
│   ├── form-answers.yml      ← reusable form Q&A (answer once, reuse on future applies)
│   └── scan-history.tsv      ← dedup log (already-seen listings are skipped)
│
├── reports/                  ← evaluation reports: 001-company-name-2026-01-01.md
├── output/                   ← generated PDFs (gitignored)
│
├── templates/
│   ├── cv-template.html      ← CV visual design
│   └── cv-template.tex       ← LaTeX / Overleaf version
│
└── scripts:
    scan.mjs                  ← portal scanner (zero LLM cost for API-based portals)
    generate-pdf.mjs          ← HTML → PDF via Playwright
    check-liveness.mjs        ← verify a job posting is still active
    merge-tracker.mjs         ← merge new entries into applications.md
    verify-pipeline.mjs       ← health check: reports, tracker, statuses
    analyze-patterns.mjs      ← rejection pattern analysis
    followup-cadence.mjs      ← follow-up timing calculator
```

---

## Your Files vs System Files

Two layers — one you own, one the system owns:

**Your files** (never auto-updated, put your personal data here):
- `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`
- Everything in `data/`, `reports/`, `output/`, `interview-prep/`

**System files** (auto-updated when new versions ship, don't put personal data here):
- `modes/_shared.md`, `modes/oferta.md`, all other modes
- `CLAUDE.md`, `*.mjs` scripts, `templates/`

If you customize archetypes, scoring weights, or negotiation scripts — put those in `modes/_profile.md`. They'll survive every update.

---

## Design Principles

**Portal-first, not company-first.** The scanner searches across entire platforms — Greenhouse, Ashby, Lever, LinkedIn, Indeed — rather than chasing specific companies. Update your keywords once in `portals.yml` and the search covers everything.

**Quality over quantity.** Every job is scored before you see it. Below 4.0/5 the system flags it and recommends against applying. Five well-targeted applications outperform fifty generic ones.

**Human in the loop.** Claude evaluates, tailors, and fills. You decide and submit. No application goes out without your explicit review. The system never clicks Submit.

**Zero-token scanning.** Greenhouse, Ashby, and Lever expose public JSON APIs. The scanner hits these directly — no LLM calls, no cost, near-instant results.

**Gets smarter over time.** Each evaluation adds to your STAR story bank. Each rejection improves the pattern analyzer. Feed it more context about yourself and the recommendations sharpen.

---

## Language Support

Evaluation modes are available in: English · Spanish · German (DACH) · French · Japanese · Portuguese (BR)

Each pack includes market-specific vocabulary — e.g., German includes Probezeit, Kündigungsfrist, Tarifvertrag; French includes CDI/CDD, RTT, mutuelle, convention SYNTEC.

Switch language: set `language.modes_dir: modes/de` (or `modes/fr`, `modes/ja`) in `config/profile.yml`.

---

## Ethical Use

This system is not a mass-apply tool. It is built to help you find roles where there is a genuine match, apply exceptionally well, and not waste your time or a recruiter's time on poor fits.

- Never submits an application without your explicit review and action
- Actively discourages applying to jobs below 4.0/5
- Designed around 5 excellent applications, not 500 mediocre ones

---

## Cursor / Claude permissions (fewer approval prompts)

`batch-apply` and `scan` use Playwright (browser) and file edits. To reduce “Allow this?” prompts:

**Cursor (IDE)**  
- **Settings → Cursor Settings → Agents** — enable auto-run for trusted commands where available (e.g. allowlisted terminal, file writes).  
- **Settings → Features → Composer / Agent** — review “Yolo mode” or auto-apply options for your comfort level (still review before Submit on real applications).  
- Add a **project rule** in `.cursor/rules/` stating that `singhz-got-a-job` modes may read/write `data/`, `config/`, and use the browser for apply flows.

**Claude Code (CLI)**  
- Run with permission flags when you trust the session, e.g. `claude --dangerously-skip-permissions` (only in this repo, when you understand the risk).  
- Or approve “always allow” for this workspace when Cursor/Claude offers it for terminal and MCP browser tools.

The system will **never** click Submit on an application — that stays manual even with full permissions.

---

## Credits

Original system by [santifer](https://santifer.io). MIT License. Community on [Discord](https://discord.gg/8pRpHETxa4).
