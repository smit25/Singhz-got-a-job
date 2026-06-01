# Mode: tracker — Applications Tracker

Read and display `data/applications.md`.

**Tracker format:**
```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```

Canonical statuses: `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = candidate submitted their application
- `Responded` = a recruiter/company reached out and candidate replied (inbound)
- `Interview` = candidate is in the interview process

If the user asks to update a status, edit the corresponding row.

Also display statistics:
- Total applications
- By status
- Average score
- % with PDF generated
- % with report generated
