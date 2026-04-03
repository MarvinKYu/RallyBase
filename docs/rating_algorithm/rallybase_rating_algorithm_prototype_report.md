# RallyBase Table Tennis Rating Prototype — Research Summary and Implementation Spec

## Purpose

This document summarizes research findings and converts them into an implementation-oriented spec for a **prototype custom singles rating algorithm** for competitive table tennis.

The target use case is **serious tournament play**, with the rating intended to measure **predictive playing strength** rather than résumé or tournament ranking points.

This document is written so Claude Code can use it as a direct implementation brief.

---

## 1. Product goals and hard constraints

### Primary goal
The rating should estimate:

> How likely Player A is to beat Player B in a rated singles match right now.

### Match types in scope
- Singles only
- Best of 5 is the default match format
- Main tournament structures:
  - Round robin
  - Single elimination
  - Group stage -> single elimination

### Rating pools
Implement separate pools:

1. **Tournament rating**
   - Main rating
   - Used for serious tournaments
   - Primary predictive measure

2. **League rating**
   - Separate from tournament rating
   - Implement later

3. **Casual rated matches**
   - Implement later
   - Affect **tournament rating**, but at reduced weight

4. **Casual unrated matches**
   - Implement later
   - No rating effect

### Hard business rules
1. **All tournament matches count equally**
   - No extra weight for finals, semis, etc.

2. **New players should move quickly**
   - Ratings should converge fast early

3. **Established players should stabilize**
   - Lower movement once enough evidence exists

4. **Inactive players should not lose rating automatically**
   - Only their uncertainty should rise

5. **Younger players should generally be more volatile**
   - Want to experiment with:
     - age-based junior flag
     - higher default volatility
     - recent improvement trend

6. **Game score should matter**
   - Especially when the skill gap is large
   - Example: 1600 beats 1000 by 3-2, the 1000 may deserve some credit
   - Example: 1200 vs 1300, 3-2 vs 3-0 should matter less

7. **A player should never lose rating for a win**
   - Winner can gain a little
   - Winner can gain zero
   - Winner should not go down after winning

8. **Absolute rating floor = 100**

---

## 2. Research conclusions

## 2.1 What kind of system fits best?

A plain Elo system is **too limited** for this problem.

Why:
- It does not naturally model uncertainty
- It does not naturally handle inactivity via uncertainty growth
- It does not naturally support junior volatility
- It does not naturally support game-score sensitivity with good calibration
- It does not naturally support the rule “reward a strong loss, but never penalize a win”

The best foundation is a **Glicko-2-style system**, optionally borrowing ideas from **TrueSkill**.

### Why Glicko-2 is the best base
Glicko-2 gives each player:
- **rating** `R`
- **rating deviation / uncertainty** `RD`
- **volatility** `sigma`

This maps very well to your goals:
- New players move fast because they start with high uncertainty
- Established players stabilize because uncertainty shrinks
- Inactive players do not decay in rating, but uncertainty increases
- Junior players can have elevated volatility or uncertainty
- Sparse match history is handled better than fixed-K Elo

### Why not TrueSkill as the primary base
TrueSkill is strong conceptually, especially for Bayesian uncertainty handling, but for this product:
- it adds implementation complexity
- it is more than you currently need for 1v1 singles
- Glicko-2 is easier to explain and easier to prototype incrementally

### Why not whole-history rating for v1
Whole-History Rating is attractive for time-varying strength, but is heavier to implement and maintain.
For a real-time product prototype, it is probably too complex for v1.

### Final recommendation
Use:

> **Glicko-2-inspired core state + custom game-score modifier + strict winner non-negativity guardrail**

---

## 3. Core data model

For each player, store:

```ts
type PlayerRatingState = {
  playerId: string

  // Main values
  rating: number          // displayed rating scale, e.g. centered around 1500
  rd: number              // uncertainty / rating deviation
  sigma: number           // volatility

  // Metadata for custom behavior
  matchesPlayed: number
  lastRatedAt: string | null

  // Optional modeling fields
  birthYear?: number | null
  isJunior?: boolean
  recentTrend?: number | null

  // Separate pools
  tournamentRating: number
  tournamentRd: number
  tournamentSigma: number

  leagueRating: number
  leagueRd: number
  leagueSigma: number
}
```

