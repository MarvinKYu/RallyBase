# Planned Features Roadmap

## v0.7.0 — Player History

### Match history on player dashboard
- List of past rated matches on the player's own profile page.
- Shows tournament/event, opponent, result, rating delta, and date.

### Rating graph
- Line chart using Recharts showing rating over time.
- Sourced from `rating_transactions` ledger.
- Scoped by org/discipline (picker if multiple).

---

## v0.7.1 — My Tournaments

### Separate "My Tournaments" from all-tournaments view
- Dedicated section or page for tournaments the player has registered for or played in.
- Organized into three sections: Ongoing, Upcoming, Past.

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
