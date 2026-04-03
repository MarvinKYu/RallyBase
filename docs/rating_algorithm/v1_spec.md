# RallyBase Rating Algorithm — Scenario A V1 Spec

## Purpose

This document defines the **Scenario A conservative public-release v1** for the RallyBase rating algorithm.

The goal of this version is **not** to maximize sophistication. The goal is to ship a rating system that is:

- understandable
- stable in common cases
- uncertainty-aware
- explainable to users
- validated through offline replay
- conservative enough to trust publicly

This spec intentionally narrows scope relative to the broader AI-generated research docs.

---

## 1. Product objective

The rating should answer:

> Given Player A and Player B before a singles match, how likely is Player A to win?

This is a **predictive strength** system, not a résumé/ranking-points system.

The output users care about is the player rating, but the underlying objective is the quality of the model's **pre-match win probability estimates**.

---

## 2. Scope for Scenario A v1

### In scope
- Singles only
- One main public rating pool
- Glicko-lite style engine
- Uncertainty-aware updates
- Inactivity handled through uncertainty growth, not direct decay
- Conservative winner-protection rule
- Historical replay evaluation before release
- Optional provisional/confidence treatment for users with limited match history

### Out of scope for v1
- Separate tournament vs league production pools
- Casual-rated weighting complexity
- Strong game-score / scoreline-based modifiers
- Full Glicko-2 implementation
- Advanced anti-inflation normalization systems
- Junior trend modeling beyond simple uncertainty adjustments
- Multiple public-facing algorithm variants

---

## 3. Core model philosophy

The system is built around the pipeline:

**State → Prediction → Result → Update → Evaluate**

### State
Before a match, each player has a current rating state.

### Prediction
The model converts player states into a pre-match win probability.

### Result
A real match outcome is observed.

### Update
The player states are adjusted according to the result and current uncertainty.

### Evaluate
Across many matches, the model is judged on predictive accuracy, calibration, drift, and stability.

---

## 4. Player state

Each player should store the following fields:

```python
@dataclass
class PlayerState:
    player_id: int
    rating: float
    rd: float
    sigma: float
    matches_played: int = 0
    last_active_day: int | None = None
    is_junior: bool = False
```

### Meaning of each field

#### `rating`
Current estimate of player strength.

#### `rd`
Rating deviation / uncertainty.
- High RD = the system is less certain.
- Low RD = the system is more certain.

#### `sigma`
Volatility parameter.
For v1, this should be stored and updated consistently, but not used for highly aggressive custom behavior.

#### `matches_played`
Used for provisional handling, reporting, and tuning update aggressiveness if needed.

#### `last_active_day`
Used to inflate RD after inactivity.

#### `is_junior`
Optional boolean flag.
For v1, junior handling should only affect uncertainty behavior, not award direct bonus points.

---

## 5. Default parameters

These are starting values for experimentation, not permanent truths.

```python
DEFAULT_RATING = 1500
DEFAULT_RD = 300
DEFAULT_SIGMA = 0.06

MIN_RATING = 100

BASE_K = 24

INACTIVITY_RD_GROWTH_C = 3.0

JUNIOR_RD_MIN = 220
JUNIOR_SIGMA_MULTIPLIER = 1.2
```

These values should be tunable through a config object.

---

## 6. Pre-match state adjustments

Before each rated match is processed:

### 6.1 Inflate RD for inactivity
A player's rating should not decay from inactivity, but uncertainty should increase.

Recommended form:

```python
rd_prime = min(MAX_RD, sqrt(rd**2 + c * days_inactive))
```

Where:
- `c` is the inactivity growth constant
- `days_inactive` is time since last rated match

### 6.2 Junior uncertainty adjustment
If `is_junior=True`, v1 may apply conservative uncertainty adjustments such as:
- enforcing a higher minimum RD
- applying a slightly elevated sigma

This should remain modest and should not introduce arbitrary point bonuses.

---

## 7. Win probability model

Use a simple Elo-style logistic expected win probability:

```python
p_a = 1 / (1 + 10 ** (-(rating_a - rating_b) / 400))
p_b = 1 - p_a
```

This gives the model's pre-match belief that Player A beats Player B.

