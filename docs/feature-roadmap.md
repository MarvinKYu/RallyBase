# Planned Features Roadmap

## v0.8.0 — Bug Fixes & Rule Enforcement

Addresses all open bugs and closes loopholes in state transition logic before any new feature work.

### Bug fixes
- **TD result redirect**: After entering or voiding a match result as TD, redirect back to the manage event page instead of the bracket/standings page.
- **Remove "Back to player search" link** from the player dashboard (profile page). No longer relevant given the nav structure.
- **Remove "Register for events" button** on tournament detail pages when the tournament is COMPLETED.

### Rule guards
- **Block entrant addition after event starts**: `addEntrantAction` should reject if the event status is IN_PROGRESS or COMPLETED.
- **Hard-lock state transitions**: Prevent advancing an event to REGISTRATION_OPEN or IN_PROGRESS if the parent tournament has not yet been published. Prevent advancing tournament to IN_PROGRESS if it has no events. Surface a clear error message for invalid advances.

---

## v0.8.1 — UI Polish

Small visual and UX improvements that don't require schema changes.

### Manage event page
- **Single-line match rows**: Keep match status label and TD action buttons (Enter result / Void) on one line — no wrapping.

### Bracket & standings pages
- **Game score in bracket cards**: Show game count score next to each player (e.g. "Player A · 3" / "Player B · 1").
- **Per-game expand toggle on bracket and standings**: Down-arrow (▾) on completed match rows to expand per-game score breakdown (consistent with manage event page behavior added in v0.7.9).

### Status tags
- **Restyle "Pending" match status**: Give PENDING a styled badge (e.g. neutral border + text-text-2) consistent with the IN_PROGRESS amber tag, rather than plain unstyled text.

### Tournament search
- **Date filter labels**: Add visible "From" / "To" labels to the start date range inputs in the tournament search bar.

### Manage entrants page
- **Remove entrant**: TD can remove a player from the entrant list (with confirmation prompt).
- **Clear search bar after adding**: After a player is added via the entrant search form, clear the search input so the TD can search for the next player without manually clearing.

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
