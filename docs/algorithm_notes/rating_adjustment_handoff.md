# Illini Cup 2026 — Rating Adjustment Handoff

## Goal

Retroactively correct the Illini Cup 2026 ratings in the production Neon Postgres database.
The live system treated every player as a new player (initial RD = 300). In reality, many
players had prior USATT history or were personally known, so their initial RD should have
been lower. This causes the final ratings to be correct directionally but too volatile.

The fix is a **full replay**: delete all Illini Cup rating transactions, reset each player
to corrected starting state, re-run the v1_release algorithm match-by-match in the original
order, write new RatingTransaction rows, and update PlayerRating to the final values.

The target final ratings have been pre-calculated offline and are provided below.

---

## Scope

- **Tournament:** Illini Cup 2026
- **tournamentId:** `cmnq9us090001lpyxxvk31t1s`
- **ratingCategoryId:** `cmnf16inz000igg3xr510ys9j`
- **Events in scope** (all belong to the same tournamentId above):
  - `cmnqabooi000810tqo76ok8cn` — U1900
  - `cmnqaetun0003gk0tdlaimq4e` — Illini Open
  - `cmnzd60a400015eslal40e5bo` — U1600
  - `cmo0ircxu0003epq4jmt2cobg` — U1300
  - `cmo0mxg070001n2xlzlpgz65e` — Open 3/4
  - `cmo0n0izi0001kic05ugwpwaw` — U1600 3/4
  - `cmo0zi5ep0001o3awtn2150uq` — U1900 3/4

> **Out of scope:** Event `cmo16o41m0003ye6wylm8xic1` (U1803) belongs to a different
> tournamentId (`cmo16n9we0001ye6w5gbjmc74`). Do not touch any transactions for that event.

---

## Player Table

These are the 30 active players (Marvin Yu and DEV_ACCOUNT did not play and should not
be touched; Wubing Xia withdrew and played no matches — keep their PlayerRating at their
existing seeded value, just correct the RD).

| Player | playerProfileId | Seed Rating | Initial RD | Target Final Rating |
|---|---|---|---|---|
| Sijia Zhang | cmnvqzl0s00037sbkod240l8g | 1999 | 210 | 1831.9 |
| Stephen He | cmntqqfbj0003watqx00lj7at | 1966 | 150 | 1946.5 |
| Jolin Xu | cmntrlnqo0003tw5r9v9x5mpf | 1875 | 210 | 2069.6 |
| Sameer Komoravolu | cmnq9qinw000210tqf6a9ozkm | 1803 | 150 | 1783.4 |
| Ariston Liu | cmntqm40d00082e49bmsenekn | 1821 | 150 | 1978.7 |
| Ray Ausan | cmntqce2n0002i94b863kynj9 | 1600 | 210 | 1460.8 |
| Arjit Bose | cmnvyaydv000352xwq3lojysp | 1575 | 210 | 1749.2 |
| TRK | cmntt2kbi0009veflwzsyv3dt | 1550 | 300 | 1579.2 |
| Cynthia Huang | cmntqr1uy0008watqhzgusrra | 1540 | 210 | 1645.2 |
| Season He | cmntqm2dm00032e49ifu123lo | 1525 | 210 | 1377.8 |
| Keene Huynh | cmnxv7jml0006z7on4ddn2ixk | 1475 | 300 | 1122.7 |
| Leila Moon | cmntsbzvz0003veflspdph771 | 1463 | 210 | 1469.8 |
| Kevin Crandall | cmnsxr9uq0003a9zpspyvq0o3 | 1400 | 210 | 1349.2 |
| Arpit Mittal | cmnxusoz20003n8a6kazwpp8f | 1350 | 300 | 1314.5 |
| Austin Sheng | cmnv1ykpd0003kgb1bej8l2tj | 1300 | 210 | 1231.9 |
| Reese Ramos | cmnzegexl0008zuwpv4toe5a9 | 1225 | 210 | 1350.7 |
| Josh Meyer | cmnt5ebyw0003snr4k2twiirb | 1200 | 210 | 1170.2 |
| Dylan Tran | cmnuq5fk20003hm11eblqpunz | 1150 | 300 | 1206.6 |
| Jack Lo | cmnv27637000316uxdi9ecofv | 1150 | 210 | 1225.6 |
| Aditya Korlahalli | cmnwnmsa50002ks2bnog95uvx | 1100 | 300 | 1296.9 |
| Rahil Mittal | cmnxwkhs30007g6890jr9z3w9 | 1000 | 300 | 997.8 |
| Ocean Lan | cmnslj0ev00031baa9ejo2i9j | 900 | 300 | 929.4 |
| Jayam | cmnslqq3s000314gd2am52182 | 900 | 300 | 601.9 |
| Neil | cmnt215mz0003kf5qniuobif4 | 900 | 300 | 775.7 |
| Abishek | cmnssuc7t0002ml1qx2zkk9d5 | 800 | 300 | 800.0 (played 0 matches — seed only) |
| Hugo Bayer | cmnt5r3gn0003fcvkvoapm8mp | 800 | 300 | 771.8 |
| Ananth Arunkumar | cmntwpyxo000252ktcrxn9pz2 | 800 | 300 | 658.9 |
| Siddarth Ravi | cmny2ophk0002b1meg57kubpy | 800 | 300 | 850.0 |
| Yuanchen Tang | cmnza0dlp000210lf5foenafc | 700 | 300 | 678.7 |
| Alan Finkelstein | cmo0sb9vh0002ni9fwyr956vl | 600 | 300 | 854.8 |

