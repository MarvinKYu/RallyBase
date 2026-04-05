# Findings

## Critical

### Self-confirmation is still possible for `BIRTH_YEAR` and `BOTH`
- Why it matters: this breaks the core trust model of player-confirmed results and lets a submitter confirm their own match if they know the opponent’s birth year.
- Evidence: `confirmMatchResult()` computes `isSelfConfirm`, but only blocks self-confirm when `verificationMethod === "CODE"`. The code check is skipped for self-confirmers, while the birth-year branch still runs, so `BOTH` and `BIRTH_YEAR` can be self-confirmed. The test suite only covers the default code-based flow.
- Recommended fix: reject `isSelfConfirm` before any verification-method-specific logic, then add integration tests for `CODE`, `BIRTH_YEAR`, and `BOTH`.
- Files involved: [match.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/match.service.ts#L138), [match.test.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/tests/integration/match.test.ts#L97)

### Result confirmation is not atomic and can double-apply ratings under race
- Why it matters: two near-simultaneous confirmations can corrupt ratings, standings, and match history by applying the same result twice.
- Evidence: `confirmMatchResult()` reads the pending submission before any transaction, `confirmSubmission()` updates by submission `id` only, and `applyRatingResult()` runs afterward in a separate step. There is no idempotency guard tying “confirm once” to “rate once.”
- Recommended fix: make confirm + score write + bracket advance + rating update a single transaction, or use a conditional `PENDING -> CONFIRMED` update and abort if no row changed.
- Files involved: [match.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/match.service.ts#L143), [match.repository.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/repositories/match.repository.ts#L142)

## High

### Confirmation codes will eventually fail globally
- Why it matters: the platform only has 10,000 possible codes, and they are globally unique across all submissions, not scoped per match or time window.
- Evidence: `submitMatchResult()` generates a zero-padded 4-digit code; `MatchResultSubmission.confirmationCode` is `@unique`; confirmed submissions are retained. That guarantees future collisions and eventual exhaustion.
- Recommended fix: replace the code with a longer opaque token or scope uniqueness by match plus expiry, and retry safely on collision.
- Files involved: [match.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/match.service.ts#L111), [schema.prisma](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/prisma/schema.prisma#L287)

### Concurrent submissions can create multiple pending submissions for one match
- Why it matters: two players submitting at nearly the same time can leave the match with ambiguous pending state and inconsistent UI behavior.
- Evidence: `submitMatchResult()` checks match status before creation, outside the write transaction. `createSubmission()` inserts the submission and only then flips the match to `AWAITING_CONFIRMATION`. Reads use `findFirst()` and some pages only display the first pending submission.
- Recommended fix: enforce one pending submission per match at the database level and make submission creation conditional on the match still being pending.
- Files involved: [match.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/match.service.ts#L74), [match.repository.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/repositories/match.repository.ts#L64)

### Pending result pages leak private confirmation data to any signed-in user
- Why it matters: any authenticated user who gets a match URL can view another pair’s pending scores, and the pending page also reveals the confirmation code itself.
- Evidence: `/matches(.*)` is public in middleware. The pending and confirm pages only require sign-in, then call `getMatchWithSubmission()` with no participant/TD authorization. The pending page renders `submission.confirmationCode`; both pages render submitted game scores.
- Recommended fix: require participant-or-TD authorization for pending/confirm pages and only show the code to the original submitter.
- Files involved: [middleware.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/middleware.ts#L4), [pending/page.tsx](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/app/matches/%5BmatchId%5D/pending/page.tsx#L12), [confirm/page.tsx](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/app/matches/%5BmatchId%5D/confirm/page.tsx#L13)

### TD authorization is inconsistent across services, pages, and actions
- Why it matters: documented org-admin/platform-admin rights are not honored consistently, which creates broken admin UX and split-brain permission logic.
- Evidence: `isAuthorizedAsTD()` explicitly allows creator, platform admin, and org admin, and `tournament.service.ts` uses it. But several routes/actions still hard-code `createdByClerkId === userId`, including bracket generation, TD submit, tournament edit, event create/edit, and TD UI flags on bracket/standings pages.
- Recommended fix: centralize all TD gating behind one shared helper and add role-parity tests for creator, org admin, and platform admin.
- Files involved: [admin.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/admin.service.ts#L48), [tournament.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/tournament.service.ts#L96), [bracket.actions.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/actions/bracket.actions.ts#L23), [td-submit/page.tsx](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/app/matches/%5BmatchId%5D/td-submit/page.tsx#L25)

### The integration suite is currently broken around tournament lifecycle flows
- Why it matters: a public release should not ship while core create/edit/status regression tests are already failing.
- Evidence: `npm run test:integration` fails in `tournament-status.test.ts` and `tournament-edit.test.ts`. Those tests rely on `organization.findFirst()` and then call `createTournament()`, but tournament creation now gates on `canCreateTournamentInOrg()`, so `tournamentId` remains `undefined` and later Prisma calls explode.
- Recommended fix: make those tests create their own authorized org/user setup explicitly and require the full integration suite to pass before release.
- Files involved: [tournament-status.test.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/tests/integration/tournament-status.test.ts#L42), [tournament-edit.test.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/tests/integration/tournament-edit.test.ts#L40), [tournament.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/tournament.service.ts#L127)

## Medium

### In-progress saved scores are publicly readable before confirmation
- Why it matters: draft match progress is being treated like public match data even though it is not final.
- Evidence: `/matches(.*)` is public, and the match page renders `Saved scores` whenever `match.status === "IN_PROGRESS"` and `match.matchGames` exist. Those saved scores are persisted by `saveMatchProgressScores()`.
- Recommended fix: keep in-progress scores private to participants/TDs, or separate drafts from publicly visible official match games.
- Files involved: [middleware.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/middleware.ts#L4), [match/page.tsx](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/app/matches/%5BmatchId%5D/page.tsx#L41), [match.repository.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/repositories/match.repository.ts#L116)

### Public setup docs tell contributors to run a migration flow that is known to be brittle
- Why it matters: outside contributors will hit avoidable setup failures immediately.
- Evidence: the README instructs `npm run db:migrate`; `package.json` maps that to `prisma migrate dev`. The repo’s own guidance says the non-interactive workflow requires manual SQL application instead.
- Recommended fix: document the real migration workflow and separate “local dev bootstrap” from “schema authoring” instructions.
- Files involved: [README.md](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/README.md#L43), [package.json](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/package.json#L10)

### Public repo metadata is not release-ready
- Why it matters: public visibility without licensing, CI, or aligned metadata looks unfinished and creates legal/contributor ambiguity.
- Evidence: there is no `LICENSE` file, no `.github/workflows`, and `package.json` still says `"private": true` and version `"0.1.0"` despite the project being presented as a live public product.
- Recommended fix: add a license, add basic CI for lint/build/tests, and align repo/package metadata with the actual release state.
- Files involved: [package.json](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/package.json#L3)

### The default seed path injects demo tournament data into any environment
- Why it matters: the README presents `db:seed` as normal setup, but the seed script creates fake demo players, a demo tournament, a bracket, and completed match results.
- Evidence: the README tells users to run `npm run db:seed`; `prisma/seed.ts` creates `demo_player_*` accounts and a published tournament with seeded bracket data and completed quarterfinals.
- Recommended fix: split bootstrap seed from demo seed, or make demo data opt-in with a separate command.
- Files involved: [README.md](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/README.md#L44), [seed.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/prisma/seed.ts#L219)

### Critical verification and concurrency paths have no coverage
- Why it matters: the highest-risk areas in result handling are the least tested.
- Evidence: `tests/integration/match.test.ts` exercises the default code-confirmation happy path and some validation failures, but there are no tests for `BIRTH_YEAR`, `BOTH`, concurrent submit/confirm attempts, or idempotent repeat confirmation.
- Recommended fix: add integration tests that explicitly cover every verification mode and race-sensitive flow.
- Files involved: [match.test.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/tests/integration/match.test.ts#L97), [match.service.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/server/services/match.service.ts#L74)

## Low

###  Public-facing repo polish still shows unfinished artifacts and noisy tooling
- Why it matters: these are not functional blockers, but they make the repository feel unpolished on first inspection.
- Evidence: `docs/feature-plans-shortlist.md` still starts with a TODO stub; default Next SVG assets in `public/` are unused; `tests/setup.ts` prints dotenv tips for every test file; `npm run build` warns that the `middleware` file convention is deprecated.
- Recommended fix: delete boilerplate assets/docs, quiet dotenv loading in tests, and migrate away from the deprecated middleware entrypoint.
- Files involved: [feature-plans-shortlist.md](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/docs/feature-plans-shortlist.md#L1), [tests/setup.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/tests/setup.ts#L1), [middleware.ts](C:/Users/marvi/Documents/Personal/TTRC_Project/project_root/src/middleware.ts#L1)

## Open Questions / Assumptions
- I did not do a browser-based manual UI/mobile pass; UI findings here are from code paths, route guards, and rendered states.
- I did not perform an external CVE audit of dependencies because network access was restricted; dependency comments are limited to what is clearly visible in the repo.
- The race-condition findings are from code-path analysis, not a reproduced concurrent request harness.
- I assumed the checked-in Prisma schema matches the deployed database shape.

## Release Blockers
- Self-confirmation bypass for `BIRTH_YEAR` and `BOTH`.
- Non-atomic confirmation flow that can double-apply ratings.
- 4-digit globally unique confirmation codes.
- Multiple pending submissions possible under concurrent submit.
- Pending/confirm pages exposing confirmation codes and pending scores to any signed-in user.
- Broken tournament lifecycle integration tests.
- Inconsistent TD authorization if org-admin/platform-admin behavior is part of the public release promise.

## Nice-to-have Improvements Before Release
- Split demo seed data from baseline bootstrap data.
- Add `LICENSE`, CI, and align public repo/package metadata.
- Remove placeholder docs/assets and quiet test logging.
- Migrate away from the deprecated `middleware` convention.

## Top 10 Priority Fixes
1. Block self-confirmation before verification-method branching.
2. Make result confirmation transactional and idempotent.
3. Replace 4-digit codes with longer scoped tokens.
4. Enforce a single pending submission per match at the database layer.
5. Restrict pending/confirm/in-progress match views to participants or TDs.
6. Replace creator-only page/action checks with `isAuthorizedAsTD()` everywhere.
7. Repair the failing tournament integration tests and make them self-contained.
8. Add test coverage for `BIRTH_YEAR`, `BOTH`, duplicate confirm, and concurrent submit/confirm.
9. Fix README setup/migration instructions and separate demo seeding from normal setup.
10. Add license/CI and align repo metadata with the actual public product state.

## Final Readiness Verdict
Not ready for public release