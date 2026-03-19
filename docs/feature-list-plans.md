# Planned Features Roadmap

## ~~v0.7.0 — Player History~~ ✅ Shipped 2026-03-18
## ~~v0.7.1 — Test isolation fix~~ ✅ Shipped 2026-03-18
## ~~v0.7.2 — Profile UI Restructure~~ ✅ Shipped 2026-03-18
## ~~v0.7.3 — My Tournaments~~ ✅ Shipped 2026-03-18
## ~~v0.7.4 — Your Matches on Tournament Detail~~ ✅ Shipped 2026-03-18
## ~~v0.7.5 — Tournament Directors page + nav + profile wider~~ ✅ Shipped 2026-03-18
## ~~v0.7.6 — Player/TD navigation decoupling~~ ✅ Shipped 2026-03-18
## ~~v0.7.7 — Tournaments page overhaul + search bar~~ ✅ Shipped 2026-03-18

---

## v0.8.0 — Tournament Templates

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.
- When creating a new tournament, TD can optionally load from a saved template to pre-fill all fields.

---

## v0.9.0 — RR Group Draws

### Specify group size for RR events
- TDs can set a group size when configuring a round-robin event.

### Auto-seeded group assignments
- If registrants exceed the group size, players are distributed into groups based on rating.
- Applies to pure RR events; also groundwork for the RR → SE hybrid (v1.0.0).

---

## v1.0.0 — RR → SE Hybrid Event Type

### New event format: Round Robin into Single Elimination
- TD selects number of advancers per group; advancers are seeded into the SE bracket by group result then rating.
- Bracket UI populates progressively as RR groups finish.
- Once all RR group matches are complete, the SE stage starts automatically.

---

## Dependency Notes

- v0.7.1 builds naturally after v0.7.0 (both player-facing; share profile/history context).
- v0.9.0 is a prerequisite for v1.0.0 (group draw logic is reused in the RR stage of the hybrid format).
- Cron-based event auto-start (deferred from v0.6.3) requires Vercel Pro for sub-daily scheduling; revisit on plan upgrade.
