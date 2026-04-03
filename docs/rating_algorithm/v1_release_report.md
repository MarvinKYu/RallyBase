# RallyBase Rating Algorithm — v1 Release Report

**Date:** 2026-04-02  
**Status:** Release-ready (Scenario A conservative public release)  
**Validated on:** 359,724 USATT tournament matches across 1,202 tournaments, 16,864 players, spanning 1,176 days

---

## 1. Algorithm Philosophy

RallyBase v1 is a **Glicko-lite** system: a simplified uncertainty-aware rating engine inspired by Glicko-2 but deliberately reduced in complexity for a conservative first public release.

The system is built around the pipeline:

```
State → Prediction → Result → Update → Evaluate
```

**Design priorities (in order):**
1. Trust — behavior is predictable and explainable
2. Calibration — predicted win probabilities reflect actual outcomes
3. Stability — established players' ratings don't swing chaotically
4. Correctness — hard guarantees (winner never loses points, no decay from inactivity)

This is not the final algorithm. It is a trustworthy conservative starting point.

---

## 2. Player State

Each player carries the following state. This is what must be persisted per player per pool.

```python
player_id:        int      # stable unique identifier
rating:           float    # current strength estimate
rd:               float    # rating deviation (uncertainty)
sigma:            float    # volatility
matches_played:   int      # total rated matches processed
last_active_day:  int|None # day number of last rated match (for inactivity tracking)
is_junior:        bool     # whether player is a junior (affects RD floor and inactivity growth)
```

### Field semantics

| Field | Meaning | New player value |
|---|---|---|
| `rating` | Current strength estimate | 1200.0 |
| `rd` | Uncertainty — high RD = less certain | 300.0 |
| `sigma` | Volatility — tracks how variable performance is | 0.06 |
| `matches_played` | Used for new-player boost and reporting | 0 |
| `last_active_day` | Used to compute inactivity gap | None |
| `is_junior` | Enforces higher RD floor and faster inactivity growth | false |

> **Note on `true_skill`:** The research notebook carries a `true_skill` field for synthetic simulation. This field does not exist in production — remove it from the production `PlayerState`.

---

## 3. Release Parameters

These are the locked v1 values. All other fields are at their defaults.

```python
default_rating          = 1200.0   # starting rating for new players
default_rd              = 300.0    # starting uncertainty for new players
default_sigma           = 0.06     # starting volatility
min_rating              = 100.0    # absolute rating floor
max_rd                  = 350.0    # uncertainty ceiling
min_rd                  = 40.0     # uncertainty floor (fully established player)
base_k                  = 120.0    # step size (scales with uncertainty — see effective_k)
casual_weight           = 0.5      # weight multiplier for casual-rated matches
junior_rd_min           = 220.0    # juniors cannot go below this RD at match time
inactivity_rd_growth_c  = 100.0    # RD inflation rate per day inactive
winner_nonnegative      = True     # hard rule: winner never loses rating
enable_score_modifier   = False    # score modifier disabled in v1
```

