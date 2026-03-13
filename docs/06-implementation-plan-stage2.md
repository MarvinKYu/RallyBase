# Stage 2 Implementation Plan

## Overview

Stage 1 (MVP) is complete and live. Stage 2 extends core functionality with 5 features. All work follows the established architecture: services → repositories, pure algorithms, `useActionState` forms, no react-hook-form.

---

## Feature 1: Improve Player Search

### Goal
Add a unique sequential numeric ID to player profiles, make it searchable, add extensible filters to the global player search, and clear the entrant search bar after adding a player.

### Schema Changes
```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY
}

// PlayerProfile — add:
playerNumber  Int     @unique @default(autoincrement())
gender        Gender?
```
Migration: `add_player_number_and_gender`

Age filter depends on `birthDate` added in Feature 2.

### Implementation

**Repository** (`player.repository.ts`):
- `searchProfiles(query)`: search `displayName` OR `playerNumber` (numeric match via `OR [{ displayName: { contains } }, { playerNumber: { equals } }]`)
- `filterProfiles(filters: ProfileFilters)`: extensible filter type — currently supports `organizationId?`, `ratingCategoryId?`, `gender?`, `minAge?`, `maxAge?`. New filters (handedness, school, etc.) require only extending `ProfileFilters` + adding the field + wiring UI.

**Service** (`player.service.ts`):
- `searchPlayers(query, filters)`: accepts and forwards filter params

**UI — global player search** (`players/page.tsx` + `PlayerSearchForm.tsx`):
- Filter dropdowns: Organization, Discipline, Gender, Age range (min/max)
- Filters passed as URL search params (`?q=...&org=...&discipline=...&gender=...&minAge=...&maxAge=...`)
- Organization/Discipline options from existing `getOrganizations()` / `getRatingCategoriesForOrg()`
- Show `playerNumber` (e.g. `#1042`) on search results and profile pages

**UI — entrant search** (`EntrantSearchForm.tsx`):
- After `addEntrantAction` redirects, `q` param is dropped (redirect target has no `q`). Confirm current redirect URL strips it; adjust if needed.

**Profile form** (`ProfileForm.tsx`): add optional Gender field.

### Files
- `prisma/schema.prisma`
- `src/server/repositories/player.repository.ts`
- `src/server/services/player.service.ts`
- `src/app/players/page.tsx`
- `src/components/players/PlayerSearchForm.tsx`
- `src/app/profile/[id]/page.tsx`
- `src/components/onboarding/ProfileForm.tsx`

---

## Feature 2: Player Self-Signup for Tournaments

### Goal
Players sign themselves up for `REGISTRATION_OPEN` events. Events have configurable eligibility settings (max participants, rating range, age range) visible only to the tournament creator/TD.

### Schema Changes
```prisma
// Event — add:
maxParticipants  Int?
minRating        Float?
maxRating        Float?
minAge           Int?
maxAge           Int?

// PlayerProfile — add:
birthDate        DateTime?

// Event uniqueness within tournament:
@@unique([tournamentId, name])
```
Migration: `add_event_eligibility_and_player_birthdate`

### Implementation

**Eligibility check** (pure function, no DB, lives in `tournament.service.ts`):
```typescript
checkEligibility(player, playerRating, event, currentEntrantCount):
  { eligible: true } | { eligible: false, reason: string }
```
- Max participants: block if `currentEntrantCount >= event.maxParticipants`
- Rating: block if player rating outside `[minRating, maxRating]`
- Age: compute age from `player.birthDate` at `event.tournament.startDate`; block if outside `[minAge, maxAge]`
- Each check skipped if the event field is `null`

**New server action** `signUpForEventAction(eventId, tournamentId)` — Pattern B:
- Requires signed-in user with a player profile
- Calls `selfSignUpForEvent(eventId, playerProfileId)` service
- Service calls `checkEligibility()` → `addEntrant()` if eligible
- Redirects to event page on success

**Event form** (`EventForm.tsx` + `createEventSchema`):
- Add eligibility fields: `maxParticipants`, `minRating`, `maxRating`, `minAge`, `maxAge`
- Only rendered for the tournament creator