### Recommended v1 defaults
These are starter values, not final tuned values:

```ts
DEFAULT_RATING = 1500
DEFAULT_RD = 300
DEFAULT_SIGMA = 0.06

MIN_RATING = 100
MAX_RD = 350
MIN_RD = 40
```

For juniors:
```ts
JUNIOR_SIGMA_MULTIPLIER = 1.15 to 1.35
```

For casual-rated matches affecting tournament pool:
```ts
CASUAL_WEIGHT = 0.35 to 0.60
```

---

## 4. High-level algorithm design

Each rated match update should have **three layers**:

1. **Base skill update**
   - Derived from a Glicko-2-style expected outcome model
   - Dominated by win/loss + opponent strength

2. **Game-score modifier**
   - Small or moderate correction based on how surprising the match score was
   - Should matter more when the skill gap is large
   - Should also scale with uncertainty/volatility

3. **Guardrails**
   - Winner net change cannot be negative
   - Rating floor at 100
   - Optional anti-inflation controls

This means:

```text
net_update = base_update + game_score_modifier + policy_adjustments
```

then clamp with business rules.

---

## 5. Modeling match outcome

## 5.1 Outcome layer
Use a standard paired-comparison expectation:

```text
E(A beats B) = logistic( rating_diff adjusted by uncertainty )
```

You can either:

### Option A — implement full Glicko-2 formulas
Pros:
- principled
- proven
- uncertainty-aware

Cons:
- slightly more work

### Option B — implement “Glicko-lite”
Use Elo-style win probability but scale update size by uncertainty and volatility.

For prototype speed, I recommend:

> **Use a Glicko-lite implementation first, then swap in full Glicko-2 if needed**

### Suggested base expectation
```text
deltaR = R_A - R_B

pA = 1 / (1 + 10^(-deltaR / 400))
pB = 1 - pA
```

Then define an uncertainty-sensitive effective step size:

```text
kA = baseK * f(rdA, sigmaA, matchesPlayedA, inactivityA)
kB = baseK * f(rdB, sigmaB, matchesPlayedB, inactivityB)
```

Where `f(...)` is larger when:
- RD is higher
- sigma is higher
- player is new
- player is junior
- player has been inactive

---

## 6. Modeling game score within best-of-5

This is the custom part.

The goal is:

- 3-0, 3-1, 3-2 are not equally informative
- but they should only matter a little when players are close in rating
- they should matter more when the result deviates strongly from expectation

## 6.1 Recommended principle
Do **not** use raw games won directly.
Use a **surprise-based residual**:

```text
game_score_residual = observed_games_won_share - expected_games_won_share
```

### Observed share examples
Best of 5:
- 3-0 -> winner share = 1.00, loser share = 0.00
- 3-1 -> winner share = 0.75, loser share = 0.25
- 3-2 -> winner share = 0.60, loser share = 0.40

### Expected share
You need a mapping from win probability to expected game share.

For prototype v1, use a simple heuristic function:

```text
expected_game_share_winner = 0.5 + alpha * (pWinner - 0.5)
```

That is too weak alone, so better:

```text
expected_games_won_by_A = g(pA)
```

Where `g` maps match win probability to expected best-of-5 game share.

### Recommended v1 lookup table
Instead of overcomplicating the math, use a piecewise mapping.

Example:

```ts
function expectedGameShareFromMatchWinProb(p: number): number {
  if (p < 0.15) return 0.18
  if (p < 0.25) return 0.24
  if (p < 0.35) return 0.31
  if (p < 0.45) return 0.40
  if (p < 0.55) return 0.50
  if (p < 0.65) return 0.60
  if (p < 0.75) return 0.69
  if (p < 0.85) return 0.76
  return 0.82
}
```

Later, this can be replaced by simulation or empirical calibration.

## 6.2 Score modifier formula

Define:

```text
obsA = gamesWonA / totalGames
expA = expectedGameShareFromMatchWinProb(pA)
residualA = obsA - expA
residualB = -residualA
```

Then compute a score modifier:

```text
scoreModA = lambda * gapFactor * uncertaintyFactor * residualA
scoreModB = lambda * gapFactor * uncertaintyFactor * residualB
```

Where:

### `gapFactor`
Makes score matter more when skill gap is larger.

Suggested:
```text
gapFactor = min( gapCap, 1 + abs(R_A - R_B) / gapScale )
```

