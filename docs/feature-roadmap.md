# Planned Features Roadmap

## v0.18.0 — Fix self-confirmation logic

> Codex: **No** — the BOTH + self-confirm behavior is non-obvious and requires careful restructuring; better owned directly.

Fix `confirmMatchResult()` in `match.service.ts` so the self-confirm block fires before verification-method branching. Resulting rules: `CODE` blocks self-confirm entirely; `BIRTH_YEAR` allows self-confirm (birth year still required); `BOTH` allows self-confirm via birth year only (code check skipped for self-confirmers). Add integration tests for all three verification modes, including self-confirm cases.

---

## v0.18.1 — Restrict confirmation pages to participants and TDs

> Codex: **No** — small and contained; 2 page files + 1 service helper.

`pending/page.tsx`: show confirmation code only to the submitter; any signed-in user can see the scores. `confirm/page.tsx`: require that the viewer is a match participant or is authorized as TD (covers creator, org admin, platform admin). Add `isMatchParticipantOrTD(clerkId, match)` helper in `match.service.ts`.

---

## v0.18.2 — Fix TD authorization across pages and actions

> Codex: **Yes** — mechanical multi-file find-and-replace; 7 locations to replace hardcoded `createdByClerkId` comparisons with `isAuthorizedAsTD()`.

Files: `bracket.actions.ts`, `td-submit/page.tsx`, `tournaments/[id]/edit/page.tsx`, `tournaments/[id]/events/new/page.tsx`, `tournaments/[id]/events/[eventId]/bracket/page.tsx`, `tournaments/[id]/events/[eventId]/edit/page.tsx`, `tournaments/[id]/events/[eventId]/standings/page.tsx`.

---

## v0.18.3 — Scope confirmation codes to tournament

> Codex: **Yes** — well-defined schema migration + targeted service change.

Schema: add `tournamentId String` (denormalized) to `MatchResultSubmission`; replace `@unique` on `confirmationCode` with `@@unique([tournamentId, confirmationCode])`. Service: pass `tournamentId` through `submitMatchResult` → `createSubmission`; retry code generation on collision. Keeps 4-digit numeric format; resets the uniqueness namespace per tournament.

---

## v0.18.4 — Fix broken integration tests

> Codex: **No** — requires context about why tests broke (tournament creation gating via `canCreateTournamentInOrg`); targeted fix is faster to own directly.

`tournament-status.test.ts` and `tournament-edit.test.ts` fail because they call `createTournament` without an authorized user. Fix: give each test suite its own user + org setup that satisfies `canCreateTournamentInOrg`.

---

## v1.0.0 — Public Release

> Plan mode: **No** — polish and audit work; no new schema or cross-service changes. Each sub-item can be tackled incrementally.

Final polish and infrastructure pass before opening to the public.

### Final polish
- Audit all pages for consistency: status tags, empty states, error messages, loading states.
- Review and finalize all copy (labels, tooltips, placeholder text).

### Security check for all user input fields

---

## v1.1.0 — Tournament Templates

> Plan mode: **Yes** — new schema (templates table + event templates), new service functions, and changes to tournament creation flow and UI. Schema design decisions affect the whole feature; upfront plan avoids mid-implementation pivots.

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings).
- Intended for recurring events: monthly tournaments, weekly leagues, etc.

### Load template when creating a tournament
- When creating a new tournament, TD can optionally select a saved template to pre-fill all fields and events.

---

## v1.1.1 — Tournament flow reversal

### Tournament flow reversal
- Give TD option to move from "published" back to "draft" through a "Retract" button

---

## Dependency Notes

- v0.14.0 (RR → SE hybrid) built on v0.13.0 (RR Group Draws): group draw logic is reused in the RR stage of the hybrid format.
- v1.0.0 cron auto-start depends on Vercel Pro plan — can be deferred within the v1.0.0 scope if not yet available, with the rest of v1.0.0 shipping independently.
