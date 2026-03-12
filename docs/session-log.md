## Session Log — 2026-03-12

### Objective
Post-deployment bug fixing, UX improvements, and the delete tournament feature.

### Work Completed

**Deployment & Post-Launch Bug Fixes**
- App deployed to Vercel. `vercel login` + `vercel deploy --prod` completed by user; env vars (DATABASE_URL, Clerk keys) configured in Vercel dashboard.
- **Bug fix — P2002 email unique constraint** (`user.repository.ts`): `upsertUserFromClerk` was matching only on `clerkId`. When a user signed in via Google OAuth after previously creating an email/password account, Clerk assigned a new `clerkId` but the same email already existed in the DB. Fixed by querying `OR [{ clerkId }, { email }]` and updating in-place, merging the accounts.
- **Bug fix — React error #310 (client-side crash on all form pages)**: `react-hook-form` v7.71 + React 19.2.3 has a `useMemo` incompatibility that causes a client-side crash in production builds. Removed `react-hook-form` and `@hookform/resolvers` from all 5 form components (`TournamentForm`, `EventForm`, `SubmitResultForm`, `ConfirmResultForm`, `ProfileForm`). All forms now use plain `useActionState` + native FormData with `name` attributes on inputs. Server actions already perform Zod validation and return `fieldErrors`, so the UX is identical.

**UX Fixes**
- **View code link on bracket**: `AWAITING_CONFIRMATION` match cards now show both a **View code** link (→ `/matches/[matchId]/pending`) and a **Confirm** link. Previously, navigating away from the pending page made the confirmation code unreachable.

**Delete Tournament Feature**
- Schema migration (`20260312230604_add_tournament_creator`): added `createdByClerkId String?` to `Tournament`.
- `createTournamentAction` now saves `userId` (Clerk ID) as `createdByClerkId` on create.
- `deleteTournamentById` repository function: nulls `nextMatchId` on all matches first (breaks self-referential FK cycle), detaches `RatingTransaction.matchId`, then deletes the tournament (cascades to events → entries, matches, match games, submissions).
- `deleteTournament` service: verifies ownership (`tournament.createdByClerkId === clerkId`) before deleting.
- `deleteTournamentAction`: server action, redirects to `/tournaments` on success.
- `DeleteTournamentButton` client component: `useTransition` + `window.confirm` confirmation dialog; red outlined button.
- Tournament detail page: delete button shown only when `userId === tournament.createdByClerkId`. Existing/seeded tournaments (null `createdByClerkId`) show no button.

**Frontend Design Skill**
- Installed `frontend-design` skill from `github.com/anthropics/claude-code/tree/main/plugins/frontend-design` at `.claude/skills/frontend-design/SKILL.md`. Available as `/frontend-design` in a new session.

### Files Created / Modified

- `src/server/repositories/user.repository.ts` — email-or-clerkId upsert
- `src/components/tournaments/TournamentForm.tsx` — removed react-hook-form
- `src/components/tournaments/EventForm.tsx` — removed react-hook-form
- `src/components/matches/SubmitResultForm.tsx` — removed react-hook-form
- `src/components/matches/ConfirmResultForm.tsx` — removed react-hook-form
- `src/components/onboarding/ProfileForm.tsx` — removed react-hook-form
- `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx` — View code + Confirm links
- `prisma/schema.prisma` — added `createdByClerkId` to Tournament
- `prisma/migrations/20260312230604_add_tournament_creator/migration.sql`
- `src/server/repositories/tournament.repository.ts` — added `deleteTournamentById`
- `src/server/services/tournament.service.ts` — added `deleteTournament`, pass `createdByClerkId` on create
- `src/server/actions/tournament.actions.ts` — added `deleteTournamentAction`, pass `userId` on create
- `src/components/tournaments/DeleteTournamentButton.tsx` — new
- `src/app/tournaments/[id]/page.tsx` — delete button for creator
- `.claude/skills/frontend-design/SKILL.md` — new
- `.gitignore` — added `scripts/` ignore
- `scripts/delete-tournament.ts` — one-off utility (gitignored)

