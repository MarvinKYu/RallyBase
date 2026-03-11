# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in the **documentation/planning phase**. No source code exists yet. The next step is Phase 1 (Foundation): initialize the Next.js project and build out from there.

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **Validation**: Zod + React Hook Form
- **Hosting**: Vercel

## Commands

Once the project is initialized, the standard Next.js commands apply:

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Lint
npx prisma migrate dev   # Run DB migrations
npx prisma db seed       # Seed database
npx prisma studio        # Browse DB
```

## Architecture

**Modular monolith** using Next.js App Router.

```
src/
  app/              # Next.js routes and pages
  components/       # React UI components
  lib/              # Utilities and helpers
  server/
    services/       # Domain logic (business rules live here)
    repositories/   # Data access layer (Prisma queries)
    algorithms/     # Reusable algorithms (e.g., Elo rating)
```

**Critical rule**: Business logic must NOT live in page components. Pages call services; services call repositories.

## Domain Rules

- **One account per person**, with multiple roles: `PLAYER`, `TOURNAMENT_DIRECTOR`, `ORG_ADMIN`, `PLATFORM_ADMIN`
- **Ratings are scoped** by `(player, organization, discipline)` — ratings across orgs are completely isolated
- **Two rating structures**: a mutable current snapshot (`player_ratings`) and an immutable transaction ledger (`rating_transactions`)
- **Match results are pending** until the opponent confirms via a confirmation code
- **Store per-game point scores** (not just game win counts) in `match_games`
- **MVP bracket format**: single-elimination only

## Database Schema Groups

- Identity: `users`, `player_profiles`, `roles`, `user_roles`
- Organizations: `organizations`, `disciplines`, `rating_categories`
- Ratings: `player_ratings`, `rating_transactions`
- Tournaments: `tournaments`, `events`, `event_entries`, `tournament_tables`
- Matches: `matches`, `match_games`
- Result Submission: `match_result_submissions`, `match_result_submission_games`

Submitted scores are separate from official scores. Official scores only exist in `match_games` after confirmation.

## Implementation Phases

See `docs/04-implementation-plan.md` for the 8-phase roadmap. Complete phases in order — each builds on the previous.