Starter values:
```ts
gapScale = 250
gapCap = 2.5
```

Interpretation:
- 100-point gap -> small boost
- 600-point gap -> much larger boost

### `uncertaintyFactor`
Makes surprising scorelines matter more when players are uncertain or volatile.

Suggested:
```text
uncertaintyFactor =
  1
  + c1 * normalizedRD
  + c2 * normalizedSigma
```

Starter values:
```ts
normalizedRD = clamp((rdA + rdB) / 2 / 200, 0.5, 2.0)
normalizedSigma = clamp((sigmaA + sigmaB) / 2 / 0.06, 0.5, 2.0)

c1 = 0.35
c2 = 0.20
```

### `lambda`
Global strength of game-score effect.

Recommended for v1:
```ts
lambda = 8 to 16
```

Use **small at first**.

---

## 7. Preventing “winner loses rating for a win”

This is a hard requirement.

After computing base update + score modifier:

```text
rawDeltaWinner = baseDeltaWinner + scoreModWinner
rawDeltaLoser  = baseDeltaLoser  + scoreModLoser
```

Apply guardrails:

```text
deltaWinner = max(0, rawDeltaWinner)
deltaLoser  = rawDeltaLoser
```

This ensures:
- winner never goes down
- winner can gain zero
- winner can still gain some points

### Important side effect
This can create **inflation**, especially when:
- loser gains for a strong loss
- winner is prevented from going negative

So you should choose one of two prototype strategies:

---

## 8. Inflation strategy options

## Option 1 — Conservative prototype (recommended)
Allow game score to only **redistribute the winner’s positive gain**, not create extra rating mass.

### Mechanism
1. Compute base deltas from outcome
2. If loser deserves score credit, reduce winner’s gain first
3. Winner can never go below 0
4. Loser can only gain if winner still had enough positive base gain to “fund” it

This is safer and more stable.

### Pros
- Much less inflation
- Easier to tune
- Easier to explain

### Cons
- Underdog strong losses may get smaller rewards than desired in some cases

## Option 2 — Experimental prototype
Allow loser to gain even if winner has already been clamped at 0.

### Mechanism
- You inject rating mass in some matches
- Then counterbalance with an explicit anti-inflation mechanism

Possible anti-inflation mechanisms:
- periodic mean re-centering
- shrink all ratings toward global mean by tiny amount each period
- dynamic global offset adjustment
- only display ratings after normalization

### Pros
- Strong-loss reward can be more visible

### Cons
- Harder to calibrate
- More risk of strange long-run drift
- Easier to game

### Recommendation
For v1 prototype:

> **Use Option 1 (conservative redistribution)**

That gives you the product behavior you want without immediately destabilizing the rating pool.

---

## 9. Junior handling

This is a major experimental dimension.

### Recommended v1 rule
Use an explicit junior flag:

```ts
isJunior = age >= 6 && age <= 16
```

Then modify only uncertainty/volatility behavior, not direct score bonuses.

### Suggested junior adjustments
- higher initial RD
- higher sigma
- slower RD contraction
- faster RD re-expansion after inactivity

Example:
```ts
if (isJunior) {
  rd = max(rd, 220)
  sigma *= 1.20
}
```

### Why this is better than direct bonus points
It keeps the model predictive:
- juniors move faster because the system is less certain about them
- not because they receive arbitrary rating gifts

---

## 10. Inactivity handling

Do **not** decay rating directly.

Instead, before processing the next rated match, re-inflate uncertainty based on time since last rated match.

### Suggested method
Let `daysInactive` be days since last rated match.

```text
rd' = min(MAX_RD, sqrt(rd^2 + c * daysInactive))
```

Starter constant:
```ts
c = 2 to 6
```

Juniors may use a larger constant:
```ts
if (isJunior) c *= 1.25
```

This makes inactive players:
- not weaker by assumption
- but less known

That is the correct product interpretation.

---

## 11. Casual-rated and league logic

## 11.1 Separate pools
Tournament and league should be fully separate ratings.

A league match updates only league pool.
A tournament match updates only tournament pool.

## 11.2 Casual rated matches
A casual-rated match updates the **tournament pool** at reduced weight:

```text
effectiveWeight = CASUAL_WEIGHT
```