### Issues Encountered

- **react-hook-form + React 19 production crash**: Worked fine in dev/build, only failed in production runtime. Root cause: react-hook-form v7.71 calls `useMemo` in a way incompatible with React 19.2 production bundles (React error #310). Resolution: removed react-hook-form entirely from all forms.
- **`/frontend-design` skill not recognized in current session**: Skill file placed correctly at `.claude/skills/frontend-design/SKILL.md`. `/reload-plugins` reloaded 0 skills. Requires starting a new Claude Code session to pick up.

### Current State

- **Deployed**: Live on Vercel. Full end-to-end flow tested (sign up, create tournament, add events/players, generate bracket, submit scores, confirm result, rating update verified).
- **All forms**: react-hook-form removed; plain useActionState + FormData throughout.
- **Delete tournament**: Working for any tournament created after 2026-03-12.
- **Build**: Clean. All 16 routes compile.

### Next Steps

- Start new Claude Code session to use `/frontend-design` skill for UI redesign
- UI redesign across all pages
- Consider future features: doubles events, round-robin format, bracket seeding UI, rating history charts

---

## Session Log — 2026-03-11

### Objective
Complete Phases 3–8 of the RallyBase MVP: Elo rating engine, tournament system, bracket engine, match result submission, rating integration, and deployment polish.

### Work Completed

**Phase 2 — Player System** *(completed in prior session, logged here for completeness)*
- Player profile creation form + `createProfileAction` server action
- Onboarding page (`/onboarding`) for new users post-signup
- Player profile page (`/profile/[id]`) showing display name, bio, ratings
- Player search page (`/players`) with URL-based query and `Suspense` streaming
- `getMyProfile`, `getPlayerProfile`, `searchPlayers` services + repositories
- Middleware updated: `/players(.*)` and `/profile/(.*)` public
- Home page (`/`) redirects authenticated users to profile or onboarding
- 4 unit tests + 7 integration tests

**Phase 3 — Elo Rating Engine**
- Pure Elo algorithm in `src/server/algorithms/elo.ts`: `getKFactor`, `expectedScore`, `calculateElo`, `calculateMatchElo` — completely isolated for independent testing and future algorithm swaps
- K-factor tiers: 32 (< 30 games), 24 (< 100 games), 16 (≥ 100 games)
- `rating.repository.ts`: `findPlayerRatingsByProfileId`, `findPlayerRatingByCategory`, `findRatingTransactionsByProfileAndCategory`
- `rating.service.ts`: `getPlayerRatings`, `getRatingHistoryForPlayer`, `applyRatingResult` (upserts `player_ratings` snapshot + inserts `rating_transactions` ledger in a single `$transaction`)
- 17 unit tests (`tests/unit/elo.test.ts`) + 8 integration tests (`tests/integration/rating.test.ts`)

**Phase 4 — Tournament System**
- Zod schemas: `createTournamentSchema`, `createEventSchema`, `addEntrantSchema`
- Repository + service layers for tournaments, events, and entries
- Server actions: `createTournamentAction`, `createEventAction` (use `useActionState`), `addEntrantAction` (direct form action, `.bind(null, eventId, tournamentId)`)
- Client components: `TournamentForm`, `EventForm`, `EntrantSearchForm`
- Pages: `/tournaments`, `/tournaments/new`, `/tournaments/[id]`, `/tournaments/[id]/events/new`, `/tournaments/[id]/events/[eventId]`
- Nav header updated with Tournaments + Players links
- Middleware: `/tournaments(.*)` public
- 16 unit tests + 15 integration tests

**Phase 5 — Bracket Engine**
- Prisma schema migration (`20260311221258_add_bracket_fields`): added `nextMatchId` self-referential relation to `Match` (`onDelete: NoAction, onUpdate: NoAction`) and `winnerId` foreign key
- Pure bracket algorithm in `src/server/algorithms/bracket.ts`: `buildSingleEliminationBlueprint`, `nextMatchCoords`, `winnerSlotInNextMatch`
  - Seeding: position p → player1=seed[p-1], player2=seed[bracketSize-p]
  - Odd positions → player1Id slot in next match; even → player2Id
- `bracket.service.ts`: `generateBracket` creates matches final→R1 in `$transaction` with `nextMatchId` links; auto-resolves byes (COMPLETED + advances winner)
- Bracket UI page with geometrically-aligned columns using `paddingTop = ((factor-1)*MATCH_H)/2` and `gap = (factor-1)*MATCH_H`
- Event detail page updated: Generate Bracket button + View Bracket link
- 17 unit tests + 10 integration tests

**Phase 6 — Match Result Submission**
- Pure validation algorithm in `src/server/algorithms/match-validation.ts`: `validateGameScore`, `validateMatchSubmission`, `WINS_NEEDED`, `MAX_GAMES` constants
  - Rules: 0-0 = unplayed; winner must reach pointTarget with ≥2-point lead; no gaps; no games after match decided
- Match repository: `findMatchById`, `findSubmissionByCode`, `createSubmission` (in `$transaction`), `confirmSubmission` (in `$transaction`)
- Match service: `submitMatchResult` (validates players/scores, creates tentative submission), `confirmMatchResult` (verifies opposing player, re-validates, writes `MatchGame` records, marks COMPLETED, advances winner to next bracket slot)
- Server actions: `submitResultAction`, `confirmResultAction` (both pre-bound via `.bind()`)
- Client components: `SubmitResultForm` (game score table with `useActionState`), `ConfirmResultForm` (confirmation code input)
- Pages: `/matches/[matchId]/submit`, `/matches/[matchId]/pending` (shows code to share), `/matches/[matchId]/confirm`
- Bracket page updated: Submit link on PENDING matches, Confirm link on AWAITING_CONFIRMATION
- Middleware: `/matches(.*)` public
- 17 unit tests + 14 integration tests

**Phase 7 — Rating Integration**
- Wired `applyRatingResult` into `confirmMatchResult`: after `confirmSubmission` succeeds, derives loserId and calls `applyRatingResult(winnerId, loserId, ratingCategoryId, matchId)`
- Added `ratingCategoryId` to `findSubmissionByCode` event select (was missing)
- Integration tests: winner rating > DEFAULT, loser rating < DEFAULT, `gamesPlayed` incremented, transactions linked to matchId, equal-and-opposite delta invariant

**Phase 8 — Polish, Seed Data & Deployment**
- **Responsive header**: `MobileNav` client component — hamburger on mobile (< sm), full nav on sm+; inline SVG icons
- **Fonts**: switched from `next/font/google` to `geist` npm package (eliminates Google Fonts network dependency at build time)
- **Landing page**: hero section with Sign up/Sign in and Browse/Find links for unauthenticated users; "How it works" 5-step workflow section; footer
- **Demo seed data** (added to `prisma/seed.ts`, idempotent):
  - 8 demo players: Alex Chen (s1), Maria Santos (s2), Jake Williams (s3), Priya Patel (s4), Carlos Gomez (s5), Yuki Tanaka (s6), Sam Davies (s7), Mia Johnson (s8)
  - "2026 TTRC Spring Open" tournament under USATT, Open Singles event (BEST_OF_5, first to 11)
  - Full 8-player bracket (7 matches) with correct `nextMatchId` links
  - 4 quarterfinals completed with scores, ratings applied, winners advanced
  - Seed-5 upset: Carlos Gomez beats Priya Patel 3-1
  - Semis pending: SF1 = Alex vs Maria, SF2 = Jake vs Carlos; Final TBD
- **`vercel.json`**: `buildCommand = "prisma generate && next build"`
- **`.env.example`**: documents all required env vars
- **Bug fix**: Zod v4 + @hookform/resolvers type mismatch on `gamePointTarget` field — switched `refine()` to `pipe(z.union([z.literal(11), z.literal(21)]))` + resolver cast in `EventForm`
- Build passes cleanly (`npm run build`); all 16 routes compile

### Architecture Patterns Established

- **Pure algorithm modules** (`elo.ts`, `bracket.ts`, `match-validation.ts`): zero dependencies, fully unit-testable, swappable independently
- **Three-tier service pattern**: Pages → Actions → Services → Repositories → Prisma
- **Two server action patterns**:
  - `useActionState` pattern: action returns `ActionState`, component uses `useActionState` hook
  - Direct form action pattern: action returns `void`, redirects on success, bound via `.bind(null, ...args)`
- **FormData parsing for arrays**: game scores named `games.${i}.player1Points` / `games.${i}.player2Points`
- **Bracket creation order**: matches created final→R1 so `nextMatchId` IDs always exist when earlier rounds are created
- **Vitest for all tests**: unit tests use pure functions only; integration tests hit real DB with stable cleanup in `afterAll`

### Files Created / Modified (Phases 3–8)

**Algorithms**
- `src/server/algorithms/elo.ts`
- `src/server/algorithms/bracket.ts`
- `src/server/algorithms/match-validation.ts`

**Repositories**
- `src/server/repositories/rating.repository.ts`
- `src/server/repositories/tournament.repository.ts`
- `src/server/repositories/bracket.repository.ts`
- `src/server/repositories/match.repository.ts`

**Services**
- `src/server/services/rating.service.ts`
- `src/server/services/tournament.service.ts`
- `src/server/services/bracket.service.ts`
- `src/server/services/match.service.ts`

**Actions**
- `src/server/actions/tournament.actions.ts`
- `src/server/actions/bracket.actions.ts`
- `src/server/actions/match.actions.ts`

**Schemas**
- `src/lib/schemas/tournament.ts`
- `src/lib/schemas/match.ts`

**Components**
- `src/components/layout/MobileNav.tsx`
- `src/components/onboarding/ProfileForm.tsx`
- `src/components/players/PlayerSearchForm.tsx`
- `src/components/tournaments/TournamentForm.tsx`
- `src/components/tournaments/EventForm.tsx`
- `src/components/tournaments/EntrantSearchForm.tsx`
- `src/components/matches/SubmitResultForm.tsx`
- `src/components/matches/ConfirmResultForm.tsx`

**Pages**
- `src/app/page.tsx` (enhanced landing)
- `src/app/layout.tsx` (responsive header, geist font)
- `src/app/onboarding/page.tsx`
- `src/app/profile/[id]/page.tsx`
- `src/app/players/page.tsx`
- `src/app/tournaments/page.tsx`
- `src/app/tournaments/new/page.tsx`
- `src/app/tournaments/[id]/page.tsx`
- `src/app/tournaments/[id]/events/new/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx`
- `src/app/matches/[matchId]/submit/page.tsx`
- `src/app/matches/[matchId]/pending/page.tsx`
- `src/app/matches/[matchId]/confirm/page.tsx`

**Infrastructure**
- `prisma/schema.prisma` (added bracket fields, migration run)
- `prisma/seed.ts` (expanded with full demo data)
- `src/middleware.ts` (public routes: players, profile, tournaments, matches)
- `.env.example`
- `vercel.json`

**Tests**
- `tests/unit/elo.test.ts` — 17 tests
- `tests/unit/bracket.test.ts` — 17 tests
- `tests/unit/match-validation.test.ts` — 17 tests
- `tests/integration/rating.test.ts` — 8 tests
- `tests/integration/tournament.test.ts` — 15 tests
- `tests/integration/bracket.test.ts` — 10 tests
- `tests/integration/match.test.ts` — 16 tests

### Issues Encountered

- **Zod v4 + @hookform/resolvers type mismatch**: `z.coerce.number().refine()` produces `unknown` input type in Zod v4's type system, breaking the `zodResolver` generic constraint. Switched to `pipe(z.union([z.literal(11), z.literal(21)]))` and added a resolver cast in `EventForm`. Runtime behavior was never affected.
- **Google Fonts network dependency at build time**: `next/font/google` tries to fetch Geist from Google Fonts during build, failing in offline environments. Fixed by switching to the `geist` npm package which ships fonts as local files.

### Current State

- **Build status**: `npm run build` passes cleanly. All 16 routes compile.
- **Test status**: 83 total tests — 51 unit, 49 integration (some run sequentially per describe block). All pass against live Neon DB.
- **Demo data**: Seeded and live. 2026 TTRC Spring Open with quarterfinals complete, semis pending.
- **Deployment**: `vercel.json` and `.env.example` in place. Requires `vercel login` + `vercel deploy --prod` from a terminal with browser access, plus Vercel env var configuration (DATABASE_URL, Clerk keys).
- **All 8 phases complete.**

### Next Steps (post-MVP)

- Run `vercel login && vercel deploy --prod` and set environment variables in Vercel dashboard
- After deployment, run `npx prisma db seed` against production DB to populate demo data
- shadcn/ui was never installed — not needed for MVP but could improve form/dialog UX
- Future: doubles events, round-robin format, bracket seeding UI, rating history charts

---

## Session Log — 2026-03-10

### Objective
Establish all project planning documents and complete Phase 1 (Foundation): initialize the Next.js project, configure tooling, implement the full Prisma schema, and create the database seed.

### Work Completed

**Documentation (pre-implementation)**
- Defined project vision and 12-step core demo narrative.
- Documented domain rules: one-account/multi-role system, org-scoped ratings, match verification workflow, per-game scoring, single-elimination MVP bracket.
- Designed modular monolith architecture and layered folder structure.
- Designed the full MVP database schema across 6 entity groups.
- Wrote the 8-phase implementation roadmap.
- Defined MVP acceptance criteria.
- Configured `CLAUDE.md` for AI-assisted development.

**Phase 1 — Foundation**
- Initialized Next.js 16.1.6 project (`rallybase`) with TypeScript and App Router.
- Configured Tailwind CSS v4 with PostCSS.
- Installed and configured Clerk authentication: `@clerk/nextjs` middleware protecting all routes, `ClerkProvider` wrapping the root layout with sign-in/sign-up/user buttons in the header.
- Installed Prisma v5 with `@prisma/client`; configured `DATABASE_URL` connection via `.env`.
- Implemented the full Prisma schema covering all 6 domain groups (see schema details below).
- Ran initial migration (`20260311005925_init`) — database tables created.
- Created `src/lib/prisma.ts` singleton client (dev-mode query logging, global instance to prevent hot-reload leaks).
- Wrote `prisma/seed.ts`: seeds all 4 roles, 2 organizations (USATT, NCTTA), 2 disciplines (Singles each), and 2 rating categories (USATT Singles, NCTTA Singles) using upserts.
- Installed supporting dependencies: `react-hook-form`, `@hookform/resolvers`, `zod`, `tsx` (for seed runner).
- Added npm scripts: `db:migrate`, `db:seed`, `db:studio`.

**Not completed this session**
- shadcn/ui was planned but not installed or configured.

### Files Created / Modified

**Docs**
- `docs/00-project-overview.md` — Project goal and 12-step demo narrative
- `docs/01-domain-rules.md` — Domain rules (roles, rating scoping, match verification, scoring, bracket format)
- `docs/02-architecture.md` — Tech stack, folder structure, and architecture rules
- `docs/03-database-schema.md` — Full schema entity list and key principles
- `docs/04-implementation-plan.md` — 8-phase implementation roadmap
- `docs/05-acceptance-criteria.md` — MVP completion checklist
- `docs/session-log.md` — This file
- `CLAUDE.md` — AI context: tech stack, commands, architecture, domain rules, schema groups, phase order

**Application**
- `package.json` — Project `rallybase`; all Phase 1 dependencies and db scripts
- `next.config.ts` — Next.js config
- `tsconfig.json` — TypeScript config
- `postcss.config.mjs` — PostCSS/Tailwind config
- `src/app/layout.tsx` — Root layout with `ClerkProvider`, auth header (sign-in/sign-up/user buttons)
- `src/app/globals.css` — Global Tailwind styles
- `src/app/page.tsx` — Default home page (Next.js scaffold)
- `src/middleware.ts` — Clerk middleware protecting all non-static routes
- `src/lib/prisma.ts` — Prisma singleton client with dev-mode logging and hot-reload guard
- `prisma/schema.prisma` — Full Prisma schema (13 models, 5 enums)
- `prisma/seed.ts` — Seed script: roles, orgs (USATT, NCTTA), disciplines, rating categories
- `prisma/migrations/20260311005925_init/migration.sql` — Initial migration (all tables)
- `.env` / `.env.local` — Database and Clerk environment variables

### Key Technical Decisions

- **Decision**: App name is `rallybase`.
  - **Reasoning**: Product name chosen during initialization.

- **Decision**: Prisma singleton pattern in `src/lib/prisma.ts` using `globalThis`.
  - **Reasoning**: Prevents Next.js hot-reload from creating multiple PrismaClient instances in development, which exhausts database connection pools.

- **Decision**: `confirmationCode` on `MatchResultSubmission` uses `@default(cuid())` — auto-generated, unique.
  - **Reasoning**: Avoids a separate code-generation step; cuid provides sufficient uniqueness and URL-safety for the confirmation workflow.

- **Decision**: `PlayerRating.rating` defaults to `1500` (standard Elo starting point).
  - **Reasoning**: Conventional Elo baseline; ensures new players start at the same level before any matches are played.

- **Decision**: `MatchGame` and `MatchResultSubmissionGame` are separate tables (not a single shared table).
  - **Reasoning**: Enforces the domain rule that submitted scores and official scores are independent until confirmation. Official scores in `MatchGame` are only written after the submission is confirmed.

- **Decision**: Seed uses `upsert` throughout.
  - **Reasoning**: Makes the seed script idempotent — safe to re-run without duplicating data.

- **Decision**: shadcn/ui deferred.
  - **Reasoning**: Not needed until Phase 2 (Player System) when UI components are first built. Installing it without using it adds noise.

### Issues Encountered

None. All Phase 1 tasks completed without blockers (except shadcn/ui intentionally deferred).

### Current State

- **Build status**: Next.js app initializes. Migration has run. Database schema is live.
- **Working features**:
  - Clerk auth middleware active — all routes protected.
  - Root layout renders with sign-in/sign-up/user buttons.
  - Prisma client configured and connected to Postgres.
  - Seed script populates roles, orgs, disciplines, and rating categories.
- **Incomplete**:
  - shadcn/ui not installed.
  - No player profile, tournament, bracket, match, or rating features yet (Phases 2–8).

### Next Steps

- [ ] Install and configure shadcn/ui (deferred from Phase 1)
- [ ] Phase 2: Player profile creation flow (form + server action/route)
- [ ] Phase 2: Player profile page (display name, bio, ratings)
- [ ] Phase 2: Player search
- [ ] Phase 2: Rating display per org/discipline

### Notes

- The Prisma schema is fully implemented and matches the domain design — no schema changes should be needed to begin Phase 2.
- Consider whether the default home page (`src/app/page.tsx`) should redirect authenticated users to a dashboard or player profile; this can be addressed during Phase 2 polish.
- The confirmation code workflow (cuid auto-generated on submission) means the UX flow is: submit result → system generates code → submitter shares code with opponent → opponent enters code to confirm.