**Profile form** (`ProfileForm.tsx`): add optional `birthDate` field.

**UI** (event detail page):
- "Register for this event" button for signed-in non-entered players when `event.status === REGISTRATION_OPEN`
- Inline error display via `useActionState` for eligibility failures
- `REGISTRATION_OPEN` badge shown on tournament and event listings

### Files
- `prisma/schema.prisma`
- `src/server/repositories/tournament.repository.ts`
- `src/server/services/tournament.service.ts`
- `src/server/actions/tournament.actions.ts`
- `src/lib/schemas/tournament.ts`
- `src/components/tournaments/EventForm.tsx`
- `src/components/onboarding/ProfileForm.tsx`
- `src/app/tournaments/[id]/events/[eventId]/page.tsx`

---

## Feature 3: Round Robin Tournament Format

### Goal
Support pure round robin events (3–6 players). All-play-all scheduling; standings computed live from match results.

### Schema Changes
```prisma
enum EventFormat {
  SINGLE_ELIMINATION
  ROUND_ROBIN
}

// Event — add:
eventFormat  EventFormat  @default(SINGLE_ELIMINATION)
```
Migration: `add_event_format`

The existing `format` field (MatchFormat: BEST_OF_3/5/7) is unchanged — it controls per-match play format, not the event structure.

### New Algorithm: `src/server/algorithms/round-robin.ts`
```typescript
buildRoundRobinSchedule(playerIds: string[]): RoundRobinBlueprint
```
- Pure function, no DB access
- Uses the "circle method" (polygon rotation) for balanced scheduling
- Even n: `n-1` rounds; odd n: `n` rounds (bye handling)
- Returns `{ totalRounds, matches: MatchBlueprint[] }` (same `MatchBlueprint` type as bracket)
- Each match: `{ round, position, player1Id, player2Id }` — no `nextMatchId`
- Validates 3–6 player range (service rejects outside that)

### Bracket Service (`bracket.service.ts`)
- `generateBracket(eventId)` branches on `event.eventFormat`
- `SINGLE_ELIMINATION`: unchanged
- `ROUND_ROBIN`: calls `buildRoundRobinSchedule()`, creates matches without `nextMatchId`

### Standings Service (`tournament.service.ts`)
`getRoundRobinStandings(eventId)`:
- Loads all matches (any status) for the event
- Computes per-player: wins, losses, games won/lost, point differential
- Sort: wins desc → game differential desc
- Returns ranked standings array

### New UI: Standings Page
Route: `/tournaments/[id]/events/[eventId]/standings`
- Round-by-round match schedule (grouped by round)
- Live standings table (rank, name, W, L, game differential)
- Match cards link to submit/confirm actions

### Event Form (`EventForm.tsx`)
- Add `eventFormat` selector (Single Elimination / Round Robin)
- Single Elimination is default for backward compatibility

### Files
- `src/server/algorithms/round-robin.ts` (new)
- `src/server/services/bracket.service.ts`
- `src/server/services/tournament.service.ts`
- `src/app/tournaments/[id]/events/[eventId]/standings/page.tsx` (new)
- `src/components/tournaments/EventForm.tsx`
- `src/lib/schemas/tournament.ts`
- `prisma/schema.prisma`

---

## Feature 4: Separate Tournament Director View from Player View

### Goal
**TD view**: Full match visibility, ability to submit scores on behalf of players, override confirmed results, and void/reset matches.
**Player view**: "My Tournaments" section at top of tournament list; tab-based event view defaulting to "My Matches" when in progress; upcoming matches on dashboard.

### Authorization
Uses existing `createdByClerkId === userId` pattern (no schema changes). Consistent with current deletion authorization.

### TD Match Actions (new in `match.actions.ts` + `match.service.ts`)

`tdSubmitMatchResultAction(matchId, formData)`:
- Auth: caller must be tournament creator
- Skips confirmation code workflow; writes directly to `match_games`, sets status `COMPLETED`
- Calls `applyRatingResult()` (same as confirmation path)

