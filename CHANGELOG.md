# Changelog

All notable changes to RallyBase are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[Unreleased]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MarvinKYu/RallyBase/commits/v0.1.0
