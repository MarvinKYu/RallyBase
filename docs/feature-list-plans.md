# Planned Features Roadmap

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

## v0.3.1 — Deuce score validation fix

## v0.4.0 — Security, Integrity & Correctness
- TD restriction on event/entrant/bracket actions
- Tournament and event name uniqueness (DB constraint + form error)
- TD can void matches in AWAITING_CONFIRMATION state
- Round-robin tiebreaker uses head-to-head subset
- Verification code changed to 4-digit zero-padded number
- Player search shows current rating (context-sensitive, Unrated fallback)

## v0.4.1 — UI Polish
- Round-robin bracket redirect to standings
- Match score input UX (clear on focus, retain on error, highlight invalid row)
- Void button alignment fix
- Dashboard nav link added to header
