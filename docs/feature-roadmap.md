# Planned Features Roadmap

## v0.14.3 — RR→SE Placeholder SE Bracket

> Plan mode: **No** — UI-only change; no schema changes. Bracket page computes placeholder cards from group/advancer counts without creating Match records.

### Show placeholder SE bracket before group stage completes
- When a RR_TO_SE event has a bracket generated (group matches exist) but no SE matches yet, the bracket page shows computed placeholder cards: "Group 1 Winner vs BYE", "Group 2 Winner vs Group 3 Runner-Up", etc., based on `groupSize`, `advancersPerGroup`, and total group count.
- TBD vs TBD cards shown for all rounds beyond R1.
- Fixes the confusing "COMPLETED" event status that appears when group stage finishes before SE is generated — the bracket page will show an in-progress state instead.

---

## v0.15.0 — RallyBase Rating System

> Plan mode: **No** — primarily data/config (new org + rating categories seeded) and a permission policy change. No new algorithm modules; Elo is already isolated. The org admin allowlist addition is scoped to existing patterns.

### Add new org: RallyBase 
- Anyone can access 
- Default rating system for all competition formats
- Experiment with custom algorithm

### Gate USATT and NCTTA tournament creation to org admin and org-admin allowlist
- Give org admins ability to grant tournament creation in their org to specific users
- Platform admin can still create any tournament and grant tournament creation for any org to anyone

---

## v0.16.0 — Tournament Templates

> Plan mode: **Yes** — new schema (templates table + event templates), new service functions, and changes to tournament creation flow and UI. Schema design decisions affect the whole feature; upfront plan avoids mid-implementation pivots.

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v1.0.0 — Public Release

> Plan mode: **No** — polish and audit work; no new schema or cross-service changes. Each sub-item can be tackled incrementally.

Final polish and infrastructure pass before opening to the public.

### Mobile UI
- Comprehensive mobile review: fix zoom-on-search-tap, layout overflow issues, and other small issues catalogued in bug-list.md.

### Cron-based event auto-start
- Tournaments and events automatically advance to IN_PROGRESS at their set `startTime`.
- Requires Vercel Pro for sub-daily cron scheduling. Revisit when plan is upgraded.

### Final polish
- Audit all pages for consistency: status tags, empty states, error messages, loading states.
- Review and finalize all copy (labels, tooltips, placeholder text).

---

## Dependency Notes

- v0.14.0 (RR → SE hybrid) built on v0.13.0 (RR Group Draws): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