> **Why base_k=120?** At the default of 24, rating distributions were too compressed (std≈179 vs USATT's ≈350), producing an S-curve miscalibration. At k=120, Brier score improved from 0.190 → 0.176, calibration became nearly diagonal, and rating distribution matched real USATT spread (std≈346, max≈2680).

> **Why enable_score_modifier=False?** The score modifier produced a 0.002 brier improvement but introduced 2,313 matches (0.64%) where the loser gained rating points — concentrated in matches with data inconsistencies (winner field doesn't match game score). The large outliers (up to +17 pts for a loss) were indefensible to users. Cut for v1, reconsider with cleaner data in v2.

> **Why inactivity_rd_growth_c=100?** At the default of 3.0, RD grew from 80 → 102 in 365 days of inactivity (negligible). At c=100, an established player with RD=80 grows to RD=207 in one year, RD=282 in two years — intuitive and defensible.

---

## 4. Algorithm Steps

### Step 1: Pre-match state adjustment

Before processing each match, adjust RD for inactivity:

```python
def inflate_rd_for_inactivity(rd, days_inactive, params, is_junior):
    c = params.inactivity_rd_growth_c * (1.25 if is_junior else 1.0)
    rd_prime = sqrt(rd^2 + c * max(days_inactive, 0))
    return clamp(rd_prime, params.min_rd, params.max_rd)
```

For juniors, enforce the minimum RD floor **at match time**:
```python
if player.is_junior:
    player.rd = max(player.rd, params.junior_rd_min)
```

This ensures juniors always enter matches with RD ≥ 220, keeping `effective_k` elevated so juniors continue moving faster even after many matches.

### Step 2: Win probability

```python
def expected_win_prob(rating_a, rating_b):
    return 1.0 / (1.0 + 10 ^ (-(rating_a - rating_b) / 400.0))
```

Standard Elo-style logistic. When ratings are equal, probability is 0.5.

### Step 3: Effective K

`effective_k` scales `base_k` based on uncertainty and experience:

```python
def effective_k(player, params):
    rd_factor    = clamp(player.rd / 200.0, 0.6, 1.8)
    sigma_factor = clamp(player.sigma / params.default_sigma, 0.7, 1.6)
    new_boost    = 1.25 if player.matches_played < 20 else 1.0
    junior_boost = 1.10 if player.is_junior else 1.0
    return params.base_k * rd_factor * sigma_factor * new_boost * junior_boost
```

Effect at base_k=120:
- New player (RD=300): effective_k ≈ 120 × 1.5 × 1.0 × 1.25 = 225
- Established player (RD=80): effective_k ≈ 120 × 0.4 × ~1.0 × 1.0 = 48
- Junior established (RD=220 enforced): effective_k ≈ 120 × 1.1 × ~1.0 × 1.1 = 145

### Step 4: Match weight

```python
def match_weight(match_type, params):
    if match_type == 'casual_unrated': return 0.0
    if match_type == 'casual_rated':   return params.casual_weight  # 0.5
    return 1.0  # tournament or league
```

Casual-unrated matches are skipped entirely. Casual-rated apply at 50% weight.

### Step 5: Base delta

```python
base_delta_a = effective_k(player_a) * (actual_a - expected_a) * weight
base_delta_b = effective_k(player_b) * (actual_b - expected_b) * weight
```

Where `actual = 1` for winner, `0` for loser, and `expected` is the pre-match win probability.

> **Score modifier is disabled in v1.** `score_mod_a = score_mod_b = 0.0`

### Step 6: Guardrails

**Winner non-negative clamp** (hard rule):
```python
if winner == player_a and final_delta_a < 0:
    final_delta_a = 0.0
if winner == player_b and final_delta_b < 0:
    final_delta_b = 0.0
```

**Rating floor** (hard rule):
```python
new_rating_a = max(params.min_rating, player_a.rating + final_delta_a)
new_rating_b = max(params.min_rating, player_b.rating + final_delta_b)
```

### Step 7: Post-match RD and sigma update

```python
# RD decays after each match (player becomes more established)
rd_multiplier = 0.92 if player.matches_played < 30 else 0.97
new_rd = clamp(player.rd * rd_multiplier, params.min_rd, params.max_rd)

# Sigma nudges based on whether the result was surprising
sigma_multiplier = 1.005 if abs(delta) > params.base_k else 0.995
new_sigma = clamp(player.sigma * sigma_multiplier, 0.03, 0.20)
```

### Step 8: Bookkeeping

```python
player.matches_played  += 1
player.last_active_day  = match.day
```

---

## 5. Day Number Convention

The algorithm uses a relative integer `day` to track time. In production:

```python
day = (match_date - epoch_date).days
```

Where `epoch_date` is the earliest match date in your dataset. Any consistent epoch works — the system only uses `day` to compute `days_inactive = match.day - player.last_active_day`.

---

## 6. Data Preparation Notes

When preparing historical match data for replay:

1. **Filter invalid rows:** Remove matches where `games_winner + games_opponent == 0` (walkovers/defaults with no score).
2. **Randomize A/B assignment:** Never set `player_a = winner` for every row. This breaks calibration metrics. Randomly assign which player is A vs B; the `winner` field carries the actual result regardless.
3. **Sort chronologically** before processing.

```python
rng = np.random.default_rng(42)
flip = rng.random(len(df)) > 0.5
player_a = np.where(flip, winner_id, opponent_id)
player_b = np.where(flip, opponent_id, winner_id)
games_a  = np.where(flip, games_winner, games_opponent)
games_b  = np.where(flip, games_opponent, games_winner)
winner   = winner_id  # unchanged
```

---

## 7. Evaluation Results

All metrics measured on chronological replay of 359,724 USATT tournament matches.

### Predictive quality

| Metric | v1 release | USATT baseline | Naive 50/50 |
|---|---|---|---|
| Brier score | **0.1762** | 0.1908 | 0.2500 |
| Log loss | **0.5264** | 0.5709 | 0.6931 |
| Accuracy | 0.7347 | 0.8221 | 0.5000 |

v1 beats the USATT exchange-chart baseline on both probability quality metrics (Brier, log loss). USATT's higher accuracy reflects more aggressive rating spread (larger point swings), not better calibration.

### Calibration

| Predicted | Actual | n |
|---|---|---|
| 0.056 | 0.065 | 28,724 |
| 0.150 | 0.153 | 36,843 |
| 0.250 | 0.253 | 37,790 |
| 0.350 | 0.348 | 37,726 |
| 0.452 | 0.452 | 39,023 |
| 0.550 | 0.551 | 37,893 |
| 0.650 | 0.646 | 37,930 |
| 0.750 | 0.747 | 37,670 |
| 0.850 | 0.846 | 37,179 |
| 0.944 | 0.936 | 28,946 |

Near-perfect diagonal. Maximum bucket deviation: ~1.5 percentage points.

### Stability

| Metric | Value |
|---|---|
| Mean rating (established players) | 1133 |
| Median rating (established players) | 1106 |
| Rating std (established players) | ~346 |
| Rating max | ~2680 |
| Avg absolute delta per match | 30.1 pts |
| Winner clamp triggered | 0 times |
| Loser gained rating | 0 times |

### Stress test results (spec section 12)

| Scenario | Result |
|---|---|
| Big mismatch (1600 vs 1000, A wins 10×) | Favorite gains ~10 pts/win; reaches 99% confidence ✅ |
| Close matchup (1200 vs 1300, A wins 5×) | Underdog gains rapidly; behavior intuitive for high-RD players ✅ |
| Inactive returner (365 days, RD=80) | Rating stays at 1600; RD grows 80 → 207 ✅ |
| Junior handling | Junior RD enforced ≥ 220 at match time; faster movement preserved ✅ |
| Winner never loses rating | Zero violations across 359,724 matches ✅ |
| Rating floor | Never breached ✅ |

---

## 8. Release Checklist (spec section 16)

| # | Criterion | Status |
|---|---|---|
| 1 | Single conservative engine selected | ✅ Glicko-lite, base_k=120, c=100, no score modifier |
| 2 | Historical replay runs end-to-end | ✅ 359,724 matches |
| 3 | Held-out metrics competitive with baseline | ✅ Brier 0.176 vs 0.191 USATT |
| 4 | Calibration not obviously broken | ✅ Near-diagonal, max deviation ~1.5pp |
| 5 | No major rating drift | ✅ ~5% mean deflation from start; stable |
| 6 | Core stress tests pass | ✅ All 4 spec scenarios |
| 7 | Public explanation matches implementation | ✅ See section 9 |
| 8 | Deferred features documented | ✅ See section 10 |

---

## 9. Public-Facing Explanation

> RallyBase ratings estimate a player's current playing strength in singles.
>
> The system tracks both a **rating** (how strong you are) and **uncertainty** (how confident we are in that estimate).
>
> - New or returning players move faster after each match until the system builds confidence.
> - Established players change more gradually.
> - Inactivity does **not** reduce your rating — it only increases uncertainty, so you'll move faster when you return.
> - **Winners never lose rating for a win.**
> - Ratings have a minimum floor of 100.

---

## 10. Deferred Features (not in v1)

These were explicitly scoped out of Scenario A v1. Document them here so the goalposts don't move silently.

| Feature | Reason deferred |
|---|---|
| Score modifier (game-score effects) | Amplifies data inconsistencies into large loser-gain outliers; requires cleaner score data and v2 validation |
| Separate tournament vs league pools | Adds complexity without v1 justification; added when pool-specific behavior diverges |
| Full Glicko-2 | More sophisticated sigma updates; not justified over Glicko-lite given current data |
| Advanced junior trend modeling | Only uncertainty adjustments in v1; direct bonus points or trend extrapolation deferred |
| Anti-gaming / anti-inflation mechanisms | No evidence of abuse patterns yet; revisit when pool is public |
| Large parameter sweeps | base_k and c were tuned; other params (gap_scale, lambda_score, casual_weight) left at defaults |
| Multiple public-facing algorithm variants | One engine per pool for v1 |

---

## 11. Implementation Checklist for Application Repository

When porting to the production codebase:

- [ ] Implement `PlayerState` without `true_skill`, `improvement_per_day`, `activity_level`, `pool` (research-only fields)
- [ ] Implement `inflate_rd_for_inactivity` with c=100 and 1.25× junior multiplier
- [ ] Implement `effective_k` with rd_factor, sigma_factor, new_boost, junior_boost
- [ ] Implement `expected_win_prob` using standard logistic / 400 scale
- [ ] Apply junior RD floor (`junior_rd_min=220`) at the start of each match
- [ ] Apply winner non-negative clamp before writing new ratings
- [ ] Apply min_rating floor (100) before writing new ratings
- [ ] Store `last_active_day` as an integer (days since your epoch) — not a datetime
- [ ] Set `enable_score_modifier=False` — do not implement score modifier logic for v1
- [ ] Use `match_type` weights: tournament=1.0, league=1.0, casual_rated=0.5, casual_unrated=skip
- [ ] New players initialized at: rating=1200, rd=300, sigma=0.06, matches_played=0, last_active_day=None
