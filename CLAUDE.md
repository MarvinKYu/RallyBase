# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Workflow

Run `/session-start` at the beginning of each session to review project state and create the session log stub for today.
Run `/wrap-up` at the end of each session to verify the session log is complete, update memory, and update CLAUDE.md.

## Implementation Workflow:
- One version at a time, with tests, followed by commit + push
- Before each version: detail-drilling conversation with user to lock down specifics
- After each version: await user confirmation of no bugs before planning the next

## Patch Versioning Workflow:
Every change shipped after a planned version (bug fix, UI tweak, etc.) gets a patch version increment (e.g. v0.5.0 → v0.5.1 → v0.5.2). Each patch produces exactly two commits:
1. **Code commit** — message includes the version tag, e.g. `fix(v0.5.1): description`. Create and push the git tag immediately after.
2. **Docs commit** — updates `CHANGELOG.md`, `docs/session-logs/YYYY-MM-DD.md`, `docs/bug-list.md`, and `docs/feature-list-plans.md` together in a single commit. No code changes in this commit.

Do this automatically for every shipped change — no need to ask.

## Project Status

**Current version: v0.7.9.** The app is live on Vercel. Next target is v0.8.0 (Tournament Templates).

### Upcoming
- v0.8.0 — Tournament Templates (save/load tournament templates)

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
- **Existing live tournaments default to DRAFT**: any tournaments created before v0.6.0 without a `createdByClerkId` have `status = 'DRAFT'` and won't appear in the public list. Run `UPDATE "Tournament" SET status = 'PUBLISHED' WHERE "createdByClerkId" IS NULL;` on the production DB after deploying v0.6.0.
- **Timezone limitation**: `datetime-local` inputs are stored as UTC. `toLocaleString()` on the client converts to browser local time. UTC labels added as mitigation; proper timezone handling is future work.
- **`prisma migrate dev` unavailable**: non-interactive terminal requires writing migration SQL manually and applying via `prisma db execute --file <path> --schema prisma/schema.prisma`.

