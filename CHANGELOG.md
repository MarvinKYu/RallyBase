# Changelog

All notable changes to RallyBase are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.8.1] - 2026-03-19

### Added
- **Match result page** (`/matches/[matchId]`) — read-only result view for completed matches showing per-game score table, winner callout, and breadcrumb linking back to the bracket.
- **Bracket game win counts** — completed bracket match cards now show game win counts next to each player name (e.g. "Player A · 2 W / Player B · 1").
- **Bracket "View" link** — completed non-bye bracket match cards now show a "View" link to the match result page.
- **Per-game expand on standings schedule** — completed match rows in the standings schedule now have a ▾ toggle to expand per-game score breakdown. `StandingsSchedule` extracted as a `"use client"` component.
- **Per-game expand on "Your Matches"** — completed match rows in the tournament detail "Your Matches" section now have a ▾ toggle to expand per-game score breakdown. `YourMatchesList` extracted as a `"use client"` component.
- **Remove entrant** — TDs can remove a player from an event's entrant list via a "Remove" button (with confirmation dialog). Blocked server-side if any match has progressed past PENDING.

### Changed
- **Single-line match rows** — status label and TD action buttons (Enter result / Void / expand toggle) in ManageEventMatchList are now on a single line.
- **PENDING match status badge** — PENDING status in ManageEventMatchList is now displayed as a styled neutral badge (border + bg-surface) instead of plain unstyled text.
- **Date filter labels** — "From" and "To" labels added above the date range inputs in the tournament search bar.

---

## [0.8.0] - 2026-03-19

### Fixed
- **TD result redirect** — After TD submits or voids a match result, redirect to manage event page instead of bracket/standings.
- **Profile page** — Removed stale "Back to player search" link.
- **Tournament detail** — "Register for Events" button is now hidden on COMPLETED tournaments.

### Added
- **Entrant guard** — `addEntrantAction` rejects with inline error when event is IN_PROGRESS or COMPLETED; action refactored to Pattern A (`useActionState`).
- **Tournament advance guard** — Attempting to start a tournament with no events now returns an inline error via `AdvanceTournamentStatusButton`.
- **Event advance guard** — Advancing an event to REGISTRATION_OPEN or IN_PROGRESS when the parent tournament is not PUBLISHED now returns an inline error via `AdvanceEventStatusButton`.
- `AddEntrantForm`, `AdvanceTournamentStatusButton`, `AdvanceEventStatusButton` client components for inline error display.

---

## [0.7.9] - 2026-03-18

### Added
- **Manage event match list** — TD actions (Enter result / Void) on each match row; completed matches are expandable in-place to show per-game score breakdown.
- `ManageEventMatchList` client component handles grouping by round, TD actions, and expand/collapse state.

### Fixed
- Manage event page now has a "← Back to manage tournament" link at the bottom.
- Creating a new event redirects to the manage event page (not player-facing event detail).
- Deleting an event redirects to the manage tournament page (not tournament detail).
- Adding an entrant from manage entrants page stays on manage entrants (no redirect away).
- Advancing event status from manage event page stays on manage event page (no redirect away).
- New event page back link now points to manage tournament, not tournament detail.
- Bracket and standings pages back link is context-aware: `?from=manage` sends TDs back to manage event; players go back to event detail.
- Manage tournament and manage event bracket/standings links now pass `?from=manage`.

---

## [0.7.8] - 2026-03-18

### Added
- **Manage Event page** (`/tournaments/[id]/events/[eventId]/manage`) — TD-only two-column layout:
  - Left column: breadcrumb → event name + Edit/Delete buttons → org/discipline/format details → status badge + advance button → progress bar (completed/total matches, hover tooltip) → generate bracket button (if applicable) → entrants preview (up to 10) with "Manage →" link.
  - Right column: always-visible scrollable match list grouped by round (max-height 70vh), with sticky round headers. Bracket/standings links at bottom.
- **Manage Entrants page** (`/tournaments/[id]/events/[eventId]/manage/entrants`) — full entrant list + player search form to add entrants. Breadcrumb links back through manage event.
- `findEventManageDetail` repository function — fetches event with tournament, ratingCategory, all eventEntries (with ratings), and all matches (with games).
- `getEventManageDetail` service function — auth-gates by `createdByClerkId`.

### Changed
- Manage tournament page: event name links and "Edit" links now point to `/events/[eventId]/manage` instead of the player-facing event detail page.

---

## [0.7.7] - 2026-03-18

