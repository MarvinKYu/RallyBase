# Changelog

All notable changes to RallyBase are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.1.5] - 2026-04-20

### Fixed
- **BYE matches and default wins/losses appearing in player match history** — `findCompletedMatchesByPlayerId` now filters out structural BYE matches (`player2Id = null`) and default matches (`isDefault = true`) so only real, scored matches appear in a player's history.
- **No opponent rating in match history** — added an "Opp. Rating" column showing the opponent's rating at the time of the match (`ratingBefore` from their rating transaction). `findCompletedMatchesByPlayerId` now returns both players' transactions per match instead of only the queried player's.

---

## [1.1.4] - 2026-04-15

### Fixed
- **Back nav on bracket/standings page linked to event detail after generating from manage event** — `generateBracketAction` now appends `?from=manage` to its success redirect so the back button on the bracket/standings page correctly links to the manage event page.
- **TD "Enter result" link on bracket page lost manage-event back nav context** — the link now passes `?returnTo=/manage` when the bracket page was opened from manage event, so the back button on the td-submit page links directly to the manage event page instead of the plain bracket page.
- **Placeholder bracket for RR→SE events missing 3rd/4th place card** — when `hasThirdPlaceMatch` is enabled and the SE bracket has not yet been generated, a `PlaceholderFinalAndThirdColumn` is now rendered beneath the Final placeholder, matching the layout of the real bracket.

---

## [1.1.3] - 2026-04-15

### Fixed
- **Confusing /pending page shown after submitting results for BIRTH_YEAR tournaments** — `submitResultAction` now redirects directly to `/matches/[id]/confirm` when the tournament's verification method is `BIRTH_YEAR`, skipping the `/pending` page that displayed an irrelevant confirmation code. `CODE` and `BOTH` verification methods continue to redirect to `/pending` as before.

---

## [1.1.2] - 2026-04-15

### Fixed
- **"Include 3rd/4th place match" checkbox always saved as false** — `formData.get()` returns the first value for a given name; the hidden `value="false"` input always preceded the checkbox, so the checked state was never read. Both `createEventAction` and `updateEventAction` now use `formData.getAll("hasThirdPlaceMatch").includes("true")`.

---

## [1.1.1] - 2026-04-15

### Fixed
- **Group standings page unusable on mobile** — the multi-group layout now shows one group at a time on mobile with a `‹ Group N ›` navigation bar between the page header and the group card. Desktop retains the full grid view. No behavior changes on desktop.

---

## [1.1.0] - 2026-04-15

### Added
- **3rd/4th place match** — SE and RR→SE events can now include a 3rd/4th place match. TDs opt in via a checkbox on the create/edit event form (requires ≥ 4 players). SF losers are automatically routed to the match as semifinals complete. Voiding an SF clears the loser slot. The match is displayed in the bracket below the Final (small brackets) or extending the stacked center column (large brackets), with inline round labels "Final" and "3rd/4th Place". Match history lists, the TD manage view, event detail, and tournament detail all show the match in a dedicated "3rd/4th Place" section. The event podium now includes the 3rd-place finisher. Events only auto-complete when the 3rd/4th match is also finished.

---

## [1.0.9] - 2026-04-15

### Fixed
- **Bracket/schedule not updated when entrant added before matches start** — adding a player (single or bulk) to an event that already has a generated bracket/schedule but no played matches now automatically wipes the stale schedule and regenerates it with the updated player pool. Mirrors the same auto-regen behavior that was added to player removal in v1.0.7.

---

## [1.0.8] - 2026-04-14

### Fixed
- **Rating graph shows voided match data** — voiding a match now deletes its `RatingTransaction` rows instead of orphaning them (setting `matchId = null`). The same change applies to the tournament and event delete paths. Rating history queries also gained a `matchId IS NOT NULL` filter as a bridge for any orphaned rows already in the database. Run `DELETE FROM "RatingTransaction" WHERE "matchId" IS NULL` on the production DB to remove pre-existing orphaned rows.

---

## [1.0.7] - 2026-04-14

### Fixed
- **Player removal error display** — attempting to remove a player when removal is blocked now shows a readable error banner on the Manage Entrants page instead of crashing to the generic "Something went wrong" screen.
- **SE removal always blocked after bracket generation** — `countProgressedMatches` previously counted structural bye matches (created as COMPLETED when bracket sizes are not a power of 2) as progressed results. Byes are now excluded from the count, so removal correctly becomes unblocked when no real matches have been played.
- **Orphaned matches after player removal** — removing a player now deletes all existing matches for the event and re-generates the bracket/schedule with the updated player pool, instead of leaving stale matches visible and submittable. Removal is blocked if the remaining player count would fall below the format minimum (≥ 2 for SE, ≥ 3 for RR/RR→SE).

---

## [1.0.6] - 2026-04-13

### Added
- **Sort controls for entered players** — the "Entrants" panel on the Manage Entrants page now has Name (A→Z / Z→A) and Rating (↑ / ↓) sort buttons. Unrated players always sort to the end when sorting by rating. Sort state is client-side and resets on page refresh.

---

## [1.0.5] - 2026-04-13

### Fixed
- **Cross-page entrant selection** — selecting players across multiple pages of the add-entrant search and then clicking "Add" now correctly submits all selected players, not just those visible on the current page. Root cause: the form relied on checked checkboxes (DOM-only) for submission; those from previous pages weren't in the DOM. Fixed by using hidden inputs for all selections.

---

## [1.0.4] - 2026-04-13

### Added
- **Per-stage match formats for RR→SE events** — TDs can now set independent match formats and point targets for the RR stage and SE stage of Round Robin → Single Elimination events. The event creation and edit forms show two rows of dropdowns ("RR match format" / "RR points per game" and "SE match format" / "SE points per game") when the RR→SE format is selected; single-format events are unchanged. Match submission and TD score-entry pages display and enforce the correct format for the current stage.

---

## [1.0.3] - 2026-04-10

### Fixed
- **Unrated players missing from search** — players with no ratings were excluded from public player search (`/players`) when an org or discipline filter was active. Now completely-unrated players are included and sorted to the end of results.
- **Unrated players interleaved in name sort** — `sortPlayerProfiles` now always pushes unrated players to the end regardless of sort field (rating, lastName, firstName). Within the unrated group, players are sorted alphabetically by last name.
- **Admin player list label** — players with 0 ratings now show "Unrated" instead of "0 ratings" in the admin player list.

---

## [1.0.2] - 2026-04-10

### Added
- **Org admin: Manage Players button** — org admins now see a "Manage Players" button on the admin dashboard (previously platform admin only). They can search all players and edit/add ratings for disciplines within their managed org(s).
- **Org admin: Tournaments button** — org admins see a "Tournaments" button on the admin dashboard that links to a scoped view showing only tournaments from their managed org(s).
- **Rating read-only view for out-of-scope orgs** — on the player detail admin page, org admins see ratings for disciplines outside their managed orgs as read-only (value displayed, no edit form). Platform admins retain full edit access to all ratings.

---

## [1.0.1] - 2026-04-08

### Fixed
- **Sign-in / sign-up buttons broken** — Termly's `autoBlock=on` mode was automatically blocking Clerk's UI bundle, preventing auth from initializing. Removed `?autoBlock=on` from the Termly script URL; auto-blocking is disabled until Clerk is whitelisted in the Termly dashboard.

---

## [1.0.0] - 2026-04-07

### Added
- **Root 404 page** — `src/app/not-found.tsx` renders a friendly "Page not found" message with a Go Home link instead of falling through to the global error boundary.

### Fixed
- **COMPLETED status badge** — was visually identical to DRAFT (grey) across all badge maps. Now renders teal (`bg-teal-950/60 border-teal-800 text-teal-300`) so completed tournaments and events are clearly distinguishable from draft/unpublished ones.
- **Eligibility rules hidden from signed-out users** — min/max rating, age, and gender restrictions on the event detail page are now always visible, not gated behind a sign-in check.
- **Event status label casing** — event manage page was displaying raw uppercased labels ("REGISTRATION OPEN", "IN PROGRESS") instead of the title-case labels used elsewhere ("Registration Open", "In Progress").
- **Templates placeholder copy** — updated version reference from v0.16.0 to v1.1.0.

---

## [0.21.2] - 2026-04-07

### Added
- **Right-to-erasure (GDPR/CCPA)** — self-service account deletion via the Edit Profile page. On confirmation, PII fields (`displayName`, `bio`, `gender`, `birthDate`) are nulled/replaced with "Deleted User", `isDeleted` and `deletedAt` are set on `PlayerProfile`, and the Clerk auth record is deleted. Match history and ratings are retained anonymized.
- **Active-tournament guard** — deletion is blocked with a clear error if the player has any `EventEntry` in an `IN_PROGRESS` tournament.
- **Deleted profile page** — navigating to a deleted player's public profile shows "This account has been deleted." instead of the full profile.
- **Search exclusion** — deleted profiles are excluded from all player search results (`isDeleted: false` filter in `searchProfiles`).
- **`PlayerProfile` schema** — added `isDeleted Boolean @default(false)` and `deletedAt DateTime?` fields; migration `v0.21.2_delete_account.sql` applied.

---

## [0.21.1] - 2026-04-07

### Added
- **Terms of Use page** — `/terms` with 13 sections covering eligibility, account rules, acceptable use, TD responsibilities, ratings disclaimer, IP, third-party services, warranty disclaimer, liability cap, termination, and governing law (New Jersey).
- **Terms of Use footer link** — added to site footer alongside Privacy Policy and Cookie Policy.

---

## [0.21.0] - 2026-04-07

### Added
- **Privacy Policy page** — `/privacy` with full Termly-generated policy (13 sections), covering data collection, use, sharing, and US resident rights including a DSAR link for deletion requests.
- **Cookie Policy page** — `/cookies` with categorized cookie inventory: essential (Cloudflare `__cf_bm`), performance (`_cfuvid`), and unclassified Clerk cookies.
- **Termly consent banner** — Termly resource-blocker script injected into `<head>` via `next/script` with `strategy="beforeInteractive"`. Supports auto-blocking of non-essential cookies.
- **Site footer** — added to root layout with links to Privacy Policy, Cookie Policy, and a Consent Preferences toggle (Termly `termly-display-preferences` class).

---

## [0.20.0] - 2026-04-07