This formula is simple, interpretable, and good enough for a conservative v1.

---

## 8. Rating update rule

Use a Glicko-lite style update:

```python
delta = effective_k * (actual - expected)
```

Where:
- `actual` is 1 for a win and 0 for a loss
- `expected` is the pre-match win probability
- `effective_k` scales with uncertainty

### 8.1 Effective K behavior
`effective_k` should be larger when:
- RD is higher
- the player is new
- optionally the player is a junior

This gives the desired behavior:
- new players move faster
- established players stabilize

### 8.2 Outcome-only base update
For Scenario A v1, the base engine should be driven primarily by **win/loss outcome**, not by scoreline.

---

## 9. Guardrails

### 9.1 Winner never loses rating for a win
This is a hard business rule.

After computing the raw delta:
- if the player won, final delta must be clamped to `>= 0`

### 9.2 Rating floor
Ratings may never go below:

```python
MIN_RATING = 100
```

### 9.3 Conservative release philosophy
If a feature produces unintuitive behavior, the conservative decision is to simplify or disable that feature for v1.

---

## 10. Score modifier policy

### Release recommendation
For Scenario A v1:

- **Preferred**: ship with no score modifier
- **Acceptable only if clearly validated**: ship with an extremely weak score modifier

### Reason
The score modifier is the most custom and highest-risk part of the algorithm. It is the most likely source of:
- unintuitive updates
- tuning complexity
- trust issues
- drift/inflation side effects

### Decision rule
A score modifier should only remain in v1 if historical replay shows a clear benefit in held-out metrics without introducing obvious weird cases.

Otherwise, it should be removed from release.

---

## 11. Evaluation requirements before release

The rating system should not be considered release-ready merely because it runs.

Before release, it must be evaluated using **historical chronological replay**.

### Required metrics
At minimum:
- Brier score
- Log loss
- Accuracy
- Calibration table / reliability check
- Mean rating over time
- Average absolute rating delta
- RD behavior over time for representative players

### Required qualitative checks
- Big mismatch behavior looks intuitive
- Close matches behave sensibly
- New players move quickly but not chaotically
- Inactive returners regain uncertainty without arbitrary rating loss
- Winners never lose points
- No rating falls below the floor

---

## 12. Minimum stress-test scenarios

Before release, manually inspect at least the following:

1. **Big mismatch repeated**
   - Example: 1600 vs 1000
   - Confirm favorite is heavily favored and gains little for expected wins

2. **Close matchup repeated**
   - Example: 1200 vs 1300
   - Confirm updates are moderate and intuitive

3. **Inactive returner**
   - Player disappears, then returns
   - Confirm RD expands but rating does not decay

4. **Junior higher-uncertainty case**
   - Confirm junior behavior is only via uncertainty/volatility, not arbitrary point gifts

---

## 13. Public release constraints

A public v1 should prioritize:
- trust
- explainability
- common-case stability
- conservative behavior

It should not attempt to solve every advanced modeling problem on day one.

This means:
- simpler is better
- fewer custom rules are better
- predictable behavior is better than flashy cleverness

---

## 14. Public-facing explanation draft

The system can be described in plain English as:

- RallyBase ratings estimate a player's current playing strength.
- The system tracks both rating and uncertainty.
- New or uncertain players move faster.
- Established players change more gradually.
- Inactivity does not automatically reduce a player's rating, but it does increase uncertainty.
- Winners never lose rating for a win.
- Ratings have a minimum floor.

This explanation should remain aligned with actual release behavior.

---

## 15. Non-goals for v1

This version is **not** trying to be:
- the final rating algorithm
- perfectly tuned for every edge case
- fully immune to exploitation
- the most statistically sophisticated system possible

It is trying to be:
- a trustworthy conservative starting point
- good enough for public use
- structured for future iteration

---

## 16. Release standard

Scenario A v1 is ready for public release when all of the following are true:

1. A single conservative engine has been selected
2. Historical replay runs end-to-end successfully
3. Held-out metrics are at least competitive with a simpler baseline
4. Calibration is not obviously broken
5. No major rating drift is observed
6. Core stress-test scenarios look intuitive
7. Public-facing explanation matches actual algorithm behavior
8. Deferred features have been explicitly documented