### Added
- **2-column tournaments page** — left column has header + "New tournament" button + `MyTournamentsPreview` (logged-in players) + `TournamentSearchBar`; right column has Upcoming (top 5 + "View all →") and Past (top 5 + "View all →") preview lists.
- **`TournamentSearchBar`** client component — filters by name text, org dropdown, location text, and date range entirely client-side. Reusable across sub-pages.
- **`/tournaments/upcoming`** and **`/tournaments/past`** pages — each loads the scoped subset and embeds `TournamentSearchBar`.
- **Removed** from `/tournaments`: old "My registered tournaments" section, "My drafts" section, and associated data fetches.

---

## [0.7.6] - 2026-03-18

### Changed
- **Tournament detail page** — removed Manage button and Delete tournament button entirely. Draft visibility guard remains (non-creator redirected to `/tournaments`).
- **Event detail page** — removed all TD controls (Edit event, Delete event, Add entrant section, Generate bracket button, TD actions section). Back link always goes to tournament detail. Page now serves purely as a player-facing view.
- **Manage tournament page** — back link changed from `/tournaments/[id]` to `/tournament-directors`.
- **Edit event page** — back link changed from event detail to `/tournaments/[id]/manage`.
- **New tournament page** — back link changed from `/tournaments` to `/tournament-directors`.
- Navigation contract: player flow = Tournaments → Tournament detail → Event detail. TD flow = Tournament Directors → Manage tournament → Edit/manage events.

---

## [0.7.5] - 2026-03-18

### Added
- **Tournament Directors nav link** — added between Tournaments and Players in the global nav (desktop + mobile).
- **Tournament Directors page** (`/tournament-directors`) — shows all of the logged-in user's tournaments grouped into 4 status columns (Drafts, Published, In Progress, Completed), each preview showing 5 most recent with "View all →" links to sub-pages. Auth-gated; redirects to sign-in if not logged in.
- **Empty state** on Tournament Directors — step-by-step onboarding for users with no tournaments.
- **Templates placeholder** — "Coming soon" card at the bottom of the Tournament Directors page (v0.8.0 will fill this).
- **Tournament Directors sub-pages** — `/tournament-directors/drafts`, `/published`, `/in-progress`, `/completed`.
- **`TDTournamentGroup`** shared component for each status column.
- **Profile page** — container widened from `max-w-4xl` to `max-w-6xl`.

---

## [0.7.4] - 2026-03-18

### Added
- **Your Matches section** on every tournament detail page — shows only to logged-in players who have at least one match in that tournament. Grouped into In Progress (IN_PROGRESS + AWAITING_CONFIRMATION), Upcoming (PENDING), and Completed. Each row shows event name, round, opponent, status, and an action link (Submit / Confirm / View).
- `findMatchesByPlayerAndTournament` repository function in `match.repository.ts`.
- `getPlayerMatchesForTournament` service function in `player.service.ts`.
- Integration tests for the new repository function appended to `tests/integration/player-history.test.ts`.

---

## [0.7.3] - 2026-03-18

### Added
- **My Tournaments page** at `/profile/[id]/tournaments` — groups player's tournaments into Ongoing, Upcoming, and Past sections; each row links to the tournament.
- **My Tournaments preview** on the profile dashboard (left column, own profile only) — shows up to 3 active/upcoming tournaments with inline "View all →" link.
- **My Tournaments preview** on the tournaments search page (`/tournaments`) — visible to logged-in players with a profile, rendered above the public list.
- `findTournamentsWithEntriesByProfile` repository function — filters tournaments by player entry, includes only the events the player is entered in.
- `getPlayerTournamentHistory` service function in `tournament.service.ts`.
- `MyTournamentsPreview` shared server component in `src/components/players/`.
- Integration tests for the new service function (`tests/integration/my-tournaments.test.ts`).

---

## [0.7.2] - 2026-03-18

### Added
- **Two-column profile layout** — profile page widens to `max-w-4xl` with a `grid-cols-1 md:grid-cols-2` layout. Left column: header, ratings, upcoming matches. Right column: rating graph, match history.
- **Inline "View all →" links** — "Upcoming matches" links to `/profile/[id]/tournaments`; "Match history" links to `/profile/[id]/history`.
- **Full match history page** at `/profile/[id]/history` — displays all completed matches grouped by tournament with back link to profile.
- **Top-5 limit** on upcoming matches in dashboard — sorted by status priority (IN_PROGRESS → AWAITING_CONFIRMATION → PENDING), truncated at 5.
- **`limit` prop on `MatchHistoryList`** — optional, slices display list when provided.

