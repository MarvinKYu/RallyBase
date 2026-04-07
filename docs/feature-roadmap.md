# Planned Features Roadmap


## v1.1.0 — Tournament Templates

> Plan mode: **Yes** — new schema (templates table + event templates), new service functions, and changes to tournament creation flow and UI. Schema design decisions affect the whole feature; upfront plan avoids mid-implementation pivots.

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v1.1.1 — Tournament flow reversal

### Tournament flow reversal
- Give TD option to move from "published" back to "draft" through a "Retract" button

---

## Dependency Notes

- v0.14.0 (RR → SE hybrid) built on v0.13.0 (RR Group Draws): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
