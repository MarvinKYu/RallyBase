# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**All 8 MVP phases are complete and the app is live on Vercel.** Post-deployment bug fixes and additional features have been applied (see session log 2026-03-12).

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
- **MVP bracket format**: single-elimination only
- **Ratings update automatically** when `confirmMatchResult` is called — `applyRatingResult` runs in the same flow

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

## Implementation Phases — All Complete

- ✅ Phase 1 — Foundation (Next.js, Clerk, Prisma, schema)
- ✅ Phase 2 — Player System (profiles, search, rating display)
- ✅ Phase 3 — Ratings (Elo engine, rating service, transactions)
- ✅ Phase 4 — Tournaments (create tournament/event, entrants, list/detail pages)
- ✅ Phase 5 — Brackets (single-elimination generator, bracket UI)
- ✅ Phase 6 — Match Results (submission, confirmation code workflow)
- ✅ Phase 7 — Rating Integration (ratings applied on match confirmation)
- ✅ Phase 8 — Polish (responsive UI, demo seed data, Vercel deployment config)
