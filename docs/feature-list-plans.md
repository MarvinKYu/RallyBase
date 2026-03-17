# Planned Features Roadmap

## v0.4.0 — Security, Integrity & Correctness

### Restrict event creation and player addition to tournament creator
- Currently any logged-in user can create events and add entrants to any tournament
- Lock to the tournament's `createdByClerkId`; org/platform admins as future extension points

### Enforce tournament and event name uniqueness
- Tournament names unique globally; event names unique within a tournament
- DB constraint + Zod validation + form error display

### TD can void matches in AWAITING_CONFIRMATION state
- Currently `tdVoidMatch` only handles completed matches
- Extend to also reset matches that are waiting for confirmation

### Round robin tiebreaker — proper subset logic
- Current standings sort by W/L then games differential across all matches
- Fix: tiebreakers must use only head-to-head matches among tied players
- Priority: (1) games/sets won in head-to-head among tied, (2) points won in those matches, (3) head-to-head result if only two remain tied
- Fix `bracket.service.ts` standings sort and add unit tests

### Change verification code to 4-digit numerical
- Schema change: String cuid → 4-digit zero-padded String
- New generation logic: random 0000–9999
- Update UI display

### Player search shows current rating
- Add rating display to player search results cards
- Default to USATT / singles discipline filter

---

## v0.4.1 — UI Polish

No schema changes. Can ship independently or alongside v0.4.0.

### Change SUBMIT button color in bracket view
- Visual inconsistency fix

### Update match score input UX
- Clear field contents on focus
- Default to 0 if clicked away with no input
- On invalid submission, retain previously entered values and highlight the invalid row/field

### Remove bracket display for round robin events
- Round robin events should show the standings page, not an empty/broken bracket view
- Hide the bracket nav link and redirect if accessed directly

### Dashboard button in header nav
- Add explicit "Dashboard" nav link alongside the existing RallyBase logo link

---

## v0.5.0 — Player Registration Overhaul

Depends on v0.4.0 (TD restriction must be enforced before building the player-facing flow).

### Add start time to events and tournaments
- `startTime DateTime?` on both `Tournament` and `Event`
- Tournament start defaults to earliest event start
- Used as basis for withdraw deadline calculation

### Separate player signup page
- New flow: player navigates to a tournament → sees list of events with eligibility status → selects events → submits
- TD-side "add entrant" search remains unchanged
- New route: `/tournaments/[id]/register`

### Player withdrawal from event
- Player can withdraw from an event before the withdraw deadline
- Deadline: TD-set field on tournament (`withdrawDeadline DateTime?`), defaulting to 24h before `Tournament.startTime`
- Block withdrawal after bracket is generated regardless of deadline

---

## v0.6.0 — Tournament Lifecycle

### TD dashboard page
- New TD-only page per tournament (`/tournaments/[id]/manage` or similar)
- Shows all events, all matches with scores, and match status at a glance
- Gated to tournament creator

### Completed/Past tournaments category
- Tournaments list page splits into Upcoming and Past sections based on tournament end date
- End date defaults to start date if not explicitly set
- Requires v0.5.0 `startTime`

---

## v0.7.0 — Player History

### Match history on player dashboard
- List of past rated matches on the player's own profile page
- Shows opponent, result, rating delta, and date

### Rating graph
- Line chart using Recharts showing rating over time
- Sourced from `rating_transactions` ledger
- Scoped by org/discipline (picker if multiple)

---

## Dependency Notes

- v0.4.1 has no dependencies — can be done in parallel with or after v0.4.0
- v0.5.0 requires v0.4.0 (TD restriction must gate the new player signup page correctly)
- v0.6.0 item 2 (past tournaments) requires v0.5.0 `startTime` field
- v0.7.0 has no dependencies beyond the existing rating_transactions ledger

---

# Completed

## v0.1.0 — MVP (Phases 1–8)
- Foundation (Next.js, Clerk, Prisma, schema)
- Player system (profiles, search, rating display)
- Elo engine, rating service, transactions
- Tournaments (create tournament/event, entrants, list/detail pages)
- Brackets (single-elimination generator, bracket UI)
- Match results (submission, confirmation code workflow)
- Rating integration (ratings applied on match confirmation)
- Polish (responsive UI, demo seed data, Vercel deployment config)

## v0.1.1 — P2002 email fix
## v0.1.2 — react-hook-form removal (production crash fix)
## v0.1.3 — View code link fix

## v0.2.0 — Delete tournament + dark theme redesign

## v0.3.0 — Stage 2
- Player search improvements (player number, gender, birthDate, filters)
- Player self-signup (eligibility fields, SignUpButton, age/rating checks)
- Round-robin format (circle-method algorithm, standings page, EventFormat enum)
- TD/player view separation (tdSubmitMatch, tdVoidMatch, conditional UI)
- Bracket UI alignment fix (CARD_H = 104px)
