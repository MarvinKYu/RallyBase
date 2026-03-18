# Changelog

All notable changes to RallyBase are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
