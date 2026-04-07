# Planned Features Roadmap

## v0.20.0 — Reliability & Performance

- **Frontend error fallback**: add a catch-all error boundary so users never see raw stack traces from crashes
- **Database indexing**: add indexes on most commonly queried fields (player lookups, tournament/event queries, match queries by tournamentId)
- **Product analytics**: integrate Vercel Analytics for baseline click-through, time on site, and conversion tracking
- **Capacity planning**: document current Vercel/Neon tier limits, costs, and upgrade path before traffic grows

---

## v0.21.0 — Legal & Compliance

> Plan mode: **Yes** — GDPR/CCPA data deletion touches user, profile, ratings, and match data; needs schema and service design upfront.

- **Privacy policy**: create and publish (consider Termly or similar generator)
- **Terms of use**: draft and publish
- **GDPR/CCPA**: implement right-to-erasure flow (data deletion request); document what personal data is collected, stored, and how it's used

## v1.0.0 — Public Release

Final polish and infrastructure pass before opening to the public.

### Final polish
- Audit all pages for consistency: status tags, empty states, error messages, loading states.
- Review and finalize all copy (labels, tooltips, placeholder text).

---

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