### Added
- **Global error boundary** — `src/app/error.tsx` catches unhandled route errors and shows a generic "Something went wrong" message with a Go Home link instead of a raw stack trace.
- **Database indexes** — 9 new indexes applied via migration (`prisma/migrations/manual/v0.20.0_indexes.sql`): `Match(eventId)`, `Match(eventId, status)`, `Match(player1Id)`, `Match(player2Id)`, `EventEntry(playerProfileId)`, `RatingTransaction(playerProfileId)`, `RatingTransaction(matchId)`, `MatchResultSubmission(matchId)`, `Tournament(createdByClerkId)`. PostgreSQL does not auto-index FK columns; these cover the hottest query paths.
- **Vercel Analytics + Speed Insights** — `@vercel/analytics` and `@vercel/speed-insights` added to root layout. Custom `tournament_start` event tracked (with `event_format` property) when a TD generates a bracket/schedule.
- **Capacity planning doc** — `docs/capacity-planning.md` documents current Vercel Hobby and Neon free tier limits, usage estimates, and upgrade triggers.

---

## [0.19.0] - 2026-04-06

### Security
- **Rate limiting on confirmation and result submission** — added `@upstash/ratelimit` + `@upstash/redis`. `confirmResultAction` is limited to 10 attempts per 10 minutes per player (prevents brute-forcing 4-digit confirmation codes). `submitResultAction` is limited to 30 attempts per minute per player.
- **Input validation on confirm action** — `confirmResultSchema` (which validates a 4-digit `confirmationCode` and optional 4-digit `birthYear`) is now applied via `safeParse()` in `confirmResultAction` before reaching the service layer. Previously the schema existed but was unused in the action.
- **Server action payload size cap** — explicit `serverActions.bodySizeLimit: "1mb"` added to `next.config.ts` (matches Next.js default but is now enforced explicitly).
- **Row-level security enabled** — RLS enabled on `PlayerProfile`, `PlayerRating`, `RatingTransaction`, `MatchResultSubmission`, `EventEntry`, and `Match` tables. The app DB user (`neondb_owner`) is the table owner and bypasses RLS by default; the framework is in place for future restrictive policies (e.g. a read-only analytics role).
- **Secrets audit** — confirmed no hardcoded secrets in source, `.env` gitignored, no `process.env` references in client-side components, all sensitive keys server-side only.
- **CORS audit** — no custom API routes exist; Next.js App Router same-origin default applies.
- **IDOR audit** — `isAuthorizedAsTD`, `isMatchParticipantOrTD`, and `isPlatformAdmin` chain confirmed to cover all mutation paths.

---

## [0.18.7] - 2026-04-06

### Fixed
- **BOTH verification mode uses OR logic for non-self-confirmers** — previously required both code AND birth year. Now either is sufficient (code OR birth year). Self-confirm via birth year only is unchanged.
- **Confirm page UI reflects verification method and self-confirm status** — `confirm/page.tsx` computes `isSelfConfirm` and passes it to `ConfirmResultForm`. For BOTH non-self-confirm: heading says "code or birth year"; both fields shown. For BOTH self-confirm: heading says "birth year only"; code field hidden. Removes UI confusion where both fields appeared for self-confirmers even though the code was skipped.

### Tests
- Updated BOTH non-self-confirm test cases from old AND-required semantics to new OR semantics.

---

## [0.18.6] - 2026-04-06

### Fixed
- **Concurrent submission race closed** — `createSubmission` in `match.repository.ts` replaced the unconditional match status update with `updateMany WHERE status IN (PENDING, IN_PROGRESS)`. If the updated count is 0 (another submission already moved the match out of that state), a `MATCH_ALREADY_SUBMITTED` sentinel is thrown, rolling back the entire transaction including the newly-created submission row.
- **Double-confirmation race closed** — `confirmSubmission` in `match.repository.ts` replaced the unconditional submission update with `updateMany WHERE status = PENDING`. If count is 0 (another confirm already ran), an `ALREADY_CONFIRMED` sentinel is thrown, rolling back the transaction and preventing `applyRatingResult` from running twice.

---

## [0.18.5] - 2026-04-06

### Fixed
- **Submit page restricted to participants and TDs** — `submit/page.tsx` now redirects non-participants and non-TDs to `/pending` instead of rendering the submission form.
- **Pending page redirect loop fixed** — the no-submission redirect changed from `/submit` to the event bracket page, preventing a redirect loop for non-participants.

### Changed
- `.gitignore` updated: added Codex artifact dirs (`.agents/`, `.codex-gitops*/`, `AGENTS.md`) and `next-env.d.ts`.
- Removed unused `react-hook-form` and `@hookform/resolvers` packages (no remaining imports after the form migration).
- `group-draw.test.ts` describe-block timeout raised to 15s (was intermittently hitting the 5s Vitest default on slow CI).

---

## [0.18.4] - 2026-04-04

### Fixed
- **Integration test suite fully passing** — `tournament-status.test.ts` and `tournament-edit.test.ts` were failing because `seedSetup()` called `organization.findFirst()` without filtering, which could return a non-rallybase org. `canCreateTournamentInOrg()` auto-approves the "rallybase" org by slug; tests now explicitly target it. All 138 integration tests pass.

---

## [0.18.3] - 2026-04-04

### Fixed
- **Confirmation codes scoped to tournament** — `MatchResultSubmission.confirmationCode` was globally unique across all submissions, guaranteeing eventual exhaustion at 10,000 confirmed matches. Now unique per tournament (`@@unique([tournamentId, confirmationCode])`). Code generation retries on collision; 4-digit numeric format preserved. Existing rows back-filled via migration.

### Changed
- Removed unused `findSubmissionByCode` repository function (orphaned by the uniqueness change).

---

## [0.18.2] - 2026-04-04

### Fixed
- **TD authorization now consistent across all pages and actions** — all hardcoded `tournament.createdByClerkId === userId` comparisons replaced with `isAuthorizedAsTD()`. Org admins and platform admins now have full TD access everywhere: bracket generation (all 4 action functions), TD result entry, tournament edit, event create, event edit, bracket page TD controls, and standings page TD controls.

---

## [0.18.1] - 2026-04-04

### Fixed
- **Confirmation page restricted to participants and TDs** — `/matches/[id]/confirm` now redirects unauthorized viewers (non-participants, non-TDs) to the bracket page. Org admins and platform admins are covered via `isAuthorizedAsTD`.
- **Pending page hides confirmation code from non-submitters** — the code is now shown only to the player who submitted the result. Other viewers (including the opponent) see a generic "awaiting confirmation" message instead.

---

## [0.18.0] - 2026-04-04

### Fixed
- **Self-confirmation logic corrected for all verification methods** — `confirmMatchResult()` now blocks self-confirm upfront for `CODE` tournaments; allows self-confirm for `BIRTH_YEAR` tournaments (birth year of the non-submitting player still required); allows self-confirm for `BOTH` tournaments via birth year only (code check skipped for self-confirmers, since they generated the code themselves).
- **Event advancement allowed when tournament is IN_PROGRESS or COMPLETED** — `advanceEventStatus()` previously blocked advancement unless the tournament was exactly `PUBLISHED`. Now only `DRAFT` is blocked, so TDs can advance events added to in-progress or completed tournaments.

### Tests
- Added integration test suites for `BIRTH_YEAR` and `BOTH` verification modes, covering non-self and self-confirm paths (7 + 9 new tests; 32 total in `match.test.ts`).

---

## [0.17.4] - 2026-04-03

### Fixed
- **Glicko state now fully reversible on void/delete** — `RatingTransaction` now stores `rdBefore`, `sigmaBefore`, `lastActiveDayBefore` from the pre-match snapshot. All three reversal paths (`tdVoidMatch`, `deleteEventById`, `deleteTournamentById`) restore these fields alongside `rating` and `gamesPlayed`. Existing transactions have null for these fields; reversal falls back to leaving rd/sigma unchanged (safe for Elo matches and pre-v0.17.4 history).

---

## [0.17.3] - 2026-04-03

### Fixed
- **"View groups" button label** — Codex renamed it to "View Group Draws" in v0.17.2; reverted. The "Group Draws" rename applies only to the section heading, not the navigation button.
- **Delete tournament now reverses rating transactions** — `deleteTournamentById` was orphaning rating transactions (nulling `matchId`) without restoring `playerRating.rating` or decrementing `gamesPlayed`. Now mirrors the same reversal pattern used by `deleteEventById` and `tdVoidMatch`.

---

## [0.17.2] - 2026-04-03

### Added
- **`ratingSnapshot` on EventEntry** — new `Float?` column captures each entrant's rating at the moment of bracket/group generation (SE and RR/RR_TO_SE). Migration applied to production DB.

### Changed
- **Entrants list** — shows `ratingSnapshot` instead of live rating when available; falls back to live rating for pre-start events with no snapshot.
- **"Groups" renamed to "Group Draws"** — section header on event detail page and manage event page updated; "View groups" button renamed to "View Group Draws".
- **Group Draws row order fixed** — rows always show players in original draw order (by `ratingSnapshot DESC`), never re-sorted by rank after group completes.
- **Rank column shows result rank in-place** — the `#` column reflects actual match-result rank; row order is unaffected.

---

## [0.17.1] - 2026-04-03

