# Findings

## Critical

None.

## High

### Match confirmation is still non-atomic

Why it matters: two near-simultaneous confirmations can still confirm the same pending submission twice and double-apply rating changes or other downstream state.
Evidence: match.service.ts still does findPendingSubmissionByMatchId() then confirmSubmission() then applyRatingResult() as separate awaits. match.repository.ts updates the submission by id only, with no status = PENDING guard.
Recommended fix: collapse confirm, official score write, winner advancement, and rating application into one transaction, or use a conditional PENDING -> CONFIRMED update and abort if no row changed.
Files involved: match.service.ts, match.repository.ts, review_response_v0.18.4.md

### Concurrent submissions can still create multiple pending results for one match

Why it matters: two players submitting at nearly the same time can leave one match with multiple pending submissions, and every later read path only picks one arbitrarily.
Evidence: match.service.ts checks match status before insert, outside the write transaction. match.repository.ts creates the submission and only then flips the match to AWAITING_CONFIRMATION. match.repository.ts still resolves pending state with findFirst().
Recommended fix: enforce one pending submission per match at the database layer and make the insert conditional on the match still being in a submittable state.
Files involved: match.service.ts, match.repository.ts, review_response_v0.18.4.md

### The pending-result route still exposes tentative scores to any signed-in user

Why it matters: submitted-but-unconfirmed results are still visible to users who are neither match participants nor TDs.
Evidence: pending/page.tsx only requires sign-in, never checks isMatchParticipantOrTD(), and still renders submitted game scores and the submitter name at pending/page.tsx. The release-response doc says this route was fixed, but its own text also admits non-authorized viewers can still view the submitted scores at review_response_v0.18.4.md.
Recommended fix: gate the entire pending page to participants or TDs, not just the confirmation code block.
Files involved: pending/page.tsx, match.service.ts, review_response_v0.18.4.md

## Medium

### The submit route exposes in-progress saved scores and result-entry UI to non-participants

Why it matters: any signed-in user can open another match’s submit screen and see prefilled draft scores for IN_PROGRESS matches.
Evidence: submit/page.tsx only checks sign-in, not participant/TD authorization, and passes match.matchGames into the form at submit/page.tsx. SubmitResultForm.tsx uses those savedScores to prefill the UI.
Recommended fix: require participant-or-TD authorization on the submit page and hide draft scores from unrelated viewers.
Files involved: submit/page.tsx, SubmitResultForm.tsx, middleware.ts

### Tournament-scoped code generation still has a collision race that can surface a 500

Why it matters: simultaneous submissions in the same tournament can still pick the same 4-digit code and one of them will hit the unique constraint at insert time.
Evidence: match.service.ts checks code availability in a loop before insert, but match.repository.ts inserts later with no retry or P2002 handling. The uniqueness is now tournament-scoped at schema.prisma, but the check-and-insert window is still open.
Recommended fix: retry on unique-constraint failure or allocate the code inside the same transaction that inserts the submission.
Files involved: match.service.ts, match.repository.ts, schema.prisma

### The integration suite is flaky, not reliably green

Why it matters: a public repo should have a stable test gate; intermittent timeouts erode trust in CI and mask real regressions.
Evidence: on April 6, 2026, the first npm run test:integration run failed 137/138 with a timeout at group-draw.test.ts; the second full run passed 138/138, but the same test still took 4.46s, which is too close to Vitest’s 5s default.
Recommended fix: raise the timeout for this DB-heavy test, reduce setup cost, or move expensive setup into beforeAll.
Files involved: group-draw.test.ts, review_response_v0.18.4.md

### The new release-response document is materially inaccurate

Why it matters: this file is now part of the repo narrative and would mislead contributors or reviewers about current risk.
Evidence: it says the pending page now requires participant-or-TD authorization at review_response_v0.18.4.md, but the page does not enforce that at pending/page.tsx. It also says “All 138 integration tests pass” at review_response_v0.18.4.md, but the full suite was flaky in review.
Recommended fix: correct the document so it reflects the actual current state, especially for the pending route and test stability.
Files involved: review_response_v0.18.4.md, pending/page.tsx, group-draw.test.ts

### Public-facing docs are still misleading about setup and product behavior

Why it matters: outside contributors will follow the README, not internal notes.
Evidence: README.md still describes score confirmation as “a 4-digit code,” which is no longer universally true. README.md still tells users to run npm run db:migrate, and README.md still presents demo-heavy seeding as normal bootstrap.
Recommended fix: update the README to describe CODE / BIRTH_YEAR / BOTH, document the real migration workflow, and split bootstrap seed from demo seed.
Files involved: README.md, README.md, package.json, seed.ts

