# Domain Rules

These rules define the core product logic and must remain consistent.

## One Account System

Each person has one user account.

A user can have multiple roles:

- PLAYER
- TOURNAMENT_DIRECTOR
- ORG_ADMIN
- PLATFORM_ADMIN

## Ratings Are Scoped

Ratings belong to:

- player
- organization
- discipline

Examples:

- USATT Singles
- NCTTA Singles

Ratings from one organization must never affect another.

## Rating History

Maintain two structures:

- current rating snapshot
- immutable rating transaction ledger

## Match Result Verification

Submitted results are **not official** until confirmed by the opponent.

## Match Scoring

Matches must support:

- best of 3
- best of 5
- best of 7

Games must support:

- first to 11 win by 2
- first to 21 win by 2

Store **per-game point scores**, not just game totals.

## MVP Tournament Format

The MVP must support:

- single elimination brackets

Round robin can be added later.