# RallyBase

Tournament management and Elo rating tracking for competitive table tennis.

Live: [rally-base.vercel.app](https://rally-base.vercel.app)

## What it does

- **Tournaments & events** — create tournaments with multiple events, each tied to a rating category
- **Two bracket formats** — single-elimination (seeded bracket) and round-robin (circle-method schedule, standings)
- **Player registration** — self-signup with eligibility rules (min/max rating, min/max age, participant cap); TDs can also add players directly
- **Score submission** — player submits result, opponent confirms with a 4-digit code; no referee needed
- **TD controls** — direct result entry, void & re-record, default wins (no scores, no rating impact)
- **Elo ratings** — update automatically on confirmation, scoped per organization and discipline
- **Player profiles** — rating history chart, match history with per-game scores, tournament participation log

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 |
| Database | PostgreSQL via Prisma v5 (hosted on Neon) |
| Auth | Clerk |
| Testing | Vitest (unit + integration against real DB) |
| Hosting | Vercel |

## Local setup

```bash
git clone https://github.com/MarvinKYu/RallyBase.git
cd RallyBase
npm install
```

Create `.env.local` with:
```
DATABASE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

```bash
npm run db:migrate   # apply Prisma migrations
npm run db:seed      # seed roles, orgs, and demo data
npm run dev          # start dev server at localhost:3000
```

## Commands

```bash
npm run dev                # dev server
npm run build              # production build
npm run lint               # lint
npm run test               # all tests
npm run test:unit          # unit tests only
npm run test:integration   # integration tests (requires live DB)
npm run db:migrate         # run Prisma migrations
npm run db:seed            # seed database
npm run db:studio          # browse DB in Prisma Studio
```

## Architecture

Modular monolith using Next.js App Router.

```
src/
  app/          # routes and pages
  components/   # React UI components
  server/
    actions/    # server actions (form handlers)
    services/   # domain logic
    repositories/ # data access (Prisma)
    algorithms/ # pure functions: Elo, bracket, round-robin, match validation
```

Business logic lives in services. Algorithms are stateless pure functions with no DB access.