Apply this multiplier to both:
- base update
- score modifier

Suggested starter:
```ts
CASUAL_WEIGHT = 0.5
```

---

## 12. Rating floor behavior

Absolute floor:
```ts
MIN_RATING = 100
```

Apply:
```text
newRating = max(100, oldRating + delta)
```

### Important note
Use the floor as a policy clamp, not as a change to expectation formulas.
Always compute expectations using actual current rating state before clamping.

---

## 13. Recommended v1 algorithm pseudocode

```ts
function updateMatch(playerA, playerB, match, poolType) {
  // 1. Select correct rating pool
  let A = loadPoolState(playerA, poolType)
  let B = loadPoolState(playerB, poolType)

  // 2. Apply inactivity RD inflation before match
  A.rd = inflateRdForInactivity(A)
  B.rd = inflateRdForInactivity(B)

  // 3. Apply junior volatility logic
  Aeff = applyJuniorAdjustments(A)
  Beff = applyJuniorAdjustments(B)

  // 4. Compute expected match win probability
  pA = expectedWinProb(Aeff.rating, Beff.rating)
  pB = 1 - pA

  // 5. Compute base outcome update
  scoreA = match.winnerId === A.playerId ? 1 : 0
  scoreB = 1 - scoreA

  kA = effectiveK(Aeff, match)
  kB = effectiveK(Beff, match)

  baseDeltaA = kA * (scoreA - pA)
  baseDeltaB = kB * (scoreB - pB)

  // 6. Compute observed game shares
  totalGames = match.gamesWonA + match.gamesWonB
  obsA = match.gamesWonA / totalGames
  obsB = match.gamesWonB / totalGames

  // 7. Compute expected game shares
  expA = expectedGameShareFromMatchWinProb(pA)
  expB = 1 - expA

  // 8. Compute score residuals
  residualA = obsA - expA
  residualB = obsB - expB

  gapFactor = computeGapFactor(Aeff.rating, Beff.rating)
  uncertaintyFactor = computeUncertaintyFactor(Aeff, Beff)

  scoreModA = LAMBDA * gapFactor * uncertaintyFactor * residualA
  scoreModB = LAMBDA * gapFactor * uncertaintyFactor * residualB

  // 9. Apply match weight
  weight = getMatchWeight(match.type) // tournament=1, casual-rated<1
  baseDeltaA *= weight
  baseDeltaB *= weight
  scoreModA *= weight
  scoreModB *= weight

  // 10. Conservative redistribution rule
  rawA = baseDeltaA + scoreModA
  rawB = baseDeltaB + scoreModB

  if (scoreA === 1) {
    finalA = Math.max(0, rawA)
    finalB = rawB

    // optional: if wanting strict conservation of "score bonus",
    // cap loser positive gain to winner's positive base slack
  } else {
    finalB = Math.max(0, rawB)
    finalA = rawA
  }

  // 11. Apply floor
  A.rating = Math.max(MIN_RATING, A.rating + finalA)
  B.rating = Math.max(MIN_RATING, B.rating + finalB)

  // 12. Update RD / sigma
  A = updateUncertaintyPostMatch(A, match, finalA, residualA)
  B = updateUncertaintyPostMatch(B, match, finalB, residualB)

  // 13. Save
  savePoolState(A, poolType)
  savePoolState(B, poolType)
}
```

---

## 14. Parameterization plan for prototype

Do not try to “perfect” constants before implementation.
Build tunable parameters from day one.

### Core tunables
```ts
BASE_K
DEFAULT_RATING
DEFAULT_RD
DEFAULT_SIGMA
MIN_RATING

LAMBDA                 // game-score strength
GAP_SCALE
GAP_CAP
CASUAL_WEIGHT

JUNIOR_SIGMA_MULTIPLIER
JUNIOR_RD_MIN
INACTIVITY_RD_GROWTH_C
```

### Suggested starter set
```ts
DEFAULT_RATING = 1500
DEFAULT_RD = 300
DEFAULT_SIGMA = 0.06

BASE_K = 24
MIN_RATING = 100

LAMBDA = 10
GAP_SCALE = 250
GAP_CAP = 2.0

CASUAL_WEIGHT = 0.5

JUNIOR_SIGMA_MULTIPLIER = 1.2
JUNIOR_RD_MIN = 220

INACTIVITY_RD_GROWTH_C = 3
```

