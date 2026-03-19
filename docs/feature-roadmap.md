# Planned Features Roadmap

## v0.8.3 — Completed matches polish

### Manage event match list (ManageEventMatchList)
- **No inline score summary when collapsed**: remove the per-game score string shown below the player names on completed rows by default; scores are only visible in the expanded panel.
- **Expand toggle on the left**: move the ▾/▴ chevron to the left of the player names (before them), not the right.
- **Entire row clickable**: clicking anywhere on the match row (except the TD action buttons) toggles the expand/collapse for completed matches.
- **Bold winner name**: for COMPLETED matches, the winning player's name is bold white (`font-semibold text-text-1`).
- **"Completed" badge matches "Pending" badge**: style the Completed status with the same neutral badge treatment as Pending (`bg-surface border border-border text-text-3 rounded-full px-2 py-0.5 text-xs`).

### Your Matches list (YourMatchesList — tournament detail page)
- **Expand toggle on the left**: move the ▾/▴ chevron to the left of the match text for completed matches with scores.
- **Entire row clickable**: clicking anywhere on the match row (except the action button) toggles expand/collapse for completed matches.
- **Status badge inline**: move the status label from a second line below the match text into the same line as event name / round / opponent, styled as a neutral pill (`bg-surface border border-border text-text-3 rounded-full px-2 py-0.5 text-xs`).
- **Sort by event name**: within each group (In progress / Upcoming / Completed), matches are sorted by event name A→Z. (Future: re-sort by event `startTime` once that field is surfaced here.)

---

## v0.9.0 — Player Search Overhaul

### Paginated results
- Default view: all players shown 10 at a time, navigable with previous/next arrows.
- Default sort: rating descending, then name A→Z as tiebreaker.

### Sorting controls
- Sort options: Rating ↓, Rating ↑, Name A→Z, Name Z→A.
- When a filter or sort is active, results update immediately (client-side where possible, server query where not).

---

## v0.10.0 — Event Detail Page (Player)

### Overhaul player-facing event detail page
- Redesign similar in spirit to the manage event two-column layout, but scoped to what a player needs:
  - Left column: event info (org, format, rating category, status), registration status / sign-up action, entrant list.
  - Right column: match schedule or bracket preview with player-relevant actions (Submit, Confirm).
- Detailed planning required before implementation.

---

## v0.11.0 — Tournament Templates

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v0.12.0 — Player Profile: Gender & Age

### Schema additions
- Add optional `gender` and `dateOfBirth` fields to `player_profiles`.

### Player search filters
- Filter player search by gender and/or age range.

### Event eligibility restrictions
- Event creation: TD can restrict by gender and/or age range (min/max age).
- `checkEligibility()` enforces these restrictions on self-signup.

---

## v0.13.0 — RR Group Draws

### Specify group size for RR events
- TDs can set a group size when configuring a round-robin event.

### Auto-seeded group assignments
- If registrants exceed the group size, players are distributed into groups based on rating.
- Applies to pure RR events; also groundwork for the RR → SE hybrid (v0.14.0).

---

## v0.14.0 — RR → SE Hybrid Event Type

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

- v0.8.0 should ship before any new feature work — open bugs affect existing TD workflows.
- v0.13.0 (RR Group Draws) is a prerequisite for v0.14.0 (RR → SE hybrid): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
