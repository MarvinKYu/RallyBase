# Planned Features Roadmap

## v1.0.0 — Public Release

> Plan mode: **No** — polish and audit work; no new schema or cross-service changes. Each sub-item can be tackled incrementally.

Final polish and infrastructure pass before opening to the public.

### Mobile UI
- Comprehensive mobile review: fix zoom-on-search-tap, layout overflow issues, and other small issues catalogued in bug-list.md.

### Final polish
- Audit all pages for consistency: status tags, empty states, error messages, loading states.
- Review and finalize all copy (labels, tooltips, placeholder text).

## Security check for all user input fields

---

## v1.1.0 — Tournament Templates

> Plan mode: **Yes** — new schema (templates table + event templates), new service functions, and changes to tournament creation flow and UI. Schema design decisions affect the whole feature; upfront plan avoids mid-implementation pivots.

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v1.1.1

### Tournament flow reversal 
- Give TD option to move from "published" back to "draft" through a "Retract" button
- Also fix: TD should be able to "start event" for new events added to in-progress tournaments. right now attempting that displays an error message saying "The parent tournament must be published before advancing this event."

---

## v1.1.2

### Historical ratings preservation
- When looking at past tournament results, player ratings displayed should be the ratings at the time of the event start, and not display their current rating.

---

## Dependency Notes

- v0.14.0 (RR → SE hybrid) built on v0.13.0 (RR Group Draws): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