### Changed
- Rating deltas now display with 2 decimal places (e.g. `+16.00`) in both the match history table and the rating graph tooltip.

---

## [0.7.1] - 2026-03-18

### Fixed
- `advanceEventStatus` integration tests were failing because the v0.6.2 tournament cascade (DRAFT→PUBLISHED, PUBLISHED→IN_PROGRESS) silently advanced the shared test event to IN_PROGRESS before the `advanceEventStatus` describe block ran. Added a `beforeAll` reset to DRAFT at the top of that describe block to isolate it from the tournament cascade side-effects.

---

## [0.7.0] - 2026-03-18

### Added
- **Match history list** on every player profile page — shows all COMPLETED rated matches with tournament/event, linked opponent, W/L result + game score (e.g. "W 3–1"), and rating delta (color-coded green/red). Visible to any viewer.
- **Rating history graph** on every player profile page — Recharts `LineChart` showing rating over time sourced from the `rating_transactions` ledger. If the player has ratings in multiple org/discipline categories, a dropdown picker appears above the graph. Shows "No rating history yet" if no transactions exist.
- `findCompletedMatchesByPlayerId` repository function — queries completed matches for a player, including match games and the player's own rating transactions.
- `findAllRatingTransactionsByProfile` repository function — queries all rating transactions for a player across all categories in chronological order.
- `getPlayerMatchHistory` service function in `player.service.ts`.
- `getPlayerRatingHistories` service function in `rating.service.ts`.
- Integration tests for both new service functions (`tests/integration/player-history.test.ts`).

---

## [0.6.5] - 2026-03-18

### Changed
- Match list on the manage page now starts collapsed by default.
- When the last match in an IN_PROGRESS event is completed (via player confirmation or TD submit), the event automatically advances to COMPLETED. If that was the last non-completed event, the tournament also auto-completes.

---

## [0.6.4] - 2026-03-18

### Changed
- Creating a new tournament now redirects to the manage page instead of the tournament detail page.
- Edit tournament page now shows a Delete button (bottom-right), matching the existing confirmation flow.
- Edit event page now shows a Delete button (bottom-right), matching the existing confirmation flow.
- Match list on the manage page is now collapsible (click "▾ Matches (N)" to toggle) and scrollable (`max-h-96 overflow-y-auto`) so long match lists no longer extend the page.

---

## [0.6.3] - 2026-03-18

### Changed
- When an event transitions to IN_PROGRESS (via manual advance or tournament-level cascade), its bracket or round-robin schedule is now auto-generated if none exists yet and there are enough players (SE ≥ 2, RR ≥ 3). If the condition isn't met, the manual "Generate bracket" button remains available.

---

## [0.6.2] - 2026-03-18

### Changed
- Publishing a tournament now automatically opens registration for all DRAFT events (DRAFT → REGISTRATION_OPEN).
- Starting a tournament now automatically moves all REGISTRATION_OPEN events to IN_PROGRESS.
- When the last event in a tournament is marked COMPLETED, the tournament automatically advances to COMPLETED (no manual step needed; the "Complete Tournament" button remains as a safety valve for 0-event tournaments).
- Player dashboard no longer shows upcoming matches from DRAFT tournaments.

---

## [0.6.1] - 2026-03-18

### Changed
- Event names on the TD manage page are now clickable links to the event detail page.
- Added **Edit event** button on the event detail page for TDs, linking to the edit event form.
- Edit tournament page back button now returns to the manage page instead of the tournament detail page.
- Event detail back link is now context-aware: TDs go to the manage page, others go to the tournament detail page.
- **Add Event** button moved from the tournament detail page to the manage page.

---

## [0.6.0] - 2026-03-17

### Added
- **TD manage page** at `/tournaments/[id]/manage` — management hub with status controls, match overview per event, and links to edit/bracket/standings.
- **Tournament status transitions** — full lifecycle: DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED, TD-only, forward-only.
- **Event status transitions** — full lifecycle: DRAFT → REGISTRATION_OPEN → IN_PROGRESS → COMPLETED, TD-only, forward-only.
- **Edit tournament page** at `/tournaments/[id]/edit` — pre-filled form for name, location, dates, and scheduling.
- **Edit event page** at `/tournaments/[id]/events/[eventId]/edit` — pre-filled form; rating category and event format shown read-only to prevent destructive changes.
- **Past/upcoming split** on the tournament list — tournaments split by `startDate` relative to today.
- **My Drafts section** on the tournament list — TDs see their DRAFT tournaments (links to manage page) at the top.
- **DRAFT guard** on tournament detail — non-TD visitors to a DRAFT tournament URL are redirected to `/tournaments`.
- **Manage link** on tournament detail page for the TD.