### Fixed
- **Search input zoom on iOS** — all search/filter inputs now use `text-base` on mobile (`md:text-sm` on desktop), preventing iOS Safari's auto-zoom on focus.
- **Groups grid layout on mobile** — event detail and standings pages now use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` instead of fixed `grid-cols-4`; portrait phone shows 1 group per row, landscape shows 2.
- **Bracket horizontal scroll for R16+** — large bracket inner container changed from `flex min-w-full justify-center` to `mx-auto flex w-fit items-start`; left side of bracket now scrollable on mobile.

### Changed
- **Player search defaults to RallyBase** — org filter defaults to RallyBase org and RallyBase Singles discipline instead of USATT.
- **seed-extra-players script** — now seeds RallyBase Singles ratings (900–1550, Glicko scale) instead of USATT ratings.

---

## [0.17.0] - 2026-04-03

### Added
- **RallyBase Glicko-lite v1 algorithm** — new `rallybase-glicko.ts` implementing a validated Glicko-lite rating system for the RallyBase org. Locked parameters: `default_rating=1200`, `base_k=120`, `inactivity_rd_growth_c=100`, score modifier disabled. Validated against 359,724 USATT matches (Brier 0.176 vs 0.191 baseline).
- **Glicko state columns** — `rd`, `sigma`, `lastActiveDay` added to `player_ratings`. New players start at `rd=300`, `sigma=0.06`; state updates after every match.
- **`RatingAlgorithm` interface extended** — optional Glicko fields (rd, sigma, lastActiveDay, isJunior, matchDay) and `defaultRating` property. Elo adapter unchanged.
- **Junior handling** — players under 21 at match time get elevated RD floor (220) and new/junior boosts to effective_k.
- **Inactivity RD inflation** — `rd_prime = sqrt(rd² + c * days_inactive)`, clamped to [40, 350].
- **Algorithm unit tests** — 6 Glicko stress-test scenarios covering mismatch, close matchup, winner clamp, rating floor, new-player boost, and inactive returner.

### Changed
- **RallyBase new-player default rating** — 1200 (down from Elo's 1500) for players with no existing rating row.
- **Tournament creation form** — org selector defaults to RallyBase.
- **Player profile** — RallyBase Singles rating shown first.
- **Vitest config** — excludes `.codex-gitops*` worktree directories from test runs.

---

## [0.16.3] - 2026-04-02

### Changed
- **Edit event → save redirects to event manage page** — was redirecting to tournament manage page.
- **Void match stays on current page** — `tdVoidMatchAction` now takes a `returnTo` param; void from bracket page stays on bracket, void from standings stays on standings, void from manage event stays on manage event.
- **Bracket/standings breadcrumbs context-aware** — tournament and event links in bracket/standings breadcrumbs now link to manage pages when the page was accessed via `?from=manage`.
- **Winner name green in StandingsSchedule** — completed-match winner names now use `text-green-400` (consistent with bracket and match list).
- **Status tag removed from StandingsSchedule** — per-match status text removed from standings/groups schedule view.
- **Submit/Confirm links gated on player identity** — Submit and Confirm links on bracket and standings pages are only shown to the player who is actually in that match (requires login and player profile match). TDs retain their "Enter result" links for all matches.

---

## [0.16.2] - 2026-04-02

### Added
- **Player number in search results** — player number (`#N`) shown as a muted prefix on every row in the player search results list, with consistent spacing via flex gap.
- **Entrants sorted by rating** — the Entrants section on the event detail page is now sorted by rating descending (unrated players at the bottom).

### Changed
- **Winner name: green + bold everywhere** — completed-match winner names are now `font-semibold text-green-400` in `EventMatchRow`, `ManageEventMatchList`, and the bracket `MatchCard`.
- **`(D)` default-win indicator** — extended to `EventMatchRow` and `ManageEventMatchList` (was bracket-only). Winner's name gets ` (D)` suffix for default wins.
- **Entrants scrollable** — the entrants list on event detail page is capped at `max-h-96` with `overflow-y-auto`.
- **Tournament search results scrollable** — the right-column results list on `/tournaments` is capped at `max-h-[28rem]` with `overflow-y-auto`.
- **"View all" link removed from preview lists** — the redundant "View all X (N) →" link below the Upcoming/Past tournament preview lists is removed; the section-header "View all →" link remains.
- **Status pill removed from matches page** — `EventMatchRow` now accepts a `showStatus` prop (default `true`); the `/events/[id]/matches` page and `RRtoSEMatchesList` both pass `showStatus={false}`.
- **Bracket center column label** — `StackedCenterColumn` label changed from "Final" to "Semifinals / Final".
- **Player search defaults to USATT + Singles** — `/players` pre-selects USATT org and Singles discipline when no URL params are set; search results are also filtered to USATT by default.
- **Create event form persists fields on error** — `createEventAction` now returns submitted field values in the error state; `EventForm` uses them as `defaultValue`s on re-render.

---

## [0.16.1] - 2026-04-02

### Added
- **RR→SE match list reformat** — the "All Matches" page for `RR_TO_SE` events now displays a two-column layout: Round Robin matches (left, grouped by group with "Group N" subsection labels) and Single Elimination matches (right, ordered by round descending with "Final" / "Semifinals" / "Quarterfinals" / "Round of 16" labels). A search bar at the top filters both columns by player name. If the SE bracket has not yet been generated, the right column shows "SE bracket not yet generated". Non-RR_TO_SE events retain the existing flat list.