`tdOverrideMatchResultAction(matchId, formData)`:
- Auth: tournament creator only
- Inserts compensating `RatingTransaction`s to reverse prior ratings (append-only ledger preserved)
- Overwrites `match_games`, updates `match.winnerId`, reapplies Elo with corrected result

`tdVoidMatchResultAction(matchId)`:
- Auth: tournament creator only
- Deletes `match_games` and `match_result_submissions` for match
- Inserts compensating `RatingTransaction`s
- Sets match back to `PENDING`, clears `winnerId`

### TD View UI Changes
- Tournament detail (`/tournaments/[id]/page.tsx`): when creator, show full match list across all events with per-match "Enter result" / "Override" / "Void" buttons (conditional on match status)
- Event detail (`/tournaments/[id]/events/[eventId]/page.tsx`): TD sees full entrant + match status overview

### Player View UI Changes

**Tournament list** (`/tournaments/page.tsx`):
- For signed-in players: query `getTournamentsForPlayer(playerProfileId)` (via `EventEntry → Event → Tournament`)
- Render "My Tournaments" section above the full list

**Event detail** — tab navigation:
- When signed-in player is an entrant AND tournament is `IN_PROGRESS`: default to **"My Matches"** tab
- Otherwise: default to **"Draws"** (single-elim) or **"Standings"** (round-robin) tab
- Both tabs always accessible to all users

**"My Matches" tab**:
- Shows only the signed-in player's matches, grouped:
  - Upcoming (`PENDING`)
  - In Progress (`IN_PROGRESS` / `AWAITING_CONFIRMATION`)
  - Completed (`COMPLETED`)
- Each card links to submit/confirm as usual

**"Draws" / "Standings" tab**:
- Full bracket or RR standings — identical to current bracket/standings page content

**Player dashboard** (`/` page):
- Upcoming matches section: matches where signed-in player is `player1Id` or `player2Id` and status is `PENDING` or `IN_PROGRESS`
- Shows: tournament name, event name, opponent, round

### Files
- `src/server/actions/match.actions.ts`
- `src/server/services/match.service.ts`
- `src/server/repositories/match.repository.ts`
- `src/server/services/tournament.service.ts`
- `src/server/repositories/tournament.repository.ts`
- `src/app/tournaments/page.tsx`
- `src/app/tournaments/[id]/page.tsx`
- `src/app/tournaments/[id]/events/[eventId]/page.tsx`
- `src/app/page.tsx`

---

## Feature 5: Fix Single-Elim Bracket UI Alignment

### Goal
Later-round match cards should be vertically centered between the two feeder matches.

### Root Cause
Spacing math uses `MATCH_H = 80` but does not account for the action row (`~24px`) appended to actionable match cards. Gap and paddingTop are therefore too small in later rounds.

### Fix (`bracket/page.tsx`)
```typescript
const MATCH_H = 80;
const ACTIONS_H = 24;
const CARD_H = MATCH_H + ACTIONS_H; // total rendered card height

const factor = Math.pow(2, round - 1);
const paddingTop = ((factor - 1) * CARD_H) / 2;
const gap = (factor - 1) * CARD_H;
```
Also: give TBD/bye cards the same fixed total height as actionable cards so all columns use a consistent unit.

### Files
- `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx`

---

## Implementation Order

1. **Feature 5** — isolated fix, no schema changes
2. **Feature 1** — schema migration, search/filter improvements
3. **Feature 2** — schema migration, self-signup + eligibility
4. **Feature 3** — new algorithm, round robin events
5. **Feature 4** — TD/player view separation (builds on all prior features)

---

## Testing Strategy

- **Algorithm unit tests** (Vitest): `buildRoundRobinSchedule` — verify correct match count, all-play-all coverage, bye handling for odd counts
- **Integration tests** (Vitest against live Neon DB): new service functions — `selfSignUpForEvent`, `getRoundRobinStandings`, `getTournamentsForPlayer`, TD match actions
- **Manual E2E** per feature — see acceptance criteria doc