### Changed
- DRAFT tournaments are excluded from the public tournament list.
- Seeded demo tournaments now default to `PUBLISHED` status.

---

## [0.5.2] - 2026-03-17

### Changed
- **Register for Events button** is now accent green for visibility on the tournament detail page.

### Fixed
- **UTC labels on datetime inputs:** `startTime` and `withdrawDeadline` inputs now show `(UTC)` in their labels to make the timezone expectation explicit.

---

## [0.5.1] - 2026-03-17

### Fixed
- **Register for Events link always visible:** the link was previously hidden unless a user was logged in AND at least one event was `REGISTRATION_OPEN`. It now appears whenever the tournament has any events, regardless of their status or the viewer's auth state.

---

## [0.5.0] - 2026-03-17

### Added
- **Start times:** optional `startTime` field on both `Tournament` and `Event`. Displayed on tournament detail, event detail, and register pages.
- **Withdrawal deadline:** optional `withdrawDeadline` field on `Tournament`. If not set, defaults to 24 hours before `Tournament.startTime`. If neither is set, withdrawal is always allowed (until bracket is generated).
- **Player registration page:** new `/tournaments/[id]/register` route — players see all events in one place, select eligible ones via checkboxes, and submit with a single "Register Selected" button. Per-event status badges and eligibility reasons shown inline.
- **Player withdrawal:** players can withdraw from an event via a confirm-dialog button on the register page, subject to the withdrawal deadline.
- **Scheduling inputs on forms:** `TournamentForm` gains a collapsible "Scheduling" section with `startTime` and `withdrawDeadline` datetime-local inputs. `EventForm` gains an optional `startTime` input.
- **Register link on tournament detail:** a "Register" button appears on the tournament detail page for signed-in users when at least one event is `REGISTRATION_OPEN`.

### Changed
- **SignUpButton removed from event detail page:** `/register` is now the only player self-registration path. The `SignUpButton` component and `signUpForEventAction` remain in the codebase but are no longer rendered.

---

## [0.4.2] - 2026-03-16

### Added
- **Delete event:** tournament directors can delete an event from the event detail page. Applied rating transactions are reversed before removal; all matches, entries, and submissions are cleaned up via cascade.

---

## [0.4.1] - 2026-03-16

### Added
- **Dashboard nav link:** explicit "Dashboard" link added to the header navigation bar alongside the existing logo link.

### Fixed
- **Round-robin bracket redirect:** navigating to the bracket page for a round-robin event now redirects to the standings page. Generating a round-robin schedule also redirects to standings instead of bracket.
- **Void button alignment:** the Void button in bracket match cards and standings schedule rows was pushed slightly below sibling text due to its `<form>` wrapper being a block element. Wrapper is now inline-flex.
- **Submit link color:** the player "Submit" link in bracket match cards is now accent-colored, matching the TD "Enter result" link.
- **Match score input UX:** score fields now clear on focus and default back to 0 on blur if left empty. Values are retained after a failed submission. The row containing an invalid score is highlighted in red.

---

## [0.4.0] - 2026-03-16

### Added
- **Player search shows current rating:** player search results (global search and tournament add-entrant search) now display each player's rating. Global search defaults to USATT singles; active org/discipline filters update the displayed rating accordingly. Shows "Unrated" when no rating exists in the relevant category.
- **Dashboard nav link:** explicit "Dashboard" link added to the header navigation bar alongside the existing logo link.

### Changed
- **Verification code is now 4 digits:** match result confirmation codes changed from a long cuid string to a 4-digit zero-padded number (e.g. `0472`). A new code is generated on each submission attempt.

### Fixed
- **TD restriction on event/entrant/bracket actions:** creating events, adding entrants, and generating brackets are now restricted to the tournament creator at both the UI and server action level. Other signed-in users no longer see these controls.
- **Tournament and event name uniqueness:** tournament names are now unique within an organisation; event names are unique within a tournament. Duplicate names return a form-level field error.
- **TD can void matches in AWAITING_CONFIRMATION state:** the Void button now appears for matches awaiting confirmation (not only completed matches), allowing TDs to cancel a pending submission and reset the match.
- **Round-robin tiebreaker uses head-to-head subset:** standings sort now applies tiebreakers using only the head-to-head matches among tied players (games won → points for → direct H2H result for two-player ties), rather than overall event statistics. Tied players share a rank displayed as `T-1`, `T-2`, etc.