### Fixed
- **Birth year self-confirm blocked** — `confirmMatchResult` now allows the submitting player to confirm their own submission when the tournament uses `BIRTH_YEAR` verification (by correctly entering the opponent's birth year). For `BOTH` verification, self-confirm is also allowed but only via the birth year check — the code check is skipped for self-confirmers to prevent confirming via a code the submitter already holds. `CODE`-only tournaments still block self-confirm.

---

## [0.16.0] - 2026-04-01

### Added
- **Match verification method** — TD can set per-tournament verification method (Code / Birth year / Both) in tournament create and edit forms. DB migration adds `verificationMethod VerificationMethod @default(CODE)` to `Tournament`.
- **Birth year confirmation** — when a tournament uses `BIRTH_YEAR` or `BOTH`, the confirming player enters their opponent's 4-digit birth year instead of (or in addition to) the random code. Returns a clear error if the opponent has no birth date on file.
- **Gender/age visibility toggles** — `showGender` and `showAge` fields added to `PlayerProfile` (default `false`, opt-in). Profile edit page now shows toggle sliders (ON/OFF) for each flag. Public profile page gates gender/age display on these flags.
- **DOB admin edit** — platform admin can edit a player's date of birth via a new section on the admin player detail page (`AdminDobForm`).

### Changed
- **Gender + DOB required on signup** — onboarding `ProfileForm` now requires both gender (must pick a value; "Prefer not to say" is valid) and date of birth.
- **DOB read-only in profile edit** — players can no longer edit their date of birth; it is shown as a read-only display with a note to contact support.

---

## [0.15.6] - 2026-04-01

### Fixed
- **Stacked bracket layout was skewed** — the previous implementation used absolute positioning with the left side at `top:0` and the right side at `top:H`, producing an asymmetric L-shape. The correct layout has both left and right columns spanning the full `2H` height with doubled spacing. Fix: introduced `stackingFactor=2^round` (instead of `2^(round-1)`) for columns and connectors in the stacked path, and replaced the per-SF connectors with `StackingConnector` (draws two horizontal lines at `H/2` and `3H/2`). `BracketColumn` and `ForkConnector` now accept an optional `stackingFactor` prop.

---

## [0.15.5] - 2026-04-01

### Added
- **SF/Final stacking for 16+ player brackets** — for brackets with `totalRounds ≥ 4`, the semifinal and final match cards are stacked vertically in a single center column (SF Left → Final → SF Right) with vertical connector lines. Saves significant horizontal space compared to the flat layout.
- **Bracket centering** — all bracket sizes now render centered within the page (both flat and stacked layouts, including the RR→SE placeholder bracket).
- **Default-win `(D)` indicator** — match cards on the bracket page and completed match rows in the standings schedule now append `(D)` to the winner's name for matches won by default. Bracket card footer also shows "default" as the status text.

### Changed
- **"Generate bracket" → "Start bracket"** — the SE stage generation button in the RR→SE manage page now reads "Start bracket" (distinguishes it from the initial "Generate schedule" button).
- **"View Standings" → "View Groups"** — the button label on the event manage page and event detail page now says "View groups" for all RR and RR→SE events.
- **Standings page: 4-column grid layout** — for grouped (multi-group) events, the standings page is now a viewport-filling 4-column grid. Each group card shows the standings table on top and a scrollable match schedule below. No-scroll design fits 8 groups in 2 rows of 4.
- **Standings page title** — renamed from "Standings" to "Group Standings and Matches".

---

## [0.15.4] - 2026-04-01

### Fixed
- **RR_TO_SE "View Standings" button always redirected** — the standings page guard `if (event.eventFormat !== "ROUND_ROBIN") redirect(...)` sent all RR_TO_SE events to the event detail page. Fixed by also permitting `RR_TO_SE`. SE phase matches (`groupNumber = null`) are filtered out so only the group stage schedule appears.

---

## [0.15.3] - 2026-04-01

### Fixed
- **RR_TO_SE premature event auto-complete** — when an RR match's `groupNumber` was null (stale data), `isRRPhaseMatch` evaluated to false and the event was auto-completed with no SE bracket generated. Root cause: auto-complete guard and `tryAutoGenerateSEStage` both relied on `match.groupNumber` to distinguish RR vs. SE phase. Fix: replaced the `groupNumber`-based guard with `checkEventComplete()` which uses `countSEMatches`/`countNonCompletedSEMatches` — for RR_TO_SE, the event only auto-completes when the SE bracket exists and is fully played through. `tryAutoGenerateSEStage` now uses `countSEMatches > 0` to skip re-generation instead of checking `matchGroupNumber`.
- **`tdDefaultMatch` missing RR_TO_SE guard** — the default-win path had no equivalent guard, so defaulting the last RR match in an RR_TO_SE event would also prematurely complete the event. Fixed with the same `checkEventComplete()` helper.
- **Placeholder bracket seeding wrong for A=2** — the `seedToGroupLabel` helper used a simple modular formula that gave ascending group order for all ranks. For A=2, runners-up use constrained half-zone placement (descending group order, opposite bracket half from their group winner), which the formula did not reproduce. Fix: replaced with `buildPlaceholderSeedInfo()` which calls `computeAdvancers` on synthetic standings to produce the exact seed→(group, rank) mapping used by the real SE generation.
- **Progress bar shows 100% after group stage before SE bracket generated** — for RR_TO_SE events the single progress bar reached 100% when all RR matches completed but before SE bracket was generated, then dropped once SE matches were added. Fix: replaced with two separate bars — "Group stage progress" and "Bracket stage progress" — the latter showing "Not started" until the SE bracket is generated.

---

## [0.15.2] - 2026-03-31

### Fixed
- **RR group count now uses `maxParticipants / groupSize` instead of `Math.ceil(n / groupSize)`** — when `maxParticipants` is set, the configured number of groups is determined by `M/P`, not the current registrant count. A 16-slot / 4-group event with 13 registrants now correctly generates 4 groups (snake-distributing remaining players as in the spec example). `assignGroups` accepts an optional `totalGroups` override; `generateRoundRobinBracket` passes it when `maxParticipants` is available.
- **Event creation/edit validation** — creating or editing a group-based event with `maxParticipants` set now returns a field error if `maxParticipants` is not a multiple of `groupSize`, enforcing that the group count is always a whole number.

---

## [0.15.1] - 2026-03-31

### Fixed
- **RR_TO_SE manage page stack overflow on fresh events** — `checkSEStageStatus` treated a newly-created event with no schedule (zero matches) as "RR complete" because `countIncompleteRRMatches` returns 0 for an empty event. This caused `computeAdvancers` to be called with empty standings, producing `numGroups=0 → nextPowerOf2(0)=1 → bracketSeedOrder(1)` which recurses infinitely (halving 1→0.5→0.25…, never reaching the base case of 2), crashing the Node.js process with a `RangeError: Maximum call stack size exceeded`. Fix: added `countRRMatches` repository function; `rrComplete` now requires both `rrMatchCount > 0` and `incompleteRR === 0`.

---

## [0.15.0] - 2026-03-31

### Added
- **RallyBase org** — new organization seeded with slug `rallybase`, Singles discipline, and "RallyBase Singles" rating category. Open to all authenticated users for tournament creation (no allowlist entry required).
- **Rating algorithm abstraction** — new `src/server/algorithms/rating-algorithm.ts` defines a `RatingAlgorithm` interface and `getAlgorithmForOrg(orgSlug)` dispatcher. All orgs use Elo today; the RallyBase custom algorithm can be dropped in later by adding a case for `"rallybase"`. `rating.service.ts` now calls the dispatcher instead of importing `calculateMatchElo` directly.
- **Tournament creation gating** — USATT and NCTTA orgs are now restricted: only platform admin, org admin, or users on the `TournamentCreatorAllowlist` can create tournaments there. RallyBase is open to all.
- **TournamentCreatorAllowlist** — new DB table (migration `20260331000000`) and admin UI for managing per-org approved tournament creators. Org admins can manage their own org's list; platform admin manages all orgs.
- **Admin page expanded** — now accessible to org admins (was platform admin only). Each org card shows an "Org Admins" section (platform admin only) and a "Tournament Creators" section (all admins, scoped to their org).

---

## [0.14.11] - 2026-03-30

### Fixed
- **RR→SE seeding — constrained half-zone placement** — replaced the sequential ascending seed assignment with a greedy bracket-half algorithm. Winners are assigned seeds 1..G in ascending group order. Runners-up are assigned seeds G+1..2G using a half-zone constraint: each runner-up is placed in the bracket half opposite their group's winner, guaranteeing no same-group R1 pairing for any valid number of groups (fixes the 3-group×2-advancer case where G3W and G3R were paired in R1 under the old approach). Runners-up are processed in descending group order to approximate snake-seeding strength ordering. The greedy assignment is always satisfiable for any G without backtracking.
- **advancersPerGroup restricted to 1–2** — Zod schema now enforces `max(2)` and EventForm select now shows only options 1 and 2. A≥3 support is deferred to post-v1.0.0.

---

## [0.14.10] - 2026-03-27

### Fixed
- **RR→SE seeding bug** — the inter-group snake seeding assigned the runner-up of group N to the seed that `bracketSeedOrder` places in the same first-round match as group N's winner. E.g. with 4 groups × 2 advancers, group 1 winner (seed 1) and group 1 runner-up (seed 8) were immediately paired. Fix: use ascending group order for all ranks (no snake). Seeds 1–4 = G1–G4 winners, seeds 5–8 = G1–G4 runners-up. `bracketSeedOrder(8)` then pairs: 1v8 (G1W/G4R), 4v5 (G4W/G1R), 2v7 (G2W/G3R), 3v6 (G3W/G2R) — no same-group first-round matchups.
- **Placeholder bracket labels** — `seedToGroupLabel` updated to use the same ascending ordering, so placeholder slots now correctly show cross-group pairings.
- **Unit tests** — advancer test updated to expect ascending order for rank-2 runners-up.

---

## [0.14.9] - 2026-03-27

### Fixed
- **Groups table spacing** — W-L column header and cells now have `whitespace-nowrap` so they don't wrap to two lines; rating cell gets `pr-2` so values don't run together with W-L.
- **SE round labels in event manage page** — pure SE events now show "Final", "Semifinal", etc. instead of "Round 1", "Round 2" in the match section. Computed from max round in match data.
- **SE round labels in tournament manage match dropdown** — `EventMatchList` now uses `getRoundLabel` for SE events and single-bracket events.
- **RR/SE phase separation in tournament manage match dropdown** — RR→SE events show a "Round Robin Phase" header (with group subsections "Group 1", "Group 2", …) followed by a "Bracket Phase" header (with round subsections using proper labels). Multi-group RR events group by group number. Pure RR single-group keeps "Round N".
- **Groups display on event detail page** — non-TD event detail page now shows the same groups grid as the manage page: rank # column (gold/silver/bronze, bold for advancers), combined W-L column, sorted by wins when complete.
- **Standings + bracket buttons on event detail page** — "View standings" now shows for RR→SE events (when schedule exists); "View bracket" now shows for RR→SE events. Format string shows "Round Robin → Single Elimination" for RR→SE.

---

## [0.14.8] - 2026-03-27

### Added
- **Dynamic placeholder SE bracket** — placeholder slot labels update to actual player names once a group completes all its matches. `computeCompletedGroupRankings` tallies wins from the already-fetched match data and substitutes real names (e.g. "Alice" instead of "Group 1 — 1st") for completed groups; unfinished groups retain the label format.
- **"View bracket" for RR→SE events** — the manage page now shows the "View bracket" button as soon as the RR schedule exists (`hasBracket`), not only after the SE stage is generated.

### Changed
- **Groups table visual overhaul** — when a group is complete: a `#` rank column appears at the left of each row (gold for 1st, silver for 2nd, bronze for 3rd, plain for others); advancers' rank numbers are bold; the separate W and L columns are merged into a single `W-L` column (e.g. "3-0"); players are sorted by wins descending; tied players share the same rank number (competition ranking).

---

## [0.14.7] - 2026-03-27

### Fixed
- **Manage event state persistence across TD submit navigation** — "Enter result" links from `ManageEventMatchList` now append `?returnTo=<current-url-with-params>` so that the td-submit page redirects back to the exact manage page URL (including `sort`/`phase`/`mp`/`gp` params) after any action. Previously the redirect always went to the bare manage URL, resetting the group/round selection.

---

## [0.14.6] - 2026-03-27

### Added
- **Placeholder SE bracket** — for RR→SE events, the bracket page now shows a full two-sided placeholder layout (with SVG connectors) when the group stage is complete but the SE bracket hasn't been generated yet. Each R1 slot displays its expected occupant label (e.g. "Group 1 — 1st", "Group 4 — 2nd", "BYE") computed from the inter-group snake seeding order. Higher rounds show "TBD". Falls back to the previous "not generated yet" message if the RR hasn't started.

---

## [0.14.5] - 2026-03-27

### Fixed
- **Entrants pagination with filtering** — `searchPlayers` now accepts `excludeIds` and filters before pagination, so total/page counts correctly reflect unregistered players only. Previously, filtering happened after page fetch, causing "No unregistered players found" when all 10 players on a page were already entered despite remaining pages still having eligible players.
- **Manage event group/round selection in URL** — selected sort mode (by group/round), phase (RR/SE), match page, and groups page are now stored in URL search params (`sort`, `phase`, `mp`, `gp`) via `useSearchParams` + `router.replace`. Note: full round-trip persistence (surviving td-submit navigation) was not complete until v0.14.7.

---

## [0.14.4] - 2026-03-27

### Added
- **Multi-select add entrants** — TD entrants page now shows checkboxes for all unregistered players with a single "Add N players" submit button. Replaces the per-player "Add" button.
- Already-entered players are filtered out server-side before rendering the search results list, so they disappear from the list after being added.
- `prisma/seed-extra-players.ts`: one-time script to seed 24 additional demo players with USATT ratings distributed between 1000 and 2000.

---

## [0.14.3] - 2026-03-27

### Added
- **Two-sided bracket layout** — bracket page redesigned with left/right halves converging at a centered Final. SVG connector lines (fork connectors for multi-match rounds, simple horizontal for 1-to-1) connect match cards across rounds. Round labels mirrored on both sides. Applies to pure SE and RR→SE hybrid events.

### Fixed
- **Bracket seeding algorithm** — `buildSingleEliminationBlueprint` now uses the standard recursive bracket seeding order (`[1,8,4,5,2,7,3,6]` for bracketSize=8) instead of the linear `p vs bracketSize-p+1` formula. Seeds 1 and 2 now land on opposite halves and meet only in the final. Generalizes for any bracket size.
- **TD match submit redirect** — `tdSubmitResultAction` and `tdDefaultMatchAction` now redirect based on match context (`backHref`) rather than always redirecting to `/manage`. SE bracket matches now return to the bracket page after submission.

### Changed
- Match card score display: removed W/L labels, replaced with game-wins count highlighted green for the winner.

---

## [0.14.2] - 2026-03-26

### Fixed
- **`advancersPerGroup` never saved** — `createEventAction` and `updateEventAction` both failed to extract `advancersPerGroup` from the FormData, so it was always `undefined` and never persisted to the database. SE generation always threw "advancersPerGroup is not configured for this event".
- **RR_TO_SE event auto-completed after group stage** — the match completion handler ran `countNonCompletedMatches` and marked the event COMPLETED when all RR matches were done, before the SE bracket was generated. For `RR_TO_SE` events, auto-complete now only fires on SE-phase matches (`groupNumber === null`). The SE auto-generate trigger also now runs before the auto-complete check so newly added SE matches are counted correctly.

---

## [0.14.1] - 2026-03-26

### Fixed
- **Bracket page shows RR group matches for RR_TO_SE events** — bracket page now filters to SE-only matches (`groupNumber === null`) for `RR_TO_SE` events; shows "SE bracket not generated yet" if SE stage hasn't been generated.
- **TD submit back nav goes to bracket instead of manage** — for RR-phase matches in `RR_TO_SE` events, the back link and COMPLETED redirect on the td-submit page now navigate to the manage event page instead of the bracket page.
- **Bracket page round labels** — bracket page now uses `getRoundLabel` (Final/Semifinal/Quarterfinal/Round of 16/…) instead of the limited inline function.

---

## [0.14.0] - 2026-03-26

### Added
- **New event format: RR → SE (Round Robin → Single Elimination)** — TDs can create a hybrid event where players compete in round-robin groups, then advancers seed into a single-elimination bracket.
- **`Event.advancersPerGroup`** — TD-configurable integer (1–5) specifying how many players advance from each group to the SE bracket.
- **`EventEntry.advancesToSE`** — nullable boolean override for tie resolution; `true` = manually advanced, `false` = manually excluded, `null` = use standings.
- **Inter-group snake seeding** (`src/server/algorithms/advancer.ts`) — `computeAdvancers` pure function assigns SE seeds across groups using snake/serpentine ordering (odd ranks ascending, even ranks descending) to separate group winners and runners-up in the bracket.
- **`getRoundLabel` utility** (`src/lib/bracket-labels.ts`) — maps `(round, totalRounds)` to human-readable labels: Final, Semifinal, Quarterfinal, Round of 16, Round of 32, Round of 64.
- **`generateSEStage`** — service function that verifies all RR matches are complete, computes advancers, stamps SE seeds on EventEntry rows, and builds the SE bracket.
- **`regenerateSEStage`** — deletes existing SE matches (if none are active), clears seeds, and re-runs `generateSEStage`.
- **`checkSEStageStatus`** — page-load helper returning `{ rrComplete, seExists, seCanRegenerate, ties, seTotalRounds }` for the manage page.
- **`resolveTie`** — sets `advancesToSE` overrides for a tied group then attempts to generate the SE stage.
- **Auto-trigger** — when the last RR match in an `RR_TO_SE` event is confirmed/submitted, the SE stage is automatically generated if no ties exist.
- **Tie resolution panel** (`TieResolutionPanel.tsx`) — shows per-tied-group UI with "Advance this player" buttons; TD manually resolves ties in-person before SE bracket generates.
- **Manage event page updates** — "View Bracket" button alongside "View Standings" once SE exists; Generate/Re-generate bracket buttons; tie resolution panel; Groups section shows "Completed" badge after SE is generated.
- **Matches section phase toggle** — for RR→SE events with SE generated, a dropdown switches between "RR Phase" (grouped) and "Bracket Phase" (SE matches with round labels).
- **20 new tests** — 8 unit tests for `computeAdvancers` + `getRoundLabel`, 12 integration tests for the full RR→SE flow. All 261 tests passing.

---

## [0.13.1] - 2026-03-25

### Added
- **Groups section on manage event page** — for grouped RR events, the right column now shows a 4-column × 2-row grid of group cards; each card lists players with their current rating and W-L record computed from completed matches. Paginates if > 8 groups.
- **Paginated match list on manage event page** — matches are now displayed one group or one round at a time with ← → navigation, a "Group N · X / Y" label, and a "Jump to:" input field.
- **Sort by dropdown** — TDs can toggle between "By group" and "By round" match display on grouped RR events.

---

## [0.13.0] - 2026-03-25

### Added
- **RR group draws** — TDs can now set a `groupSize` (3–6) on round-robin events. When set, players are automatically distributed into multiple groups at schedule generation time using snake/serpentine seeding by rating (best player per group, balanced across groups).
- **New `assignGroups` algorithm** (`src/server/algorithms/group-draw.ts`) — pure function; snake seeding; throws with a clear message if any group would fall below the 3-player minimum.
- **`Event.groupSize` schema field** — nullable integer; null = single group (legacy behavior unchanged).
- **`EventEntry.groupNumber` + `Match.groupNumber` schema fields** — stamped at schedule generation time; associates players and matches with their group.
- **Grouped standings** — standings page shows one section per group ("Group 1", "Group 2", …) with independent standings tables and schedules when groups are present.
- **`getRoundRobinStandings(eventId, true)`** overload — returns `GroupedRoundRobinStandings[]` with per-group standings.
- **EventForm group size selector** — appears only for Round Robin events; reactive in create mode, shown in edit mode.
- **10 unit tests + 8 integration tests** — all 237 tests passing.

### Changed
- **`getEventPodium`** — returns `{ first: null, second: null }` for multi-group RR events (no cross-group ranking until v0.14.0).

---

## [0.12.2] - 2026-03-25

### Added
- **Tournament search and pagination** — all tournament listing pages now use URL-param-based search (name, org, location, date range) and paginate at 10 results per page, sorted newest first.
- **New `TournamentSearchForm` component** — reusable URL-param filter inputs (same pattern as `PlayerSearchForm`). Accepts `pageParams` prop to reset multiple column pages simultaneously.
- **New `TournamentPagination` component** — reusable Prev/Next pagination with configurable `pageParam` for multi-column layouts.
- **`filterTournaments` + `paginateItems` utilities** — shared helpers in `src/lib/tournament-search.ts`.

### Changed
- **`/tournaments`** — Search section moves to right column (shows all public tournaments, paginated); Upcoming and Past preview lists move to left column.
- **`/tournaments/past` + `/tournaments/upcoming`** — redesigned as 2-column layout (1:2 ratio): left = title + search + filters; right = paginated results.
- **`/profile/[id]/tournaments`** — redesigned with top-row title + shared search form, and a 3-column body (Ongoing / Upcoming / Past), each paginated at 5 with independent page params.
- **`/tournament-directors/completed`** — redesigned to match `/tournaments/past` format.
- **`/admin/tournaments`** — redesigned to match `/tournaments/past` format; creator name fetch now scoped to visible page items only.

---

## [0.12.1] - 2026-03-25

### Fixed
- **Entrants page always shows results** — sort controls and paginated player list now appear by default without requiring a search query, matching the behavior of the public player search.
- **Entrants page 2-column layout** — redesigned as a side-by-side layout: left column has the search input, sort controls, and paginated add-entrant results; right column is a scrollable current entrants list.
- **Player # removed from public search** — player number badge removed from result cards on `/players`.

---

## [0.12.0] - 2026-03-25

### Added
- **Paginated player lists** — all three player lists (public `/players`, admin `/admin/players`, TD entrants search) now paginate at 10 players per page with Prev/Next controls and a page counter.
- **Sort controls on player lists** — public and TD entrants search: Rating ↓/↑, Last Name A→Z/Z→A, First Name A→Z/Z→A buttons. Admin players: Last Name and First Name only (no rating sort). Each button remembers its direction independently; clicking a different button does not reset the others.
- **USATT Singles as default rating** — when no org/discipline filter is active on `/players`, displayed ratings and rating sort use USATT Singles. If an org filter is set (no discipline), defaults to that org's Singles category. If both org and discipline are set, uses that specific rating category.

---

## [0.11.3] - 2026-03-25

### Fixed
- **TD name on admin tournaments list** — `/admin/tournaments` now shows "TD: [player name]" below the org/date line for each tournament that has a creator. Tournaments with no `createdByClerkId` (seeded/legacy) show nothing.
- **Back-nav on manage page from admin** — `/tournaments/[id]/manage?from=admin` now shows "← Admin Tournaments" back link instead of "← Back to Tournament Directors". Links from `/admin/tournaments` automatically append `?from=admin`.

---

## [0.11.2] - 2026-03-25

### Fixed
- **Add Rating form on admin player page** — `/admin/players/[profileId]` now shows only cards for existing rated scopes (no more "Unrated" placeholders). A new "Add Rating" row at the bottom expands inline to a form with org and discipline dropdowns and an initial rating field. Disabled (grayed) when all managed scopes are already rated. Server rejects the add action if a rating already exists for the selected scope.
- **Admin rating card layout** — existing rating cards now use a two-column layout: org + discipline name + current rating on the left; "Set Rating" label + input + Set button on the right.
- **Org admin scoping** — org admins see all rating categories on the page but can only add ratings for their own org (org dropdown is locked to their org in the Add Rating form).

---

## [0.11.1] - 2026-03-24

### Fixed
- **Admin rating editor works for unrated players** — `adminSetPlayerRating` now looks up the `RatingCategory` directly for org-admin authorization instead of blocking when no `PlayerRating` row exists yet. Admin player detail page now shows all rating categories (not just ones with existing ratings), so admins can assign initial ratings to new players.

---

## [0.11.0] - 2026-03-24

### Added
- **Platform Admin role** — single platform admin (assigned to test_user_1 via DB) can manage all tournaments, events, matches, and player profiles across the site.
- **Org Admin role** — platform admin can assign org admins per organization via `/admin`. Org admins have TD-level access for all tournaments in their org.
- **`OrgAdmin` table** — new schema model for scoped org admin assignments `(userId, organizationId)`.
- **`isAuthorizedAsTD` helper** — shared auth check: tournament creator OR platform admin OR org admin for that tournament's org. Applied to all TD-gated actions and services.
- **Admin nav link** — "Admin" link appears in the header for platform/org admin users.
- **`/admin` dashboard** — org admin management: assign by player number, remove. Quick links to player and tournament management.
- **`/admin/players`** — player search with links to individual player pages.
- **`/admin/players/[profileId]`** — per-player rating editor: set absolute rating value, creates a `RatingTransaction` record.
- **`/admin/tournaments`** — full tournament list (all statuses including drafts) with links to existing manage pages.

### Changed
- **Profile edit bypass** — platform admin can edit any player's profile (not just their own).
- **Draft guard bypass** — platform/org admins can view draft tournaments.

---

## [0.10.1] - 2026-03-24

### Changed
- **EventForm eligibility layout** — reorganized the eligibility restrictions grid: row 1 is Max participants + Gender restriction, row 2 is Min rating + Max rating, row 3 is Min age + Max age.

---

## [0.10.0] - 2026-03-24

### Added
- **Profile edit page** (`/profile/[id]/edit`) — players can edit display name, bio, gender, and date of birth. "Edit profile" link shown on own profile page.
- **Gender and age on public profile** — profile header shows gender label and computed age (from DOB) in the top-right of the left column when set.
- **Event gender restriction** — TDs can restrict events to Male only or Female only via a new "Gender restriction" dropdown in the EventForm eligibility section. Restriction shows on the public event detail page and is enforced by `checkEligibility`.
- **Age range filter in player search** — two number inputs (Min age / Max age) added to the player search filter row; filters by computed current age.

### Changed
- **Revised roadmap** — Platform Admin & Org Admin (formerly a later item) moved up to v0.11.0; Player Search Overhaul shifts to v0.12.0.

---

## [0.9.8] - 2026-03-24

### Fixed
- **New event on published tournament** — events created after a tournament is PUBLISHED or IN_PROGRESS now automatically get status `REGISTRATION_OPEN` instead of `DRAFT`.
- **TD score entry pre-fill** — TD score entry form now pre-populates with any existing pending submission scores (AWAITING_CONFIRMATION) or saved in-progress scores (IN_PROGRESS), so TDs don't have to re-enter what a player already submitted.

---

## [0.9.7] - 2026-03-20

### Fixed
- **Rating chart** — multiple matches on the same day now collapsed into one chart point (end-of-day rating; tooltip shows net daily delta).
- **Edit event redirect** — `updateEventAction` now redirects to the manage tournament page instead of the event detail page.
- **Delete tournament button** — `DeleteTournamentButton` added to the manage tournament page header.
- **Delete tournament redirect** — `deleteTournamentAction` now redirects to `/tournament-directors` on success.
- **Date filter UTC fix** — tournament date filters now use `setUTCHours(0, 0, 0, 0)` to correctly compare against UTC-stored dates across all three filter pages.
- **End date auto-fill** — `TournamentForm` now auto-populates `endDate` with the chosen `startDate` when `endDate` is empty.

---

## [0.9.6] - 2026-03-19

### Changed
- **README** — replaced `create-next-app` boilerplate with a full project README: description, feature list, tech stack, local setup steps, commands reference, and architecture overview.
- **Landing page hero** — description updated to mention both single-elimination brackets and round-robin schedules.
- **Landing page step 02** — broadened from seeding-only to cover self-registration with eligibility rules and direct TD entry.
- **Landing page step 03** — renamed to "Generate bracket or schedule" and updated description to cover both SE and RR formats.

---

## [0.9.5] - 2026-03-19

### Changed
- **Manage event page** — "View bracket" / "View standings" button moved from the bottom of the right column to the left column, below the format details line (mirrors the v0.9.2 layout of the public event detail page).
- **Manage event page** — "Results" section added to the left column for completed events, showing 1st and 2nd place with profile links (mirrors the v0.9.3 layout of the public event detail page).
- **Manage tournament page** — Completed event cards now show a podium row (lighter `bg-elevated` background) directly below the event header, displaying 1st and 2nd place with profile links (mirrors the v0.9.3 layout of the public tournament detail page).

---

## [0.9.4] - 2026-03-19

### Added
- **Default match** — TDs can now record a match result by default (winner advances, no scores recorded, ratings unaffected). TD submit page shows a "Record by default" section with one button per player.
- **Default match display** — `/matches/[matchId]` shows "Winner: PlayerName by default" instead of a score table when `isDefault` is true.
- **Match history default indicator** — `MatchHistoryList` shows "W by default" / "L by default" in the Result column for default matches.

### Fixed
- **Match history column widths** — `MatchHistoryList` table now uses `table-fixed` with explicit column width classes, preventing variable-width column layout shifts.
- **Past/upcoming tournament filter** — COMPLETED tournaments now always appear in "Past" regardless of `startDate`; COMPLETED tournaments are excluded from "Upcoming". Fixes the case where a tournament that completed before its scheduled end date stayed in the upcoming list.

### Schema
- Added `isDefault Boolean @default(false)` to the `Match` model. Migration applied.

---

## [0.9.3] - 2026-03-19

### Added
- **Event podium** — `getEventPodium(eventId, eventFormat)` added to `bracket.service.ts`. Returns `{ first, second }` player objects. SE: winner/loser of the highest-round completed match. RR: top 2 from standings.
- **Tournament detail — podium row** — Completed events in the tournament detail events list now show an extra `bg-elevated` row directly beneath the event row, displaying 1st and 2nd place with profile links.
- **Event detail — Results section** — Completed event detail page (left column) now shows a "Results" section between the bracket/standings button row and Entrants, with 1st and 2nd place on separate rows with profile links.

---

## [0.9.2] - 2026-03-19

### Changed
- **Event detail left column layout** — Event status pill moved to sit right-justified next to the event name (flex row, `items-start justify-between`).
- **Event detail left column layout** — "View bracket" / "View standings" button moved below the format details line, left-justified. Registration status indicator (REGISTERED / EVENT FULL / INELIGIBLE pill, or Sign up button) placed right-justified on the same row.
- **Event detail right column** — Bracket/standings links removed from the right column; now exclusively in the left column.

---

## [0.9.1] - 2026-03-19

### Added
- **Tournament detail events list** — Each event row now shows a status badge (DRAFT, REGISTRATION OPEN, IN PROGRESS, COMPLETED pill).
- **Back nav from match result page** — `/matches/[matchId]` reads a `?from=` search param (`tournament` or `event`) and renders a contextual back link ("← Back to tournament" or "← Back to event"). Defaults to "← Back to bracket".

### Changed
- **Standings page** — Server-side redirect guard added: non-round-robin events now redirect to the event detail page instead of showing standings.
- **Manage event page** — Standings link now only renders for round-robin events.
- **YourMatchesList** — COMPLETED match "View" link now appends `?from=tournament` so the back nav on the match page returns to the tournament.
- **EventPlayerMatchList** — COMPLETED match "View" link now appends `?from=event` so the back nav returns to the event detail page.

---

## [0.9.0] - 2026-03-19

### Added
- **Event detail page overhaul** — Two-column layout (`max-w-7xl`, `lg:grid-cols-[380px_1fr]`).
- **Auth-aware registration status** — Left column shows REGISTERED pill, EVENT FULL pill, INELIGIBLE pill, or Sign up button depending on player state. Eligibility rules hidden for unauthenticated users.
- **EventPlayerMatchList** — New client component scoped to one event. Shown in the right column for registered players. Inline Submit / Continue / Confirm / View actions; expandable per-game scores; grouped by status (In progress → Upcoming → Completed); "No matches yet" if empty.
- **EventMatchesPreview** — New server component shown in the right column for non-registered / signed-out users. Renders up to 5 `EventMatchRow`s and a "View all N matches →" link.
- **EventMatchRow** — New client component. Expandable row with bold winner name, status pill, round label, per-game scores on expand.
- **Full match list page** — New `/tournaments/[id]/events/[eventId]/matches` page: read-only full match list using `EventMatchRow`, with breadcrumb back to the event.

---

## [0.8.4] - 2026-03-19

### Added
- **Save progress button** on the submit result form — players can save partial game scores at any point during a match. Scores are persisted to `MatchGame` records and the match status transitions to `IN_PROGRESS`.
- **Pre-populated form** — when a match is `IN_PROGRESS`, the submit form initializes score inputs from the saved `MatchGame` records.
- **IN_PROGRESS match view** (`/matches/[matchId]`) — saved scores displayed read-only with "Match in progress" header; no redirect to submit for `IN_PROGRESS` matches.
- **ManageEventMatchList** — `IN_PROGRESS` rows are clickable (navigates to `/matches/[id]`); "Enter result" button shown for `IN_PROGRESS` matches.
- **YourMatchesList** — `IN_PROGRESS` action href changed to `/matches/[id]/submit`; action label is now "Continue" for `IN_PROGRESS` matches.

### Changed
- `confirmSubmission` repository function now deletes existing `MatchGame` records before writing official scores, handling the case where `IN_PROGRESS` saves wrote records prior to final submission.

---

## [0.8.3] - 2026-03-19

### Changed
- **ManageEventMatchList** — No inline score summary on collapsed completed rows; scores only visible in expanded panel. Chevron moved to the left of player names. Entire row clickable (except Enter result / Void buttons) to toggle expand on completed matches with scores. Winner's name bold white on COMPLETED matches. "Completed" status badge now uses the same neutral pill style as "Pending".
- **YourMatchesList** — Chevron moved to the left of match text. Entire row clickable: completed-with-scores rows toggle expand; non-completed rows navigate to the action link (Submit / Confirm). Action button excluded from row click. Status label moved inline as a neutral pill badge on the same line as the match text. Matches within each group (In progress / Upcoming / Completed) sorted by event name A→Z.

---

## [0.8.2] - 2026-03-19

### Changed
- **Bracket card W/L badges** — game win counts are now displayed as `W 3` / `L 1` (letter first, no dot separator). Winner's count is bold white; loser's count is `text-text-3`. Loser gets a bold red `L` mirroring the winner's bold green `W`. Right-side score column uses a fixed `w-10` container so both rows align vertically.
- **Bracket card TBD** — TBD placeholder text is no longer bold (`text-text-2` weight).
- **Bracket card pending matches** — W and L markers only appear on `COMPLETED` matches; pending/in-progress matches show no letter badges.

---

## [0.8.1] - 2026-03-19

### Added
- **Match result page** (`/matches/[matchId]`) — read-only result view for completed matches showing per-game score table, winner callout, and breadcrumb linking back to the bracket.
- **Bracket game win counts** — completed bracket match cards now show game win counts next to each player name (e.g. "Player A · 2 W / Player B · 1").
- **Bracket "View" link** — completed non-bye bracket match cards now show a "View" link to the match result page.
- **Per-game expand on standings schedule** — completed match rows in the standings schedule now have a ▾ toggle to expand per-game score breakdown. `StandingsSchedule` extracted as a `"use client"` component.
- **Per-game expand on "Your Matches"** — completed match rows in the tournament detail "Your Matches" section now have a ▾ toggle to expand per-game score breakdown. `YourMatchesList` extracted as a `"use client"` component.
- **Remove entrant** — TDs can remove a player from an event's entrant list via a "Remove" button (with confirmation dialog). Blocked server-side if any match has progressed past PENDING.

### Changed
- **Single-line match rows** — status label and TD action buttons (Enter result / Void / expand toggle) in ManageEventMatchList are now on a single line.
- **PENDING match status badge** — PENDING status in ManageEventMatchList is now displayed as a styled neutral badge (border + bg-surface) instead of plain unstyled text.
- **Date filter labels** — "From" and "To" labels added above the date range inputs in the tournament search bar.

---

## [0.8.0] - 2026-03-19

### Fixed
- **TD result redirect** — After TD submits or voids a match result, redirect to manage event page instead of bracket/standings.
- **Profile page** — Removed stale "Back to player search" link.
- **Tournament detail** — "Register for Events" button is now hidden on COMPLETED tournaments.

### Added
- **Entrant guard** — `addEntrantAction` rejects with inline error when event is IN_PROGRESS or COMPLETED; action refactored to Pattern A (`useActionState`).
- **Tournament advance guard** — Attempting to start a tournament with no events now returns an inline error via `AdvanceTournamentStatusButton`.
- **Event advance guard** — Advancing an event to REGISTRATION_OPEN or IN_PROGRESS when the parent tournament is not PUBLISHED now returns an inline error via `AdvanceEventStatusButton`.
- `AddEntrantForm`, `AdvanceTournamentStatusButton`, `AdvanceEventStatusButton` client components for inline error display.

---

## [0.7.9] - 2026-03-18

### Added
- **Manage event match list** — TD actions (Enter result / Void) on each match row; completed matches are expandable in-place to show per-game score breakdown.
- `ManageEventMatchList` client component handles grouping by round, TD actions, and expand/collapse state.

### Fixed
- Manage event page now has a "← Back to manage tournament" link at the bottom.
- Creating a new event redirects to the manage event page (not player-facing event detail).
- Deleting an event redirects to the manage tournament page (not tournament detail).
- Adding an entrant from manage entrants page stays on manage entrants (no redirect away).
- Advancing event status from manage event page stays on manage event page (no redirect away).
- New event page back link now points to manage tournament, not tournament detail.
- Bracket and standings pages back link is context-aware: `?from=manage` sends TDs back to manage event; players go back to event detail.
- Manage tournament and manage event bracket/standings links now pass `?from=manage`.

---

## [0.7.8] - 2026-03-18

### Added
- **Manage Event page** (`/tournaments/[id]/events/[eventId]/manage`) — TD-only two-column layout:
  - Left column: breadcrumb → event name + Edit/Delete buttons → org/discipline/format details → status badge + advance button → progress bar (completed/total matches, hover tooltip) → generate bracket button (if applicable) → entrants preview (up to 10) with "Manage →" link.
  - Right column: always-visible scrollable match list grouped by round (max-height 70vh), with sticky round headers. Bracket/standings links at bottom.
- **Manage Entrants page** (`/tournaments/[id]/events/[eventId]/manage/entrants`) — full entrant list + player search form to add entrants. Breadcrumb links back through manage event.
- `findEventManageDetail` repository function — fetches event with tournament, ratingCategory, all eventEntries (with ratings), and all matches (with games).
- `getEventManageDetail` service function — auth-gates by `createdByClerkId`.

### Changed
- Manage tournament page: event name links and "Edit" links now point to `/events/[eventId]/manage` instead of the player-facing event detail page.

---

## [0.7.7] - 2026-03-18

### Added
- **2-column tournaments page** — left column has header + "New tournament" button + `MyTournamentsPreview` (logged-in players) + `TournamentSearchBar`; right column has Upcoming (top 5 + "View all →") and Past (top 5 + "View all →") preview lists.
- **`TournamentSearchBar`** client component — filters by name text, org dropdown, location text, and date range entirely client-side. Reusable across sub-pages.
- **`/tournaments/upcoming`** and **`/tournaments/past`** pages — each loads the scoped subset and embeds `TournamentSearchBar`.
- **Removed** from `/tournaments`: old "My registered tournaments" section, "My drafts" section, and associated data fetches.

---

## [0.7.6] - 2026-03-18

### Changed
- **Tournament detail page** — removed Manage button and Delete tournament button entirely. Draft visibility guard remains (non-creator redirected to `/tournaments`).
- **Event detail page** — removed all TD controls (Edit event, Delete event, Add entrant section, Generate bracket button, TD actions section). Back link always goes to tournament detail. Page now serves purely as a player-facing view.
- **Manage tournament page** — back link changed from `/tournaments/[id]` to `/tournament-directors`.
- **Edit event page** — back link changed from event detail to `/tournaments/[id]/manage`.
- **New tournament page** — back link changed from `/tournaments` to `/tournament-directors`.
- Navigation contract: player flow = Tournaments → Tournament detail → Event detail. TD flow = Tournament Directors → Manage tournament → Edit/manage events.

---

## [0.7.5] - 2026-03-18

### Added
- **Tournament Directors nav link** — added between Tournaments and Players in the global nav (desktop + mobile).
- **Tournament Directors page** (`/tournament-directors`) — shows all of the logged-in user's tournaments grouped into 4 status columns (Drafts, Published, In Progress, Completed), each preview showing 5 most recent with "View all →" links to sub-pages. Auth-gated; redirects to sign-in if not logged in.
- **Empty state** on Tournament Directors — step-by-step onboarding for users with no tournaments.
- **Templates placeholder** — "Coming soon" card at the bottom of the Tournament Directors page (v0.8.0 will fill this).
- **Tournament Directors sub-pages** — `/tournament-directors/drafts`, `/published`, `/in-progress`, `/completed`.
- **`TDTournamentGroup`** shared component for each status column.
- **Profile page** — container widened from `max-w-4xl` to `max-w-6xl`.

---

## [0.7.4] - 2026-03-18

### Added
- **Your Matches section** on every tournament detail page — shows only to logged-in players who have at least one match in that tournament. Grouped into In Progress (IN_PROGRESS + AWAITING_CONFIRMATION), Upcoming (PENDING), and Completed. Each row shows event name, round, opponent, status, and an action link (Submit / Confirm / View).
- `findMatchesByPlayerAndTournament` repository function in `match.repository.ts`.
- `getPlayerMatchesForTournament` service function in `player.service.ts`.
- Integration tests for the new repository function appended to `tests/integration/player-history.test.ts`.

---

## [0.7.3] - 2026-03-18

### Added
- **My Tournaments page** at `/profile/[id]/tournaments` — groups player's tournaments into Ongoing, Upcoming, and Past sections; each row links to the tournament.
- **My Tournaments preview** on the profile dashboard (left column, own profile only) — shows up to 3 active/upcoming tournaments with inline "View all →" link.
- **My Tournaments preview** on the tournaments search page (`/tournaments`) — visible to logged-in players with a profile, rendered above the public list.
- `findTournamentsWithEntriesByProfile` repository function — filters tournaments by player entry, includes only the events the player is entered in.
- `getPlayerTournamentHistory` service function in `tournament.service.ts`.
- `MyTournamentsPreview` shared server component in `src/components/players/`.
- Integration tests for the new service function (`tests/integration/my-tournaments.test.ts`).

---

## [0.7.2] - 2026-03-18

### Added
- **Two-column profile layout** — profile page widens to `max-w-4xl` with a `grid-cols-1 md:grid-cols-2` layout. Left column: header, ratings, upcoming matches. Right column: rating graph, match history.
- **Inline "View all →" links** — "Upcoming matches" links to `/profile/[id]/tournaments`; "Match history" links to `/profile/[id]/history`.
- **Full match history page** at `/profile/[id]/history` — displays all completed matches grouped by tournament with back link to profile.
- **Top-5 limit** on upcoming matches in dashboard — sorted by status priority (IN_PROGRESS → AWAITING_CONFIRMATION → PENDING), truncated at 5.
- **`limit` prop on `MatchHistoryList`** — optional, slices display list when provided.

### Changed
- Rating deltas now display with 2 decimal places (e.g. `+16.00`) in both the match history table and the rating graph tooltip.

---

## [0.7.1] - 2026-03-18

### Fixed
- `advanceEventStatus` integration tests were failing because the v0.6.2 tournament cascade (DRAFT→PUBLISHED, PUBLISHED→IN_PROGRESS) silently advanced the shared test event to IN_PROGRESS before the `advanceEventStatus` describe block ran. Added a `beforeAll` reset to DRAFT at the top of that describe block to isolate it from the tournament cascade side-effects.

---

## [0.7.0] - 2026-03-18

### Added
- **Match history list** on every player profile page — shows all COMPLETED rated matches with tournament/event, linked opponent, W/L result + game score (e.g. "W 3–1"), and rating delta (color-coded green/red). Visible to any viewer.
- **Rating history graph** on every player profile page — Recharts `LineChart` showing rating over time sourced from the `rating_transactions` ledger. If the player has ratings in multiple org/discipline categories, a dropdown picker appears above the graph. Shows "No rating history yet" if no transactions exist.
- `findCompletedMatchesByPlayerId` repository function — queries completed matches for a player, including match games and the player's own rating transactions.
- `findAllRatingTransactionsByProfile` repository function — queries all rating transactions for a player across all categories in chronological order.
- `getPlayerMatchHistory` service function in `player.service.ts`.
- `getPlayerRatingHistories` service function in `rating.service.ts`.
- Integration tests for both new service functions (`tests/integration/player-history.test.ts`).

---

## [0.6.5] - 2026-03-18

### Changed
- Match list on the manage page now starts collapsed by default.
- When the last match in an IN_PROGRESS event is completed (via player confirmation or TD submit), the event automatically advances to COMPLETED. If that was the last non-completed event, the tournament also auto-completes.

---

## [0.6.4] - 2026-03-18

### Changed
- Creating a new tournament now redirects to the manage page instead of the tournament detail page.
- Edit tournament page now shows a Delete button (bottom-right), matching the existing confirmation flow.
- Edit event page now shows a Delete button (bottom-right), matching the existing confirmation flow.
- Match list on the manage page is now collapsible (click "▾ Matches (N)" to toggle) and scrollable (`max-h-96 overflow-y-auto`) so long match lists no longer extend the page.

---

## [0.6.3] - 2026-03-18

### Changed
- When an event transitions to IN_PROGRESS (via manual advance or tournament-level cascade), its bracket or round-robin schedule is now auto-generated if none exists yet and there are enough players (SE ≥ 2, RR ≥ 3). If the condition isn't met, the manual "Generate bracket" button remains available.

---

## [0.6.2] - 2026-03-18

### Changed
- Publishing a tournament now automatically opens registration for all DRAFT events (DRAFT → REGISTRATION_OPEN).
- Starting a tournament now automatically moves all REGISTRATION_OPEN events to IN_PROGRESS.
- When the last event in a tournament is marked COMPLETED, the tournament automatically advances to COMPLETED (no manual step needed; the "Complete Tournament" button remains as a safety valve for 0-event tournaments).
- Player dashboard no longer shows upcoming matches from DRAFT tournaments.

---

## [0.6.1] - 2026-03-18

### Changed
- Event names on the TD manage page are now clickable links to the event detail page.
- Added **Edit event** button on the event detail page for TDs, linking to the edit event form.
- Edit tournament page back button now returns to the manage page instead of the tournament detail page.
- Event detail back link is now context-aware: TDs go to the manage page, others go to the tournament detail page.
- **Add Event** button moved from the tournament detail page to the manage page.

---

## [0.6.0] - 2026-03-17

### Added
- **TD manage page** at `/tournaments/[id]/manage` — management hub with status controls, match overview per event, and links to edit/bracket/standings.
- **Tournament status transitions** — full lifecycle: DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED, TD-only, forward-only.
- **Event status transitions** — full lifecycle: DRAFT → REGISTRATION_OPEN → IN_PROGRESS → COMPLETED, TD-only, forward-only.
- **Edit tournament page** at `/tournaments/[id]/edit` — pre-filled form for name, location, dates, and scheduling.
- **Edit event page** at `/tournaments/[id]/events/[eventId]/edit` — pre-filled form; rating category and event format shown read-only to prevent destructive changes.
- **Past/upcoming split** on the tournament list — tournaments split by `startDate` relative to today.
- **My Drafts section** on the tournament list — TDs see their DRAFT tournaments (links to manage page) at the top.
- **DRAFT guard** on tournament detail — non-TD visitors to a DRAFT tournament URL are redirected to `/tournaments`.
- **Manage link** on tournament detail page for the TD.

### Changed
- DRAFT tournaments are excluded from the public tournament list.
- Seeded demo tournaments now default to `PUBLISHED` status.

---

## [0.5.2] - 2026-03-17

### Changed
- **Register for Events button** is now accent green for visibility on the tournament detail page.

### Fixed
- **UTC labels on datetime inputs:** `startTime` and `withdrawDeadline` inputs now show `(UTC)` in their labels to make the timezone expectation explicit.

---

## [0.5.1] - 2026-03-17

### Fixed
- **Register for Events link always visible:** the link was previously hidden unless a user was logged in AND at least one event was `REGISTRATION_OPEN`. It now appears whenever the tournament has any events, regardless of their status or the viewer's auth state.

---

## [0.5.0] - 2026-03-17

### Added
- **Start times:** optional `startTime` field on both `Tournament` and `Event`. Displayed on tournament detail, event detail, and register pages.
- **Withdrawal deadline:** optional `withdrawDeadline` field on `Tournament`. If not set, defaults to 24 hours before `Tournament.startTime`. If neither is set, withdrawal is always allowed (until bracket is generated).
- **Player registration page:** new `/tournaments/[id]/register` route — players see all events in one place, select eligible ones via checkboxes, and submit with a single "Register Selected" button. Per-event status badges and eligibility reasons shown inline.
- **Player withdrawal:** players can withdraw from an event via a confirm-dialog button on the register page, subject to the withdrawal deadline.
- **Scheduling inputs on forms:** `TournamentForm` gains a collapsible "Scheduling" section with `startTime` and `withdrawDeadline` datetime-local inputs. `EventForm` gains an optional `startTime` input.
- **Register link on tournament detail:** a "Register" button appears on the tournament detail page for signed-in users when at least one event is `REGISTRATION_OPEN`.

### Changed
- **SignUpButton removed from event detail page:** `/register` is now the only player self-registration path. The `SignUpButton` component and `signUpForEventAction` remain in the codebase but are no longer rendered.

---

## [0.4.2] - 2026-03-16

### Added
- **Delete event:** tournament directors can delete an event from the event detail page. Applied rating transactions are reversed before removal; all matches, entries, and submissions are cleaned up via cascade.

---

## [0.4.1] - 2026-03-16

### Added
- **Dashboard nav link:** explicit "Dashboard" link added to the header navigation bar alongside the existing logo link.

### Fixed
- **Round-robin bracket redirect:** navigating to the bracket page for a round-robin event now redirects to the standings page. Generating a round-robin schedule also redirects to standings instead of bracket.
- **Void button alignment:** the Void button in bracket match cards and standings schedule rows was pushed slightly below sibling text due to its `<form>` wrapper being a block element. Wrapper is now inline-flex.
- **Submit link color:** the player "Submit" link in bracket match cards is now accent-colored, matching the TD "Enter result" link.
- **Match score input UX:** score fields now clear on focus and default back to 0 on blur if left empty. Values are retained after a failed submission. The row containing an invalid score is highlighted in red.

---

## [0.4.0] - 2026-03-16

### Added
- **Player search shows current rating:** player search results (global search and tournament add-entrant search) now display each player's rating. Global search defaults to USATT singles; active org/discipline filters update the displayed rating accordingly. Shows "Unrated" when no rating exists in the relevant category.
- **Dashboard nav link:** explicit "Dashboard" link added to the header navigation bar alongside the existing logo link.

### Changed
- **Verification code is now 4 digits:** match result confirmation codes changed from a long cuid string to a 4-digit zero-padded number (e.g. `0472`). A new code is generated on each submission attempt.

### Fixed
- **TD restriction on event/entrant/bracket actions:** creating events, adding entrants, and generating brackets are now restricted to the tournament creator at both the UI and server action level. Other signed-in users no longer see these controls.
- **Tournament and event name uniqueness:** tournament names are now unique within an organisation; event names are unique within a tournament. Duplicate names return a form-level field error.
- **TD can void matches in AWAITING_CONFIRMATION state:** the Void button now appears for matches awaiting confirmation (not only completed matches), allowing TDs to cancel a pending submission and reset the match.
- **Round-robin tiebreaker uses head-to-head subset:** standings sort now applies tiebreakers using only the head-to-head matches among tied players (games won → points for → direct H2H result for two-player ties), rather than overall event statistics. Tied players share a rank displayed as `T-1`, `T-2`, etc.

---

## [0.3.1] - 2026-03-16

### Fixed
- **Game score validation:** scores where either player's total exceeds the point target (e.g. 11) are now correctly rejected unless the margin is exactly 2. Scores like `11–50` or `14–11` were previously accepted because the win-by-2 check alone was insufficient; the fix enforces that once a game goes past the point target (deuce), the gap must be exactly 2. Unit tests added for all new cases.

---

## [0.3.0] - 2026-03-13

### Added
- **Player search improvements:** players can now be searched by player number; search results show gender and date of birth; filter controls added to the player search UI.
- **Player self-signup:** players can sign up for events directly from the event page. Eligibility is checked against event constraints (min/max rating, min/max age, max participants) before confirming registration.
- **Round-robin format:** events can now be created with a `ROUND_ROBIN` format supporting 3–6 players. Schedule is generated using the circle method. Odd player counts receive a bye each round.
- **Round-robin standings page:** dedicated standings view showing win/loss record and games differential for each player in a round-robin event.
- **TD match submission:** tournament directors can submit match results directly without requiring a confirmation code (`tdSubmitMatch`). Elo ratings are applied immediately.
- **TD match void:** tournament directors can void a completed match, reversing the associated rating transactions and resetting the match to pending (`tdVoidMatch`).
- **Separate TD and player views:** tournament detail pages now show different content depending on whether the viewer is the tournament director or a participant.

### Fixed
- **Bracket card alignment:** fixed vertical misalignment of match cards in the single-elimination bracket view (card height constant corrected to 104px).

---

## [0.2.0] - 2026-03-12

### Added
- **Delete tournament:** tournament creators can delete their own tournaments from the tournament detail page. Deletion handles the foreign key cycle (`Match.nextMatchId → NoAction`) by nulling match references and detaching rating transactions before removing the tournament record.
- **Dark athletic theme:** full visual redesign across all pages using a dark background with green accent colour. Applied consistently to all layout components, forms, brackets, and match cards.

---

## [0.1.3] - 2026-03-12

### Fixed
- **View code link on bracket:** the "View Code" link for matches in `AWAITING_CONFIRMATION` state was not rendering correctly in the bracket view. Link now appears as expected so players can retrieve their confirmation code.

---

## [0.1.2] - 2026-03-12

### Fixed
- **Production crash (react-hook-form):** `react-hook-form` v7.71 has a `useMemo` incompatibility with React 19.2 that causes a fatal error (#310) in production builds. Removed `react-hook-form` entirely; all forms now use plain `useActionState` with native `FormData` and `name` attributes.

---

## [0.1.1] - 2026-03-12

### Fixed
- **Duplicate email conflict (P2002):** Clerk treats email+password and Google OAuth sign-ins as separate accounts with different Clerk IDs. `upsertUserFromClerk` now matches on `clerkId OR email` to merge accounts and avoid a unique constraint violation on repeated sign-ins.

---

## [0.1.0] - 2026-03-11

### Added
- **Foundation:** Next.js 16 (App Router) + TypeScript project scaffolded with Clerk authentication, Prisma ORM, and a PostgreSQL schema covering users, organisations, disciplines, ratings, tournaments, events, matches, and result submissions.
- **Player system:** player profile creation and editing, global player search, and per-player rating display scoped by organisation and discipline.
- **Elo rating engine:** rating calculations with variable K-factor (32 / 24 / 16 based on games played). Ratings are stored as a mutable snapshot (`player_ratings`) and an immutable ledger (`rating_transactions`).
- **Tournament system:** create tournaments and events with configurable format (`BEST_OF_3/5/7`), point target (11 or 21), and eligibility constraints (min/max rating, min/max age, max participants). Tournament directors can add entrants via player search.
- **Single-elimination brackets:** seeded bracket generation for any power-of-2 field size. Matches link via `nextMatchId` so winners advance automatically.
- **Match result submission:** players submit scores game-by-game. A confirmation code is generated and sent to the opponent; the match is finalised only after the opponent enters the code.
- **Rating integration:** Elo deltas are calculated and applied automatically when a match result is confirmed.
- **Polish and deployment:** responsive UI, demo seed data (organisations, disciplines, rating categories, sample players and tournaments), and Vercel deployment configuration.

---

[Unreleased]: docs/feature-roadmap.md
[0.5.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MarvinKYu/RallyBase/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MarvinKYu/RallyBase/commits/v0.1.0
