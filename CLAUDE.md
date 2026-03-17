# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Workflow

Run `/session-start` at the beginning of each session to review project state.
Run `/wrap-up` at the end of each session to commit, write the session log, and update memory and CLAUDE.md.

## Implementation Workflow:
- One version at a time, with tests, followed by commit + push                                                         
- Before each version: detail-drilling conversation with user to lock down specifics                                    
- After each version: await user confirmation of no bugs before planning the next   

## Project Status

**Current version: v0.4.1.** The app is live on Vercel. Next target is v0.5.0 (Player Registration Overhaul).

### Version History
- v0.1.0 — MVP (8 phases)
- v0.1.1 — P2002 email fix
- v0.1.2 — react-hook-form removal (production crash)
- v0.1.3 — View code link fix
- v0.2.0 — Delete tournament + dark theme redesign
- v0.3.0 — Stage 2 (player search, self-signup, round-robin, TD views, bracket fix)
- v0.3.1 — Deuce score validation fix
- v0.4.0 — Security, integrity & correctness (TD restrictions, name uniqueness, RR tiebreaker, 4-digit code, player search rating)
- v0.4.1 — UI polish (RR bracket redirect, score input UX, alignment fixes, Dashboard nav)

### Upcoming
- v0.5.0 — Player Registration Overhaul (start time, separate signup page, player withdrawal)
- v0.6.0 — Tournament Lifecycle (TD dashboard page, past tournaments category)
- v0.7.0 — Player History (match history, rating graph)

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router) + TypeScript
- **UI**: Tailwind CSS v4 (no shadcn/ui — intentionally not installed)
- **Fonts**: `geist` npm package (local files, no Google Fonts network call)
- **Database**: PostgreSQL via Prisma v5 ORM (hosted on Neon)
- **Auth**: Clerk (`@clerk/nextjs` v7)
- **Validation**: Zod v4 (react-hook-form removed — all forms use plain `useActionState` + native FormData)
- **Testing**: Vitest v4 (unit + integration against real DB)
- **Hosting**: Vercel (configured via `vercel.json`)

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # Lint
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only (require live DB)
npm run db:seed        # Seed database (roles, orgs, demo data)
npm run db:migrate     # Run Prisma migrations
npm run db:studio      # Browse DB in Prisma Studio
```

## Architecture

**Modular monolith** using Next.js App Router.

```
src/
  app/              # Next.js routes and pages
  components/       # React UI components (layout/, matches/, onboarding/, players/, tournaments/)
  lib/              # Utilities, helpers, Zod schemas
  server/
    actions/        # Server actions (form submission handlers)
    services/       # Domain logic (business rules live here)
    repositories/   # Data access layer (Prisma queries)
    algorithms/     # Pure, stateless algorithms (elo, bracket, match-validation)