---

## [0.3.1] - 2026-03-16

### Fixed
- **Game score validation:** scores where either player's total exceeds the point target (e.g. 11) are now correctly rejected unless the margin is exactly 2. Scores like `11–50` or `14–11` were previously accepted because the win-by-2 check alone was insufficient; the fix enforces that once a game goes past the point target (deuce), the gap must be exactly 2. Unit tests added for all new cases.

---

## [0.3.0] - 2026-03-13

### Added
- **Player search improvements:** players can now be searched by player number; search results show gender and date of birth; filter controls added to the player search UI.
- **Player self-signup:** players can sign up for events directly from the event page. Eligibility is checked against event constraints (min/max rating, min/max age, max participants) before confirming registration.
- **Round-robin format:** events can now be created with a `ROUND_ROBIN` format supporting 3–6 players. Schedule is generated using the circle method. Odd player counts receive a bye each round.
- **Round-robin standings page:** dedicated standings view showing win/loss record and games differential for each player in a round-robin event.
- **TD match submission:** tournament directors can submit match results directly without requiring a confirmation code (`tdSubmitMatch`). Elo ratings are applied immediately.
- **TD match void:** tournament directors can void a completed match, reversing the associated rating transactions and resetting the match to pending (`tdVoidMatch`).
- **Separate TD and player views:** tournament detail pages now show different content depending on whether the viewer is the tournament director or a participant.

### Fixed
- **Bracket card alignment:** fixed vertical misalignment of match cards in the single-elimination bracket view (card height constant corrected to 104px).

---

## [0.2.0] - 2026-03-12

### Added
- **Delete tournament:** tournament creators can delete their own tournaments from the tournament detail page. Deletion handles the foreign key cycle (`Match.nextMatchId → NoAction`) by nulling match references and detaching rating transactions before removing the tournament record.
- **Dark athletic theme:** full visual redesign across all pages using a dark background with green accent colour. Applied consistently to all layout components, forms, brackets, and match cards.

---

## [0.1.3] - 2026-03-12

### Fixed
- **View code link on bracket:** the "View Code" link for matches in `AWAITING_CONFIRMATION` state was not rendering correctly in the bracket view. Link now appears as expected so players can retrieve their confirmation code.

---

## [0.1.2] - 2026-03-12

### Fixed
- **Production crash (react-hook-form):** `react-hook-form` v7.71 has a `useMemo` incompatibility with React 19.2 that causes a fatal error (#310) in production builds. Removed `react-hook-form` entirely; all forms now use plain `useActionState` with native `FormData` and `name` attributes.

---

## [0.1.1] - 2026-03-12

### Fixed
- **Duplicate email conflict (P2002):** Clerk treats email+password and Google OAuth sign-ins as separate accounts with different Clerk IDs. `upsertUserFromClerk` now matches on `clerkId OR email` to merge accounts and avoid a unique constraint violation on repeated sign-ins.

---

## [0.1.0] - 2026-03-11

### Added
- **Foundation:** Next.js 16 (App Router) + TypeScript project scaffolded with Clerk authentication, Prisma ORM, and a PostgreSQL schema covering users, organisations, disciplines, ratings, tournaments, events, matches, and result submissions.
- **Player system:** player profile creation and editing, global player search, and per-player rating display scoped by organisation and discipline.
- **Elo rating engine:** rating calculations with variable K-factor (32 / 24 / 16 based on games played). Ratings are stored as a mutable snapshot (`player_ratings`) and an immutable ledger (`rating_transactions`).
- **Tournament system:** create tournaments and events with configurable format (`BEST_OF_3/5/7`), point target (11 or 21), and eligibility constraints (min/max rating, min/max age, max participants). Tournament directors can add entrants via player search.
- **Single-elimination brackets:** seeded bracket generation for any power-of-2 field size. Matches link via `nextMatchId` so winners advance automatically.
- **Match result submission:** players submit scores game-by-game. A confirmation code is generated and sent to the opponent; the match is finalised only after the opponent enters the code.
- **Rating integration:** Elo deltas are calculated and applied automatically when a match result is confirmed.
- **Polish and deployment:** responsive UI, demo seed data (organisations, disciplines, rating categories, sample players and tournaments), and Vercel deployment configuration.

---

[Unreleased]: https://github.com/MarvinKYu/RallyBase/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MarvinKYu/RallyBase/commits/v0.1.0
