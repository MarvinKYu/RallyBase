# Current bugs

## Throw error on event create page if # advancers > # players per group
- Save for later when we implement # advancers = 3, 4. 

## Group/round persisted state from event manage page is inconsistent
- Latency issue or logic issue? unclear- investigate

## Mobile UI fixes (ongoing list, needs comprehensive review)
- *(Comprehensive review pending for v1.0.0)*

## Tournaments and events should automatically start at their set startTime
- Cron-based time-triggered auto-start requires Vercel Pro for sub-daily scheduling. Deferred until plan upgrade.

## Auto-complete tournament if not yet completed and move into "PAST" on day after end date
- Requires scheduled job. Deferred.

# Fixed

## Version 0.17.1

### Search input zoom on iOS
- All search/filter inputs had `text-sm` (14px), triggering iOS Safari auto-zoom on focus.
- Fix: `text-base md:text-sm` on all inputs in `EntrantSearchForm` and `PlayerSearchForm`.

### Groups grid cramped on mobile
- Event detail and standings pages used fixed `grid-cols-4`, making group cards unreadably narrow on phones.
- Fix: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — 1 col portrait, 2 col landscape, 4 col desktop.

### Bracket left-half not scrollable on R16+
- Large bracket inner container used `flex min-w-full justify-center`; flexbox centering with overflow clips the left side behind the scroll origin.
- Fix: `mx-auto flex w-fit items-start` — bracket has intrinsic width, both sides scrollable.

---

## Version 0.15.4

### RR_TO_SE "View Standings" button always redirected
- Standings page had `if (event.eventFormat !== "ROUND_ROBIN") redirect(...)` — RR_TO_SE events always bounced to the event detail page.
- Fix: also permit `RR_TO_SE`. SE phase matches filtered out so only group stage schedule appears.

---

## Version 0.15.3

### RR_TO_SE event auto-completes before SE bracket is generated
- When `match.groupNumber` was null on an RR match (stale data), `isRRPhaseMatch = false` and the event was auto-completed with no SE bracket. `tdDefaultMatch` also had no equivalent guard.
- Fix: replaced `groupNumber`-based guard with `checkEventComplete()` — for RR_TO_SE, requires SE bracket to exist and be fully played. `tryAutoGenerateSEStage` now guards with `countSEMatches > 0` instead of `matchGroupNumber === null`.

### Placeholder bracket seeding incorrect for A=2
- `seedToGroupLabel` used a simple modular formula (ascending group order for all ranks). For A=2, runners-up use constrained half-zone placement, which the formula did not reproduce.
- Fix: replaced with `buildPlaceholderSeedInfo()` calling `computeAdvancers` on synthetic standings for the exact same seed→(group, rank) mapping.

### Progress bar shows 100% after group stage before SE bracket generated
- Single bar reached 100% when all RR matches completed but before SE bracket was added. After SE bracket generated, bar dropped.
- Fix: for RR_TO_SE events, replaced with two bars — "Group stage progress" and "Bracket stage progress" (shows "Not started" until SE bracket is generated).

---

## Version 0.15.2

### RR group count with non-full registration
- When `maxParticipants` is set, group count is now `M/P` (not `Math.ceil(n/P)`). A 16-slot/4-group event with 13 registrants generates 4 groups; snake seeding distributes the 13 players correctly. Validation added at event create/edit: `maxParticipants % groupSize` must be 0.

---

## Version 0.15.1

### RR_TO_SE manage page stack overflow on fresh events (A≥2)
- Creating an RR_TO_SE event with `advancersPerGroup = 2` and navigating to its manage page threw `RangeError: Maximum call stack size exceeded`. Root cause: `countIncompleteRRMatches` returns 0 for a brand-new event with no schedule, making `rrComplete = true` vacuously. This triggered `computeAdvancers([], 2, ...)` → `numGroups=0` → `nextPowerOf2(0)=1` → `bracketSeedOrder(1)` which halves indefinitely (1→0.5→0.25…) and never hits the base case. Fix: added `countRRMatches` repository fn; `rrComplete` now requires `rrMatchCount > 0 && incompleteRR === 0`.

---

## Version 0.14.10

### RR→SE bracket seeding: same-group players paired in first round
- The snake seeding reversed group order for runners-up (even ranks), placing group 1's runner-up at seed 8. `bracketSeedOrder(8)` pairs seed 1 vs seed 8 in R1, so group 1 winner and runner-up met immediately. Fix: all ranks now use ascending group order. No same-group first-round matchups.

---

## Version 0.14.9

### Groups spacing in manage event page
- W-L header and cells now have `whitespace-nowrap`; rating cell gets `pr-2` so values don't run into the W-L column.

### SE round labels in event manage page and tournament manage match dropdown
- Pure SE events now use `getRoundLabel` ("Final", "Semifinal", etc.) instead of "Round N" in both the event manage page match section and the tournament manage page match dropdown.

### RR/SE phase separation in tournament manage match dropdown
- RR→SE events now show "Round Robin Phase" and "Bracket Phase" headers with appropriate subsections.

### Groups display on event detail page (for non-TD)
- Event detail page now shows the same groups grid as the manage page. View standings and View bracket buttons also added for RR→SE events.

---

## Version 0.14.2

### `advancersPerGroup` never saved to database
- `createEventAction` and `updateEventAction` both omitted `advancersPerGroup` when building the data object from FormData. The field existed in the form, Zod schema, service, and repository — but was never extracted from `formData`. Result: every RR→SE event was created with `advancersPerGroup = null`, causing "advancersPerGroup is not configured for this event" on SE generation.

