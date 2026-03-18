# Planned Features Roadmap

## v0.6.1 — TD UI/Navigation fixes

### Event detail navigation from TD dashboard
- Event cards in the manage page are currently not clickable; each event card should link directly to the event detail page.

### Edit event button on event detail page
- "Edit event" button/link should appear on the event detail page for the TD, not only in the tournament detail event list.

### Back button routing fixes
- "Back" on the edit tournament page should go to `/manage`, not to the tournament detail page.
- "Back" on the event detail page should go to `/manage` (not tournament detail) when the viewer is the TD; show a "Back to manage" link for TDs.

### Add event button moved to TD dashboard only
- Remove the "Add event" button from the tournament detail page. It belongs in the TD manage page only.

---

## v0.6.2 — Registration lifecycle automation

### Hide draft-tournament matches from player dashboard
- Pending matches from tournaments in DRAFT status should not appear in a player's upcoming matches on the dashboard. Safeguard: only show pending matches where the tournament status is PUBLISHED or IN_PROGRESS.

### Auto-open registration when tournament published
- When a tournament transitions from DRAFT → PUBLISHED, all its events should automatically transition to REGISTRATION_OPEN.
- Any new event created while the tournament is already in PUBLISHED state should default to REGISTRATION_OPEN (not DRAFT).

### Auto-close registration when tournament starts
- When a tournament transitions to IN_PROGRESS, all events still in REGISTRATION_OPEN should automatically transition to IN_PROGRESS (closing registration).

---

## v0.6.3 — Event auto-start and bracket auto-generation

### Auto-start events at their startTime
- Events with a `startTime` set should automatically transition to IN_PROGRESS at that time.
- Requires a scheduled task (e.g. Vercel Cron) — larger scope than a simple patch.

### Auto-generate brackets and RR schedules on event start
- When an event transitions to IN_PROGRESS (whether manually or via auto-start), its bracket or round-robin schedule should be generated automatically if it hasn't been already.
- Removes the manual "Generate bracket" / "Generate schedule" step.

---

## v0.6.0 — Tournament Lifecycle

### TD publish/draft workflow
- TDs can save a tournament as `DRAFT` and return to it later before making it visible
- Published tournaments (`PUBLISHED`) are visible to all users; drafts are only visible to the TD
- TD dashboard or tournament detail page includes a "Publish" button to transition from draft → published
- Requires hiding draft tournaments from the public tournament list and all player-facing pages

### TD dashboard page
- New TD-only page per tournament (`/tournaments/[id]/manage` or similar)
- Shows all events, all matches with scores, and match status at a glance
- Gated to tournament creator

### Edit event and edit tournament
- TDs can edit tournament and event settings from the detail pages
- Discuss at implementation time: edit-in-place vs. redirect to pre-filled creation form
- Changes to eligibility settings (rating range, age range, max participants) take effect immediately

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

## v0.8.0 — Tournament Templates

### Save tournament as template
- TDs can save a tournament's settings as a reusable template (tournament settings + full events list with per-event settings)
- Intended for recurring events: monthly tournaments, weekly leagues, etc.
- When creating a new tournament, TD can optionally load from a saved template to pre-fill all fields

---

## Dependency Notes

- v0.6.0 publish/draft requires hiding tournaments based on status (touches tournament list and all player-facing pages)
- v0.6.0 past tournaments requires v0.5.0 `startTime` field
- v0.7.0 has no dependencies beyond the existing rating_transactions ledger
- v0.8.0 has no hard dependencies but builds naturally after v0.6.0 (edit tournament/event makes templates more useful)

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

## v0.4.2 — Delete Event
- TD can delete an event from the event detail page; ratings reversed, FK cascade handled

## v0.5.0 — Player Registration Overhaul
- startTime on Tournament and Event, withdrawDeadline on Tournament
- /tournaments/[id]/register page with multi-select checkbox registration flow
- Player withdrawal with configurable deadline (withdrawDeadline → 24h-before-startTime → always allow)
- RegisterForm and WithdrawButton components
- Register for Events link on tournament detail page
- SignUpButton removed from event detail page

## v0.5.1 — Register link visibility fix
- Register for Events link now always visible when tournament has events (was gated on login + REGISTRATION_OPEN status)

## v0.5.2 — Register button styling + UTC labels
- Register for Events button styled as accent green
- datetime-local inputs labelled with (UTC) to make timezone expectation explicit

## v0.6.0 — Tournament Lifecycle
- TD manage page at `/tournaments/[id]/manage` with status controls, match overview, and links to edit/bracket/standings
- Full tournament status lifecycle: DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED
- Full event status lifecycle: DRAFT → REGISTRATION_OPEN → IN_PROGRESS → COMPLETED
- Edit tournament and edit event pages with pre-filled forms; event format and rating category read-only in edit mode
- Past/upcoming split on tournament list; DRAFT tournaments hidden from public
- My Drafts section on list page for TDs; DRAFT guard on tournament detail
- Seeded tournaments default to PUBLISHED
