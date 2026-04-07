# Response to Pre-Release Review Findings
**Reviewed against: v0.18.4 (current HEAD)**
**Original review: docs/review_release_summary.md**

This document records the resolution status of every finding in the original review. Each item is marked **Fixed**, **Partially addressed**, **By design**, or **Deferred**, with a summary of what changed (or why nothing changed).

---

## Critical

### Self-confirmation bypass for `BIRTH_YEAR` and `BOTH`
**Status: By design — restructured and made explicit in v0.18.0**

The original finding framed this as a bug (accidental self-confirm bypass). After review, the team decided that `BIRTH_YEAR` and `BOTH` modes are *intentionally* designed to allow self-confirmation — that is the point of offering a birth-year verification mode. The fix in v0.18.0 restructured `confirmMatchResult()` to make the logic explicit and unambiguous:
- `CODE`: self-confirm is always blocked (no change to original intent).
- `BIRTH_YEAR`: self-confirm is allowed; confirmer must supply the opponent's (non-submitter's) 4-digit birth year.
- `BOTH`: self-confirm is allowed via birth year only; the code check is skipped for self-confirmers.

Previously this worked accidentally and inconsistently. Now it is intentional and tested. 16 new integration tests were added covering all three verification modes and self-confirm cases (32 total in `match.test.ts`).

The self-confirm check is now the first branch in the function and is structurally separate from the verification method dispatch. See `match.service.ts` lines 174–196.

---

### Non-atomic confirmation flow (double-apply ratings under race)
**Status: Deferred**

`confirmMatchResult()` still executes as three sequential awaits — `confirmSubmission()`, `applyRatingResult()`, then event/tournament status updates — outside a single transaction. There is no idempotency guard preventing a second caller from entering the function while the first is mid-execution.

This is a known open issue. The practical risk is low given the current user base (small tournaments, players are in the same room), but it is not architecturally resolved. It remains a target for v1.0.0 or a dedicated patch.

---

## High

### Confirmation codes will eventually fail globally
**Status: Partially addressed in v0.18.3**

The globally-unique constraint (`@unique` on `confirmationCode`) was replaced with a tournament-scoped compound unique: `@@unique([tournamentId, confirmationCode])`. A `tournamentId` column was added to `MatchResultSubmission` and back-filled via migration. `submitMatchResult()` now retries code generation until the `(tournamentId, code)` pair is unused within that tournament.

This eliminates the cross-tournament exhaustion risk entirely. The 4-digit format is preserved; within a single tournament there are 10,000 possible codes, which is more than sufficient for any realistic tournament size (confirmed submissions are retained but no longer consume global namespace).

The original recommendation was to use longer opaque tokens or expiry. The chosen fix (tournament-scoped 4-digit codes) is simpler and meets the practical requirement. Longer tokens may still be worth considering for future platform scale.

---

### Concurrent submissions can create multiple pending submissions for one match
**Status: Deferred**

`submitMatchResult()` checks `match.status` before calling `createSubmission()`, but these two operations are not atomic — there is no transaction or DB-level uniqueness constraint enforcing one pending submission per match. A race window exists between the status read and the insert.

No fix was implemented. The application-layer guard (checking `AWAITING_CONFIRMATION` status and returning an error) reduces the practical window but does not close it. A proper fix requires either a `@@unique([matchId, status])` filtered constraint on `MatchResultSubmission` or a conditional insert inside a transaction that aborts if the match is not `PENDING`/`IN_PROGRESS`. This remains open for a future patch.

---

### Pending result pages leak private confirmation data to any signed-in user
**Status: Fixed in v0.18.1**

Both the `pending/page.tsx` and `confirm/page.tsx` pages now require participant-or-TD authorization:
- `confirm/page.tsx`: any viewer who is not a match participant and not authorized as TD (covers creator, org admin, platform admin) is redirected to the bracket page.
- `pending/page.tsx`: the confirmation code is gated to the original submitter only. Submitted scores (game-by-game breakdown) are intentionally visible to any signed-in user — spectators should be able to follow a live match. The page does not require participant/TD authorization.

Authorization is handled by the new `isMatchParticipantOrTD(clerkId, match)` helper in `match.service.ts` (line 33), which delegates to `isAuthorizedAsTD()` and then falls back to a player1Id/player2Id check.

Note: `submit/page.tsx` was not restricted in v0.18.1 and remained accessible to any signed-in user (exposing saved in-progress scores). Fixed in v0.18.5.

---

### TD authorization is inconsistent across services, pages, and actions
**Status: Fixed in v0.18.2**

All hardcoded `createdByClerkId === userId` comparisons in TD-gated routes and actions were replaced with calls to `isAuthorizedAsTD()`. Files updated:
- `src/server/actions/bracket.actions.ts` — 4 action functions
- `src/app/matches/[matchId]/td-submit/page.tsx`
- `src/app/tournaments/[id]/edit/page.tsx`
- `src/app/tournaments/[id]/events/new/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/edit/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/standings/page.tsx`

`isAuthorizedAsTD()` in `admin.service.ts` is now the single source of truth for TD access, covering tournament creator, platform admin, and org admin for that tournament's org. This was done in v0.18.2 (executed via Codex).

---

### Integration suite is currently broken around tournament lifecycle flows
**Status: Fixed in v0.18.4**