### RR_TO_SE event auto-completed after group stage
- When the last group-stage match was confirmed, `countNonCompletedMatches` returned 0 (no SE matches yet) and the event was marked COMPLETED. The SE bracket auto-generate trigger then fired but `generateSEStage` threw (due to the above bug) and was silently swallowed. Fix: auto-complete is now skipped for group-phase matches in RR_TO_SE events; SE-phase match completion triggers it normally.

---

## Version 0.14.1

### Bracket page shows RR group matches in RR_TO_SE events
- Bracket page was rendering all matches (including RR group-stage matches) for `RR_TO_SE` events. Now filters to SE-only matches (`groupNumber === null`) and shows "SE bracket not generated yet" if the SE stage hasn't been generated.

### TD submit back nav goes to bracket instead of manage page
- For RR-phase matches in `RR_TO_SE` events, the back link and COMPLETED redirect on the td-submit page navigated to the bracket page, which didn't show group matches. Now navigates to the manage event page instead.

---

## Version 0.9.8

### New event on published tournament defaulted to DRAFT
- Events created after a tournament is PUBLISHED or IN_PROGRESS now automatically get status `REGISTRATION_OPEN`.

### TD score entry form showed all zeros regardless of existing scores
- TD score entry form now pre-populates from pending submission games (AWAITING_CONFIRMATION) or saved in-progress match games (IN_PROGRESS).

## Version 0.9.7

### Rating chart: multiple matches per day caused multiple data points
- Chart now collapses same-day transactions into one point using end-of-day rating; tooltip shows net daily delta.

### Edit event submission redirected to event detail page instead of manage page
- `updateEventAction` now redirects to `/tournaments/${tournamentId}/manage` after a successful edit.

### Delete tournament button missing from manage tournament page
- `DeleteTournamentButton` added to the manage page header alongside "Edit tournament".

### Delete tournament redirected to /tournaments instead of /tournament-directors
- `deleteTournamentAction` now redirects to `/tournament-directors` on success.

### Tournaments with today's start date placed in "past" in non-UTC environments
- Tournament date filters now use `setUTCHours(0, 0, 0, 0)` to match UTC-stored dates. Affects all three filter locations: `/tournaments`, `/tournaments/upcoming`, `/tournaments/past`.

### Tournament end date did not default to start date
- `TournamentForm` now auto-populates `endDate` with the chosen `startDate` when `endDate` is empty.

## Version 0.7.1

### `advanceEventStatus` integration tests failing after v0.6.2
- The v0.6.2 tournament status cascade (DRAFT→PUBLISHED moves events to REGISTRATION_OPEN; PUBLISHED→IN_PROGRESS moves events to IN_PROGRESS) was silently advancing the shared test event before the `advanceEventStatus` describe block ran, leaving it at IN_PROGRESS instead of DRAFT.
- Fixed by adding a `beforeAll` reset inside the `advanceEventStatus` describe block to restore the event to DRAFT, properly isolating that test group from the tournament cascade side-effects.

## Version 0.6.3

### Brackets/RR schedules should be generated automatically upon event start
- When an event transitions to IN_PROGRESS, its bracket (SE) or round-robin schedule is now auto-generated if none exists and there are enough entrants. Implemented as part of `advanceEventStatus` — no cron needed for this trigger.

## Version 0.6.2

### Matches from tournament in draft status showing up in player dashboard
- Player dashboard upcoming matches now filter to only show matches from non-DRAFT tournaments.

### Auto-open registration
- Publishing a tournament now automatically moves all DRAFT events to REGISTRATION_OPEN. New events created after a tournament is published also default to REGISTRATION_OPEN.

### Auto-close registration
- Starting a tournament now automatically moves all REGISTRATION_OPEN events to IN_PROGRESS.

## Version 0.6.1

### No way to navigate directly to event detail page from TD dashboard
- Event names on the TD manage page are now clickable links to the event detail page.

### Edit event button should also show up in the event detail page for TD
- Added an "Edit event" link on the event detail page, visible only to the owning TD.

### Back-route navigation fix
- Edit tournament page back button now returns to the manage page instead of the tournament detail page.
- Event detail back link is now context-aware: TDs return to the manage page, others return to the tournament detail page.

### Add event button should only be in the TD dashboard, no longer in the tournament detail page
- "Add event" button removed from the tournament detail page; now lives exclusively on the TD manage page.

## Version 0.4.1

### Bracket page showing up in round robin format after event creation
After creating a new round robin event with 3 players (call them A, B, C for simplicity) and clicking "generate schedule", app generates a bracket with quarterfinal between player B and C, semifinal between player A and B, and final between player A and C, and shows it on webpage. this should not exist at all, after generating schedule for round robin TD should see the page that can be navigated to by "view standings" button that shows current standings with table of players, w/l, games, points and the match schedule.

### Text alignment for matches from TD view
status text such as "completed", "pending", "awaiting confirmation", and match options like "enter result", and "void" aren't visually aligned. in particular, the "void" option is clearly visually slightly lower inside the box than the other text. should fix this and recheck text alignment for other text fields as well.

## Version 0.3.1

### Game score validation
- Score gap when either score is >11 has to be at most 2. This is because the win by 2 rule has to take place after deuce (10-10) is reached. Need to reject game scores like 11-50.
