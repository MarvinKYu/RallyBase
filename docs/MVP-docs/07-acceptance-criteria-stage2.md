# Stage 2 Acceptance Criteria

---

## Feature 1: Improve Player Search

### Player Number
- [ ] Every player profile has a unique auto-assigned sequential numeric ID (`playerNumber`)
- [ ] `playerNumber` is displayed on the player profile page (e.g. `#1042`)
- [ ] `playerNumber` is displayed alongside display name in search results on `/players`
- [ ] Searching by exact numeric ID (e.g. `1042`) returns the correct player

### Filters — Global Player Search (`/players`)
- [ ] Organization filter dropdown is present and populated
- [ ] Discipline filter dropdown is present, populated, and updates when Organization changes
- [ ] Gender filter dropdown is present with all gender options
- [ ] Age range filters (min/max) are present
- [ ] Applying any filter combination updates results without a full page reload (URL params update)
- [ ] Clearing all filters returns the full unfiltered result set
- [ ] Filters and search query can be combined (e.g. search "John" + filter by org)

### Entrant Search (event page)
- [ ] After successfully adding a player to an event, the search bar is cleared (no stale query in URL)

### Profile Form
- [ ] Gender field is present on the profile creation/edit form (optional)
- [ ] Saved gender is displayed on the profile page

---

## Feature 2: Player Self-Signup for Tournaments

### Event Eligibility Settings (TD/creator only)
- [ ] When creating or editing an event, the tournament creator sees optional fields: Max Participants, Min Rating, Max Rating, Min Age, Max Age
- [ ] Non-creator users do not see these fields
- [ ] Settings are saved correctly and reflected when viewing the event

### Player Self-Signup
- [ ] A signed-in player who has not yet entered an event sees a "Register for this event" button when `event.status === REGISTRATION_OPEN`
- [ ] A player who is already entered does NOT see the register button
- [ ] A non-signed-in user does not see the register button

### Eligibility Enforcement
- [ ] Signup is blocked with a clear error message if the event is full (max participants reached)
- [ ] Signup is blocked with a clear error message if the player's rating is outside the allowed range
- [ ] Signup is blocked with a clear error message if the player's age (computed from birthDate at tournament startDate) is outside the allowed range
- [ ] If `birthDate` is required for an age-gated event and the player has not set one, they are shown a message directing them to update their profile
- [ ] Successful signup redirects to the event page and the player appears in the entrant list

### Event Name Uniqueness
- [ ] Creating two events with the same name within the same tournament returns a validation error

### Player Profile
- [ ] `birthDate` field is present on profile form (optional)
- [ ] Saved birthDate is used in age eligibility calculations

### Event Status Visibility
- [ ] `REGISTRATION_OPEN` events display a visible status badge on the tournament list and event detail pages

---

## Feature 3: Round Robin Format

### Event Creation
- [ ] Event creation form includes an "Event Format" selector: Single Elimination (default) and Round Robin
- [ ] Selecting Round Robin and saving persists the format correctly

### Schedule Generation
- [ ] For a 3-player Round Robin event, generating the schedule creates 3 matches (3C2)
- [ ] For a 4-player Round Robin event, generating the schedule creates 6 matches (4C2)
- [ ] For a 5-player Round Robin event, generating the schedule creates 10 matches (5C2)
- [ ] For a 6-player Round Robin event, generating the schedule creates 15 matches (6C2)
- [ ] Every player faces every other player exactly once
- [ ] Attempting to generate a schedule for fewer than 3 or more than 6 players returns a clear error
- [ ] Matches are distributed across rounds (no player plays twice in the same round where avoidable)

### Standings Page
- [ ] Navigating to `/tournaments/[id]/events/[eventId]/standings` shows the standings table
- [ ] Standings table shows: rank, player name, wins, losses, game differential
- [ ] Standings update in real time as matches are completed (on page refresh)
- [ ] Matches are shown grouped by round with submit/confirm links
- [ ] A player with more wins appears above a player with fewer wins
- [ ] Tiebreaker by game differential works correctly

### Backward Compatibility
- [ ] All existing single-elimination events are unaffected (default `eventFormat = SINGLE_ELIMINATION`)
- [ ] The bracket page still works correctly for single-elimination events

---

## Feature 4: Separate Tournament Director View from Player View

### TD — Match Control
- [ ] On the tournament detail page, the tournament creator sees a full match list across all events
- [ ] Each match card shows current status and, if completed, the score
- [ ] **Enter result**: TD can submit scores for a `PENDING` match without a confirmation code. Match completes and ratings are updated.
- [ ] **Override result**: TD can change the scores/winner of a `COMPLETED` match. Ratings are recalculated correctly (old delta reversed, new delta applied).
- [ ] **Void result**: TD can reset a `COMPLETED` match to `PENDING`. Ratings are reversed. `match_games` and submissions are cleared.
- [ ] Non-creator users do not see Enter/Override/Void buttons

### Player View — Tournament List
- [ ] Signed-in player with a profile sees a "My Tournaments" section at the top of `/tournaments`
- [ ] "My Tournaments" lists only tournaments the player is entered in (via event entries)
- [ ] Players with no entries see no "My Tournaments" section (or an appropriate empty state)

### Player View — Event Detail Tabs
- [ ] Event detail page shows two tabs: "My Matches" and "Draws" (single-elim) or "Standings" (round-robin)
- [ ] When a signed-in entered player views an event with `IN_PROGRESS` tournament: "My Matches" tab is the default
- [ ] When tournament is not `IN_PROGRESS`, or user is not entered, or user is not signed in: "Draws"/"Standings" tab is the default
- [ ] Both tabs are always visible and clickable by all users

### Player View — My Matches Tab
- [ ] Shows only the signed-in player's matches for that event
- [ ] Matches are grouped: Upcoming, In Progress, Completed
- [ ] Each match card links to submit or confirm as appropriate
- [ ] A player entered in multiple events of the same tournament sees their matches scoped to the current event

### Player View — Dashboard
- [ ] Home page (`/`) shows an "Upcoming Matches" section for signed-in players
- [ ] Lists matches where the player is `player1` or `player2` and status is `PENDING` or `IN_PROGRESS`
- [ ] Each entry shows: tournament name, event name, opponent name, round
- [ ] Signed-out users and users without a profile do not see this section

---

## Feature 5: Fix Single-Elim Bracket UI Alignment

- [ ] In a 4-player bracket (2 rounds), the semifinal match cards visually center between their R1 feeders
- [ ] In an 8-player bracket (3 rounds), quarterfinal → semifinal → final alignment is correct at each level
- [ ] TBD / bye match cards have the same height as actionable match cards (no misalignment from variable card sizes)
- [ ] No horizontal overflow or clipping for brackets up to 8 players
- [ ] Bracket renders correctly on mobile (horizontal scroll for wider brackets)