**Initial sigma for all players: 0.06** (the v1_release default)

---

## Step-by-Step Instructions

### Step 1 — Delete all Illini Cup RatingTransactions

Delete every `RatingTransaction` row where:
- `ratingCategoryId = 'cmnf16inz000igg3xr510ys9j'`
- AND `playerProfileId` is in the list above
- AND either:
  - `matchId` is null (seed transactions), OR
  - `matchId` references a `Match` whose `eventId` is one of the 7 in-scope event IDs

Query to identify match-linked transactions:
```sql
DELETE FROM "RatingTransaction"
WHERE "ratingCategoryId" = 'cmnf16inz000igg3xr510ys9j'
  AND "playerProfileId" IN (<list of 30 playerProfileIds>)
  AND (
    "matchId" IS NULL
    OR "matchId" IN (
      SELECT id FROM "Match"
      WHERE "eventId" IN (
        'cmnqabooi000810tqo76ok8cn',
        'cmnqaetun0003gk0tdlaimq4e',
        'cmnzd60a400015eslal40e5bo',
        'cmo0ircxu0003epq4jmt2cobg',
        'cmo0mxg070001n2xlzlpgz65e',
        'cmo0n0izi0001kic05ugwpwaw',
        'cmo0zi5ep0001o3awtn2150uq'
      )
    )
  );
```

Verify the count before executing: there should be approximately 229 rows deleted
(55 seed transactions + 174 match transactions based on the exported data).

### Step 2 — Reset PlayerRating to corrected starting state

For each player in the table above, update their `PlayerRating` row to:
- `rating` = Seed Rating
- `rd` = Initial RD
- `sigma` = 0.06
- `gamesPlayed` = 0
- `lastActiveDay` = NULL
- `updatedAt` = now()

For Abishek specifically, after resetting, their PlayerRating should remain at this state
(no matches to replay). Their target final rating = seed = 800.0.

### Step 3 — Replay matches and write new transactions

Fetch all completed, non-default matches from the 7 in-scope events, ordered by `createdAt`:

```sql
SELECT m.id, m."player1Id", m."player2Id", m."winnerId", m."createdAt",
       array_agg(mg."player1Points" ORDER BY mg."gameNumber") AS p1_points,
       array_agg(mg."player2Points" ORDER BY mg."gameNumber") AS p2_points
FROM "Match" m
LEFT JOIN "MatchGame" mg ON mg."matchId" = m.id
WHERE m."eventId" IN (<7 event IDs>)
  AND m."status" = 'COMPLETED'
  AND m."isDefault" = false
  AND m."player1Id" IS NOT NULL
  AND m."player2Id" IS NOT NULL
GROUP BY m.id
ORDER BY m."createdAt";
```

This should return 87 matches.

For each match, calculate `games_p1` and `games_p2` by counting games won per side
(a game is won by the player with higher points in that game).

**Day numbering:** Use the match index (0-based) as the `day` field in the algorithm.
Since all matches happen within 2 days, inactivity inflation within the tournament is
negligible — sequential integers work correctly here.

Run the v1_release algorithm on each match (see Algorithm section below), then:

1. Insert a `RatingTransaction` row for **each player** in the match:
   - `playerProfileId` = the player's ID
   - `ratingCategoryId` = `cmnf16inz000igg3xr510ys9j`
   - `matchId` = the match ID
   - `ratingBefore` / `ratingAfter` / `delta` = from the algorithm output
   - `rdBefore` / `sigmaBefore` / `lastActiveDayBefore` = player state before the update
   - `createdAt` = the match's `createdAt` timestamp

2. Update the `PlayerRating` row for each player to the post-match state.

### Step 4 — Verify

After the replay, query each player's final `PlayerRating.rating` and compare to the
Target Final Rating column in the player table. Values should match to within ±0.1
(floating point rounding). If any player is off by more, check match ordering or
whether a match was included/excluded incorrectly.

---

## Algorithm (v1_release)

Find the rating engine in the Rallybase codebase — it is the `updateMatch` function
(or equivalent) used by the app. The v1_release parameter set is:

