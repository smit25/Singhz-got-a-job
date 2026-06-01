# Mode: resume — Master resume PDF (stored default)

Build and store your **default resume PDF** from `cv.md`. Used automatically when applying if you have not run `/singhz-got-a-job pdf` for that specific job.

## Output path (canonical)

Read `config/profile.yml`:

- If `cv.master_pdf` is set → write PDF there (path relative to project root OK).
- Else → `output/cv-{kebab-name}-master.pdf` where `{kebab-name}` comes from `candidate.full_name` (e.g. `saumya-singh` → `output/cv-saumya-singh-master.pdf`).

**RULE:** This file is the user's stored resume. Do not overwrite with JD-tailored content. Tailored CVs go to `output/cv-{candidate}-{company}-{date}.pdf` via `pdf` mode only.

## Pipeline

1. Read `cv.md`, `config/profile.yml`, `modes/_profile.md` (optional narrative).
2. Read `templates/cv-template.html`.
3. Build HTML from **cv.md as-is** (no JD, no keyword injection for a specific company):
   - Use profile for header/contact.
   - Professional Summary from `narrative.headline` + `narrative.exit_story` (or CV summary section).
   - All experience/projects from cv.md — do not drop roles.
   - Competency/skills section from CV skills (generic ML/DS focus, not one company).
4. Paper: `letter` if `location.country` is United States or Canada, else `a4`.
5. Write HTML to `/tmp/cv-{candidate}-master.html`.
6. Run:
   ```bash
   node generate-pdf.mjs /tmp/cv-{candidate}-master.html output/cv-{candidate}-master.pdf --format=letter
   ```
   (Use the resolved master path from profile.)
7. Confirm file exists. Print:
   ```text
   Master resume saved: output/cv-{candidate}-master.pdf
   This PDF will be uploaded on applications when no job-specific PDF exists.
   ```

## User can also supply a PDF manually

If the user already has a PDF resume, they may copy it to the master path above. Skip HTML generation if they say "use my existing PDF at …" and copy/confirm that path is set in `cv.master_pdf`.

## Verify

```bash
node resolve-resume-pdf.mjs
```

Should return `"source": "master"` and the path.
