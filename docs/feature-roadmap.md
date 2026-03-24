# Planned Features Roadmap

## v0.12.0 — Player Search Overhaul

### Paginated results
- Default view: all players shown 10 at a time, navigable with previous/next arrows.
- Default sort: rating descending, then name A→Z as tiebreaker.

### Sorting controls
- Sort options: Rating ↓, Rating ↑, Name A→Z, Name Z→A.
- When a filter or sort is active, results update immediately (client-side where possible, server query where not).

---

## v0.13.0 — Tournament Templates

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v0.14.0 — RR Group Draws

### Specify group size for RR events
- TDs can set a group size when configuring a round-robin event.

### Auto-seeded group assignments
- If registrants exceed the group size, players are distributed into groups based on rating.
- Applies to pure RR events; also groundwork for the RR → SE hybrid (v0.14.0).

---

## v0.15.0 — RR → SE Hybrid Event Type

### New event format: Round Robin into Single Elimination
- TD selects number of advancers per group; advancers are seeded into the SE bracket by group result then rating.
- Bracket UI populates progressively as RR groups finish.
- Once all RR group matches are complete, the SE stage starts automatically.

---

## v1.0.0 — Public Release

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

- v0.14.0 (RR Group Draws) is a prerequisite for v0.15.0 (RR → SE hybrid): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