```

**Critical rule**: Business logic must NOT live in page components. Pages call services; services call repositories. Algorithms are pure functions with no DB access.

## Two Server Action Patterns

**Pattern A — `useActionState` (forms with persistent error state)**
```typescript
// action returns TournamentActionState; component uses useActionState hook
export async function createTournamentAction(_prevState, formData): Promise<TournamentActionState>
```

**Pattern B — Direct form action (simple redirects)**
```typescript
// action returns void, redirects on success; bound via .bind(null, ...args)
export async function addEntrantAction(eventId, tournamentId, formData): Promise<void>
```

## Domain Rules

- **One account per person**, with multiple roles: `PLAYER`, `TOURNAMENT_DIRECTOR`, `ORG_ADMIN`, `PLATFORM_ADMIN`
- **Ratings are scoped** by `(player, organization, discipline)` — ratings across orgs are completely isolated
- **Two rating structures**: a mutable current snapshot (`player_ratings`) and an immutable transaction ledger (`rating_transactions`)
- **Match results are pending** until the opponent confirms via a confirmation code (auto-generated cuid on `MatchResultSubmission`)
- **Store per-game point scores** (not just game win counts) in `match_games`; `match_result_submission_games` stores the tentative scores before confirmation
- **Two bracket formats**: `SINGLE_ELIMINATION` (seeded, advancement chain) and `ROUND_ROBIN` (circle-method, no advancement chain, 3–6 players)
- **Ratings update automatically** when `confirmMatchResult` is called — `applyRatingResult` runs in the same flow
- **TDs can bypass confirmation**: `tdSubmitMatch` records result directly and runs Elo immediately (no code required); `tdVoidMatch` reverses rating transactions and resets match to `PENDING`
- **Event eligibility**: `checkEligibility()` validates maxParticipants, minRating/maxRating, minAge/maxAge before self-signup

## Database Schema Groups

- Identity: `users`, `player_profiles`, `roles`, `user_roles`
- Organizations: `organizations`, `disciplines`, `rating_categories`
- Ratings: `player_ratings`, `rating_transactions`
- Tournaments: `tournaments`, `events`, `event_entries`
- Matches: `matches` (with `nextMatchId` self-ref + `winnerId`), `match_games`
- Result Submission: `match_result_submissions`, `match_result_submission_games`

Submitted scores live in `match_result_submission_games`. Official scores are only written to `match_games` after confirmation.

## Key Algorithm Details

**Elo** (`src/server/algorithms/elo.ts`)
- Default rating: 1500
- K-factor: 32 (< 30 games), 24 (< 100 games), 16 (≥ 100 games)
- Each player uses their own K-factor; deltas are not necessarily equal-and-opposite

**Bracket** (`src/server/algorithms/bracket.ts`)
- Seeding: position p → player1=seed[p-1], player2=seed[bracketSize-p]
- `nextMatchCoords(round, position, totalRounds)` → `{round: round+1, position: ceil(position/2)}`
- `winnerSlotInNextMatch(position)` → odd = `player1Id`, even = `player2Id`
- Matches created final→R1 in `$transaction` so `nextMatchId` refs are always available

**Round Robin** (`src/server/algorithms/round-robin.ts`)
- `buildRoundRobinSchedule(playerIds)` — circle-method algorithm, supports 3–6 players
- Returns array of rounds, each round an array of `{player1Id, player2Id}` pairs (odd player counts get a bye)
- No advancement chain — matches have no `nextMatchId`; winners determined by W/L count in standings

**Match validation** (`src/server/algorithms/match-validation.ts`)
- `validateGameScore(p1, p2, pointTarget)` → `"p1" | "p2" | "unplayed" | "invalid"`
- A game is valid when the winner reaches `pointTarget` with ≥ 2-point lead
- `validateMatchSubmission` enforces: no gaps (unplayed before decisive), no games after match is decided

## Known Issues / Gotchas

- **Middleware deprecation**: Next.js 16 shows `"middleware" file convention is deprecated` warning — this is cosmetic; the middleware works correctly.
- **react-hook-form removed**: react-hook-form v7.71 + React 19.2 has a `useMemo` incompatibility (React error #310) in production builds. All forms now use plain `useActionState` + native FormData with `name` attributes. Do NOT reintroduce react-hook-form.
- **Tournament deletion FK cycle**: `Match.nextMatchId` uses `onDelete: NoAction`. Deleting a tournament requires nulling `nextMatchId` on all its matches first, then detaching `RatingTransaction.matchId`, then deleting the tournament. See `deleteTournamentById` in `tournament.repository.ts`.
- **User email uniqueness**: Clerk treats email+password and Google OAuth sign-ins as separate accounts with different `clerkId`s. `upsertUserFromClerk` matches on `clerkId OR email` to merge them.
- **Tournament ownership**: `Tournament.createdByClerkId` (nullable String) stores the Clerk user ID of the creator. Existing/seeded tournaments have `null` and show no delete button.

## Completed Versions

**v0.1.0 — MVP (Phases 1–8)**
- ✅ Phase 1 — Foundation (Next.js, Clerk, Prisma, schema)
- ✅ Phase 2 — Player System (profiles, search, rating display)
- ✅ Phase 3 — Ratings (Elo engine, rating service, transactions)
- ✅ Phase 4 — Tournaments (create tournament/event, entrants, list/detail pages)
- ✅ Phase 5 — Brackets (single-elimination generator, bracket UI)
- ✅ Phase 6 — Match Results (submission, confirmation code workflow)
- ✅ Phase 7 — Rating Integration (ratings applied on match confirmation)
- ✅ Phase 8 — Polish (responsive UI, demo seed data, Vercel deployment config)

**v0.1.1** — P2002 email uniqueness fix
**v0.1.2** — react-hook-form removal (production crash fix)
**v0.1.3** — View code link fix
**v0.2.0** — Delete tournament + dark theme redesign

**v0.3.0 — Stage 2 (2026-03-13)**
- ✅ F1 — Player search improvements (player number, gender, birthDate, filters)
- ✅ F2 — Player self-signup (eligibility fields, SignUpButton, age/rating checks)
- ✅ F3 — Round-robin format (circle-method algorithm, standings page, EventFormat enum)
- ✅ F4 — TD/player view separation (tdSubmitMatch, tdVoidMatch, conditional UI)
- ✅ F5 — Bracket UI alignment fix (CARD_H = 104px)