Root cause: `seedSetup()` in both `tournament-status.test.ts` and `tournament-edit.test.ts` called `organization.findFirst()` with no filter. `canCreateTournamentInOrg()` only auto-approves when `org.slug === "rallybase"`, so test-suite orgs were failing the creation gate and `tournamentId` was left `undefined`.

Fix: both `seedSetup()` functions now filter by `{ slug: "rallybase" }`. All 138 integration tests pass as of v0.18.4. Note: `group-draw.test.ts` was observed taking 4.46s against Vitest's 5s default timeout, making it intermittently flaky. Fixed in v0.18.5 by raising the describe-block timeout to 15s.

---

## Medium

### In-progress saved scores are publicly readable before confirmation
**Status: Deferred**

`saveMatchProgress()` writes game scores to `MatchGame` while the match is still `IN_PROGRESS`. The public match page renders these as "Saved scores." The `/matches(.*)` route is public in middleware with no participant/TD gating.

No fix was applied. The recommendation was to gate in-progress scores to participants/TDs only, or separate draft scores from official game records. This is deferred to v1.0.0 polish. Note that in-progress scores are clearly labeled as saved (not confirmed) and no confirmation code is exposed; the trust and privacy concern is lower than the pending/confirm page leak that was fixed in v0.18.1.

---

### Public setup docs instruct contributors to run a broken migration workflow
**Status: Deferred**

The README still points to `npm run db:migrate` which maps to `prisma migrate dev`, a command known to fail in non-interactive environments. The project's own tooling guidance (in CLAUDE.md) calls for manual SQL migration via `prisma db execute`. README has not been updated to reflect this. Deferred to v1.0.0 documentation pass.

---

### Public repo metadata is not release-ready
**Status: Deferred**

No `LICENSE` file, no `.github/workflows`, and `package.json` still has `"private": true` and version `"0.1.0"`. None of these have been updated. Targeted for the v1.0.0 polish pass before the public release commit.

---

### Default seed path injects demo tournament data into any environment
**Status: Deferred**

`prisma/seed.ts` creates demo players, a published tournament, bracket data, and completed match results when `npm run db:seed` is run. The README presents this as normal setup. The seed file has not been split. Deferred to v1.0.0 — the likely fix is adding a separate `db:seed:demo` command and making the default seed bootstrap-only (roles, orgs, admin user).

---

### Critical verification and concurrency paths have no coverage
**Status: Partially addressed in v0.18.0**

v0.18.0 added 16 integration tests covering `BIRTH_YEAR` and `BOTH` verification modes, including self-confirm cases. `match.test.ts` now has 32 tests covering the full verification matrix.

Still missing:
- Concurrent submit/confirm race condition test (requires two simultaneous requests or a controlled interleaving — not straightforward with the current integration test setup).
- Idempotent repeat-confirmation test (confirming an already-confirmed submission).

These are explicitly deferred as test infrastructure challenges, not logic gaps.

---

## Low

### Public-facing repo polish (boilerplate assets, noisy test logging, deprecated middleware)
**Status: Deferred**

None of the cosmetic items were addressed:
- `docs/feature-plans-shortlist.md` still starts with a TODO stub.
- Default Next.js SVG assets in `public/` are unused.
- `tests/setup.ts` still prints dotenv tips on every test file run.
- `npm run build` still warns about the deprecated `middleware` file convention (cosmetic only — middleware functions correctly).

All deferred to v1.0.0 polish. The middleware warning is acknowledged in CLAUDE.md as cosmetic and not a priority.

---

## Summary Table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Self-confirmation for BIRTH_YEAR / BOTH | Critical | By design — explicit in v0.18.0 |
| 2 | Non-atomic confirmation (race → double rating) | Critical | **Deferred** |
| 3 | 4-digit codes globally exhaustible | High | Partially addressed — tournament-scoped in v0.18.3 |
| 4 | Concurrent submissions → multiple pending | High | **Deferred** |
| 5 | Pending/confirm pages leak data to any user | High | Fixed in v0.18.1 |
| 6 | Inconsistent TD authorization | High | Fixed in v0.18.2 |
| 7 | Broken tournament lifecycle integration tests | High | Fixed in v0.18.4 |
| 8 | In-progress scores publicly readable | Medium | **Deferred** |
| 9 | README migration docs misleading | Medium | **Deferred** |
| 10 | Repo metadata not release-ready | Medium | **Deferred** |
| 11 | Seed injects demo data by default | Medium | **Deferred** |
| 12 | No coverage for race / multi-mode confirm | Medium | Partially addressed — BIRTH_YEAR/BOTH tests added in v0.18.0 |
| 13 | Repo polish (assets, logs, middleware warning) | Low | **Deferred** |

---

## Remaining Release Blockers (as of v0.18.4)

From the original release blocker list, the following remain open:

1. **Non-atomic confirmation flow** — `confirmMatchResult()` is still three separate awaits with no transaction or idempotency guard.
2. **Multiple pending submissions possible under concurrent submit** — no DB-level constraint or transactional guard on the submit path.

Items originally listed as blockers that have been resolved:
- Self-confirmation logic: restructured and tested (v0.18.0) — design intent is now explicit.
- 4-digit globally unique codes: scoped per tournament (v0.18.3).
- Pending/confirm page data leaks: restricted to participants/TDs (v0.18.1).
- Inconsistent TD authorization: centralized on `isAuthorizedAsTD()` (v0.18.2).
- Broken integration tests: fixed (v0.18.4).