---

## 15. Evaluation plan

A rating system prototype is not done when it runs.
It is done when it is evaluated.

You should build an offline evaluation harness.

## 15.1 Metrics to measure
1. **Prediction accuracy**
   - log loss
   - Brier score
   - accuracy by probability bucket

2. **Calibration**
   - when model says 70%, does it win about 70%?

3. **Convergence speed**
   - how quickly new players stabilize

4. **Volatility**
   - average rating movement for established players

5. **Inflation / drift**
   - mean rating over time
   - percentile drift over time

6. **Manipulation resistance**
   - test scenarios for sandbagging or selective participation

## 15.2 A/B comparisons to run
Compare at least these systems on historical data:

1. **Plain Elo**
2. **Glicko-lite without game score**
3. **Glicko-lite with game score**
4. **Glicko-lite with game score + junior adjustments**
5. **Full Glicko-2 variant**
6. **Conservative redistribution vs inflation-allowing variant**

### Key question
Does adding game-score information actually improve out-of-sample prediction?

If not, keep it smaller or remove it.

---

## 16. Prototype roadmap

## Phase 1 — simplest working version
Implement:
- tournament pool
- league pool
- Glicko-lite expectation
- RD inflation from inactivity
- junior flag
- game-score modifier
- winner non-negativity clamp
- rating floor

No UI tuning yet. Just engine + test harness.

## Phase 2 — calibration and replay
- replay historical results
- optimize constants
- compare variants
- inspect rating trajectories

## Phase 3 — full Glicko-2 upgrade
Swap base engine from Glicko-lite to full Glicko-2 if:
- prediction improves
- prototype remains explainable enough

## Phase 4 — anti-gaming policy layer
Potential later additions:
- no-show penalties
- suspicious activity review flags
- rating lock conditions for brand-new players
- provisional status badges
- opponent repetition discount if needed

---

## 17. Recommended implementation decisions for v1

If Claude Code needs crisp decisions instead of open-ended options, use these:

### Final v1 choices
- Use **Glicko-lite** as the core update engine
- Store `rating`, `rd`, `sigma`
- Use **separate tournament and league pools**
- Let **casual-rated** update tournament pool at **0.5 weight**
- Use **junior flag** for ages 6–16
- Juniors get:
  - higher minimum RD
  - higher sigma
- Inactivity increases RD only
- Game-score effect is based on:
  - observed game share
  - expected game share from match win probability
  - gap factor
  - uncertainty factor
- Use **conservative redistribution**
- Winner net delta is clamped to `>= 0`
- Rating floor is `100`

---

## 18. Open questions for later tuning

These do not need to block v1 implementation:

1. What exact mapping should convert match win probability to expected game share?
2. Should junior behavior use age alone, or also recent improvement trend?
3. How strong should casual-rated match weight be?
4. Should underdog strong losses ever create net rating inflation?
5. Should rating displays include provisional/confidence badges?

---

## 19. Bottom-line recommendation

The best prototype path is:

> **Build a Glicko-2-inspired rating engine with explicit uncertainty and volatility, then add a small surprise-based game-score modifier that scales with skill gap and uncertainty, while enforcing a hard rule that winners never lose rating for a win.**

For stability, the first prototype should use:
- conservative redistribution of score credit
- separate pools for tournament and league
- reduced weight for casual-rated results
- junior volatility through uncertainty modeling, not arbitrary point bonuses

That gets you a system that is:
- predictive
- tunable
- understandable
- resistant to obvious failure modes
- realistic to implement now

---

## 20. Research basis

This spec was informed by the following research directions reviewed during discovery:
- Elo and margin-of-victory Elo extensions
- Glicko and Glicko-2 uncertainty/volatility models
- TrueSkill Bayesian skill distributions
- Whole-History Rating for time-varying strength
- table-tennis-specific rating system examples and rating policy considerations
- ranking-vs-rating systems in tennis, badminton, chess, and table tennis

The main takeaways applied here are:
- **use a rating system, not a tournament-points ranking system**
- **model uncertainty explicitly**
- **treat inactivity as uncertainty growth**
- **let game score matter only as a secondary, surprise-based signal**
- **protect against the pathological case where a player wins but loses rating**
- **be careful about inflation when rewarding strong losses**
