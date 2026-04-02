# Planned Features Roadmap

## v0.16.1

### Reformat non-TD view all matches for RR -> SE event page
- Two-column layout: All RR phase matches scrollable in left column, All SE phase matches scrollable in right column, "Round Robin"/"Single Elimination" label column headers
- RR phase matches: order by group and label subsections with "Group 1", "Group 2", etc.
- SE phase matches: order by round descending (FINAL at top, then SEMIFINAL, etc) and label subsections with "Round of 16", "Quarterfinal", etc. 
- Add search bar at top to filter matches by player name

### Allow players to confirm own submission if birth year confirmation is enabled using opponent birth year

---

## v0.16.2 - UI Fixes

- Make "Entrants" section on event detail page scrollable for more than 10, sorted by rating descending from top to bottom. 
- Make displayed search results in right column of tournament search page scrollable for more than 7 
- Remove the "View all past (#) ->" button from past tournaments section on tournament search page so thats bottom between left and right columns on tournament search page are aligned
- Display "RallyBase" and "Singles" as selected options for player search filters by default
- Text-color green for winner name for completed match cards in event detail/event manage pages
- Bracket center column should be labeled "Semifinals/Final" for brackets with R16+ where semifinal/final gets stacked vertically
- Persist filled-out fields and selections chosen in create event page if error is thrown 
- Add player number in player search but format UI to have consistent spacing

---

## v0.16.3 - Nav Fixes

- Edit event -> Save changes should redirect back to manage event page
- Void match in bracket should keep you on bracket page, not redirect to manage event page
- Tournament/Event links at top of standings/bracket pages should link to the tournament manage/event manage page if standings/bracket pages were accessed from tournament manage or event manage pages. Right now, those links go to the player-facing tournament detail/event detail page regardless of how they were reached. 

---

## v0.16.4

### Tournament flow reversal 
- Give TD option to move from "published" back to "draft" through a "Retract" button
- Also fix: TD should be able to "start event" for new events added to in-progress tournaments. right now attempting that displays an error message saying "The parent tournament must be published before advancing this event."

---

## v0.16.5

### Historical ratings preservation
- When looking at past tournament results, player ratings displayed should be the ratings at the time of the event start, and not display their current rating.

---

## v1.0.0 — Public Release

> Plan mode: **No** — polish and audit work; no new schema or cross-service changes. Each sub-item can be tackled incrementally.

Final polish and infrastructure pass before opening to the public.

### Mobile UI
- Comprehensive mobile review: fix zoom-on-search-tap, layout overflow issues, and other small issues catalogued in bug-list.md.

### DB reset
- Remove all demo user and test match/tournament data. 

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

## Dependency Notes

- v0.14.0 (RR → SE hybrid) built on v0.13.0 (RR Group Draws): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