### Public repo hygiene is still not ready for external contributors

Why it matters: missing legal and automation basics make a public repo look unfinished and create ambiguity around reuse and contribution.
Evidence: the repo root still has no LICENSE, no .github/workflows, and package.json still says "private": true with version "0.1.0".
Recommended fix: add a license, add CI for lint/build/tests, and align package metadata with the actual release/versioning story.
Files involved: package.json

### next-env.d.ts is tracked even though it imports generated .next types

Why it matters: fresh clones and editor tooling can break or show noise before a build has generated .next.
Evidence: next-env.d.ts imports ./.next/types/routes.d.ts, while .next/ is gitignored.
Recommended fix: stop tracking this file if the workflow relies on generated route types, or ensure the tracked version does not point at a missing generated file.
Files involved: next-env.d.ts, .gitignore

## Low

### Lint and git are still polluted by local Codex artifact directories

Why it matters: contributors can get noisy lint output and accidental untracked-file clutter from local tooling artifacts.
Evidence: npm run lint reported 59 warnings, including duplicates under .codex-gitops/ and .codex-gitops2/. eslint.config.mjs ignores only .next/out/build/next-env.d.ts, and .gitignore does not ignore .codex-gitops* or .agents/.
Recommended fix: ignore local Codex helper directories in both ESLint and git, or keep them outside the repo root.
Files involved: eslint.config.mjs, .gitignore

### The BOTH-mode confirmation UI contradicts the implemented self-confirm rules

Why it matters: the current UX tells users to enter both code and birth year even when the backend intentionally allows self-confirm by birth year alone.
Evidence: match.service.ts skips the code check for self-confirm in BOTH. But confirm/page.tsx tells BOTH-mode users to enter both, and ConfirmResultForm.tsx always renders both fields for BOTH.
Recommended fix: pass viewer/submission context into the page/form and tailor the copy/fields for self-confirm vs opponent-confirm.
Files involved: match.service.ts, confirm/page.tsx, ConfirmResultForm.tsx

### Low-signal polish debt is still visible in the repo and tool output

Why it matters: these are not core blockers, but they still make the project feel less finished in a public review.
Evidence: feature-plans-shortlist.md still starts with a TODO stub, tests/setup.ts still prints dotenv tips on every test file, next build still warns that middleware.ts uses the deprecated middleware convention, and the repo still tracks unused default assets under public/.
Recommended fix: remove placeholder assets/docs, quiet dotenv setup in tests, and migrate from middleware to proxy.
Files involved: feature-plans-shortlist.md, tests/setup.ts, middleware.ts

### The removed form stack is still shipped as dependencies

Why it matters: unused packages increase maintenance surface and confuse contributors about the current form architecture.
Evidence: package.json still includes react-hook-form and @hookform/resolvers, but the current tracked source uses useActionState forms instead.
Recommended fix: remove unused form packages or document why they are intentionally retained.
Files involved: package.json

## Open Questions / Assumptions
I treated BIRTH_YEAR and BOTH self-confirmation as intentional behavior, because the current code, tests, and review_response_v0.18.4.md all frame it as design, not a bug.
I did not build a concurrent-request harness; the two race-condition findings are from current service/repository control flow.
I did not do a manual browser/mobile pass; UI findings are from route guards, rendered branches, and test/tool output.
The first full integration run failed and the second passed; I treated that as flakiness, not a permanently red suite.

## Release Blockers
Non-atomic confirmation still allows double-processing of one result.
Concurrent submit still allows multiple pending submissions for one match.
Pending and submit match routes still expose tentative or draft match data to unrelated signed-in users.
Public release tracking/docs are currently inaccurate about what was actually fixed.

## Nice-to-have Improvements Before Release
Remove local-tooling noise from lint/git by ignoring .codex-gitops* and similar directories.
Quiet dotenv test logging and clean placeholder assets/docs.
Align BOTH-mode confirmation UI with the implemented self-confirm rules.
Remove unused form dependencies.

## Top 10 Priority Fixes
Make match confirmation transactional and idempotent.
Enforce a single pending submission per match at the database layer.
Lock down /matches/[matchId]/pending to participants or TDs only.
Lock down /matches/[matchId]/submit to participants or TDs only.
Add retry-on-unique-collision handling for tournament-scoped confirmation codes.
Fix or de-flake tests/integration/group-draw.test.ts.
Correct docs/review_response_v0.18.4.md so it matches the actual codebase.
Update README for verification modes, migration workflow, and demo seeding.
Add LICENSE, CI workflows, and align package.json metadata.
Clean next-env.d.ts, lint/git ignores, and remaining public-polish debt.