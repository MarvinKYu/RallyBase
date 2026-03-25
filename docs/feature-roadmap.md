# Planned Features Roadmap

## v0.13.0 — RR Group Draws

> Plan mode: **Yes** — new schema (groups table or group-assignment relation), new algorithm module, and changes to event creation flow, bracket service, and standings. Full blueprint review before any file is written reduces risk of interdependency gaps.

### Specify group size for RR events
- TDs can set a group size when configuring a round-robin event.

### Auto-seeded group assignments
- If registrants exceed the group size, players are distributed into groups based on rating.
- Applies to pure RR events; also groundwork for the RR → SE hybrid (v0.14.0).

---

## v0.14.0 — RR → SE Hybrid Event Type

> Plan mode: **Yes** — new event format touches schema (new EventFormat enum value + advancement mapping), two algorithm modules (RR + SE must interoperate), bracket service, and UI across event creation, match management, and bracket display. High interconnection warrants a full upfront plan.

### New event format: Round Robin into Single Elimination
- TD selects number of advancers per group; advancers are seeded into the SE bracket by group result then rating.
- Bracket UI populates progressively as RR groups finish.
- Once all RR group matches are complete, the SE stage starts automatically.

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

- v0.13.0 (RR Group Draws) is a prerequisite for v0.14.0 (RR → SE hybrid): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