```
base_k                  = 120
inactivity_rd_growth_c  = 100
enable_score_modifier   = false   ← this is the critical one; must be off
winner_nonnegative      = true
conservative_redistribution = true
default_sigma           = 0.06
min_rd                  = 40
max_rd                  = 350
min_rating              = 100
gap_scale               = 250
gap_cap                 = 2.0
casual_weight           = 0.5
junior_rd_min           = 220
junior_sigma_multiplier = 1.2
```

None of the Illini Cup players are flagged as juniors, so junior parameters have no effect.

If the codebase algorithm has diverged from the above, use the reference implementation
below to ensure the replay exactly reproduces the pre-calculated target ratings.

### Reference implementation (Python)

```python
import copy, math

def clip(v, lo, hi): return max(lo, min(hi, v))

BASE_K = 120
INACTIVITY_C = 100
MIN_RD, MAX_RD = 40, 350
MIN_RATING = 100
DEFAULT_SIGMA = 0.06

def expected_win_prob(r_a, r_b):
    return 1.0 / (1.0 + 10 ** (-(r_a - r_b) / 400.0))

def inflate_rd(rd, days, is_junior=False):
    c = INACTIVITY_C * (1.25 if is_junior else 1.0)
    return clip(math.sqrt(rd**2 + c * max(days, 0)), MIN_RD, MAX_RD)

def effective_k(rd, sigma, matches_played):
    rd_factor    = clip(rd / 200.0, 0.6, 1.8)
    sigma_factor = clip(sigma / DEFAULT_SIGMA, 0.7, 1.6)
    new_boost    = 1.25 if matches_played < 20 else 1.0
    return BASE_K * rd_factor * sigma_factor * new_boost

def update_match(state_a, state_b, day, winner_id, id_a, id_b):
    """
    state_x: dict with keys rating, rd, sigma, matches_played, last_active_day
    Returns (new_state_a, new_state_b)
    """
    a, b = copy.deepcopy(state_a), copy.deepcopy(state_b)

    # Inactivity RD inflation
    for p in (a, b):
        days = 0 if p['last_active_day'] is None else max(day - p['last_active_day'], 0)
        p['rd'] = inflate_rd(p['rd'], days)

    p_a = expected_win_prob(a['rating'], b['rating'])
    score_a = 1.0 if winner_id == id_a else 0.0
    score_b = 1.0 - score_a

    delta_a = effective_k(a['rd'], a['sigma'], a['matches_played']) * (score_a - p_a)
    delta_b = effective_k(b['rd'], b['sigma'], b['matches_played']) * (score_b - (1 - p_a))

    # score modifier is disabled — no further modification

    # Winner non-negativity clamp
    if winner_id == id_a and delta_a < 0: delta_a = 0.0
    if winner_id == id_b and delta_b < 0: delta_b = 0.0

    a['rating'] = max(MIN_RATING, a['rating'] + delta_a)
    b['rating'] = max(MIN_RATING, b['rating'] + delta_b)

    for p, delta in ((a, delta_a), (b, delta_b)):
        p['rd']      = clip(p['rd'] * (0.92 if p['matches_played'] < 30 else 0.97), MIN_RD, MAX_RD)
        p['sigma']   = clip(p['sigma'] * (0.995 + 0.01 * (abs(delta) > BASE_K)), 0.03, 0.20)
        p['matches_played']  += 1
        p['last_active_day'] = day

    return a, b, delta_a, delta_b
```

---

## Edge Cases

- **Wubing Xia** (`cmnwn5r7700029aywls9h56xv`): Withdrew. Played 0 matches. Delete their
  seed transaction(s) and reset PlayerRating to `rating=2025, rd=210, sigma=0.06, gamesPlayed=0`.
  No match transactions to write.

- **Abishek** (`cmnssuc7t0002ml1qx2zkk9d5`): Also played 0 matches. Reset to
  `rating=800, rd=300, sigma=0.06, gamesPlayed=0`. No match transactions.

- **Marvin Yu** (`cmmmk6tki000511x85yeolytq`) and **DEV_ACCOUNT** (`cmntums7q0002ttdu92bmr343`):
  Do not touch. Their transactions may reference Illini Cup matches but they are out of scope.
  If the delete query in Step 1 would catch them, exclude their playerProfileIds from the WHERE clause.

- **Default matches** (`isDefault = true`): Exclude from replay. These are walkovers with
  no game scores and should not generate RatingTransactions.

---

## Source of Truth

The target final ratings in the player table above were produced by
`custom_algorithm/data/Illini_Cup_26/illini_cup_replay.py` using the same algorithm
and the corrected seed/RD values. If there are any discrepancies after the replay,
that script is the reference — re-run it and compare outputs.

The full comparison table (live vs adjusted vs USATT) is in
`custom_algorithm/data/Illini_Cup_26/illini_cup_rating_comparison.txt`.
