# Codex Implementation Brief — v0.16.1

## Context

RallyBase is a Next.js 16 (App Router) + TypeScript tournament management app. The stack is:
- Tailwind CSS v4 (no shadcn/ui)
- Clerk auth (`@clerk/nextjs` v7)
- Prisma v5 on Neon PostgreSQL
- Zod v4
- Vitest v4

**Critical conventions — do not violate:**
- No react-hook-form. All forms use plain `useActionState` + native FormData.
- Business logic lives in `src/server/services/`. Pages call services; services call repositories. Algorithms in `src/server/algorithms/` are pure functions with no DB access.
- Do not add unsolicited comments, docstrings, or refactors beyond what is specified.

---

## What to Build

Two independent changes, both part of v0.16.1.

---

### Change A — Reformat the "All Matches" page for RR→SE events

**File to modify:** `src/app/tournaments/[id]/events/[eventId]/matches/page.tsx`  
**Component to modify:** `src/components/tournaments/EventMatchRow.tsx`  
**New component to create:** `src/components/tournaments/RRtoSEMatchesList.tsx`

#### Background

The matches page at `/tournaments/[id]/events/[eventId]/matches` currently shows a flat list of all matches for any event format. This change applies **only to `RR_TO_SE` events**. For all other formats (`SINGLE_ELIMINATION`, `ROUND_ROBIN`), leave the page exactly as-is.

In an `RR_TO_SE` event:
- RR-phase matches have `groupNumber: number` (1-indexed)
- SE-phase matches have `groupNumber: null`

The `findMatchesByEventId` repository call already returns `groupNumber` on every match. The `getEventDetail` call already returns `event.format` (an `EventFormat` enum from Prisma). Both are already called in the page.

#### What to change

**1. `SerializedEventMatch` in `src/components/tournaments/EventMatchRow.tsx`**

Add `groupNumber: number | null` to the type. Do not change the component render logic.

**2. `src/app/tournaments/[id]/events/[eventId]/matches/page.tsx`**

Add `groupNumber: m.groupNumber` to the serialization map.

When `event.format === "RR_TO_SE"`, render a `<RRtoSEMatchesList>` client component (see below) instead of the existing flat `<ul>`.

For all other formats, keep the existing flat list render unchanged.

**3. New file: `src/components/tournaments/RRtoSEMatchesList.tsx`**

A `"use client"` component. Props:
```ts
{ matches: SerializedEventMatch[] }
```

Behavior:
- Search bar at the top. A plain text `<input>` with `useState`. Filters matches client-side (case-insensitive) by whether either player's `displayName` includes the query. Applies to both columns simultaneously.
- Two-column layout side by side (left = RR, right = SE). Use Tailwind `grid grid-cols-2 gap-6` or similar.
- **Left column header:** "Round Robin"
- **Right column header:** "Single Elimination"
- **Left column content — RR matches** (`groupNumber !== null`):
  - Group by `groupNumber`, sorted ascending.
  - Each group: a subsection label "Group {N}" followed by the matches for that group.
  - Within each group, preserve the existing order (already ordered by round asc, position asc from the DB).
  - Render each match using the existing `<EventMatchRow>` component.
- **Right column content — SE matches** (`groupNumber === null`):
  - If no SE matches exist yet, show a short message: `"SE bracket not yet generated"` in muted text.
  - Otherwise, order matches by `round` descending (highest round = Final at top). Within a round, order by `position` ascending.
  - Each round: a subsection label derived from the round number using this logic (where `maxRound = Math.max(...seMatches.map(m => m.round))`):
    - `round === maxRound` → `"Final"`
    - `round === maxRound - 1` → `"Semifinals"`
    - `round === maxRound - 2` → `"Quarterfinals"`
    - `round === maxRound - 3` → `"Round of 16"`
    - `round === maxRound - 4` → `"Round of 32"`
    - anything lower → `"Round of ${Math.pow(2, maxRound - round + 1)}"`
  - Render each match using the existing `<EventMatchRow>` component.

Style the section labels (e.g. "Group 1", "Final") as small, muted text — e.g. `text-xs font-medium text-text-3 uppercase tracking-wide` or similar. Match the visual language of the rest of the app (uses `text-text-1`, `text-text-2`, `text-text-3`, `bg-surface`, `bg-elevated`, `border-border`, `border-border-subtle` Tailwind tokens).

---

### Change B — Allow self-confirm when birth year verification is active

**File to modify:** `src/server/services/match.service.ts`

#### Background

`confirmMatchResult` currently blocks any attempt where `submission.submittedById === confirmingProfileId` with `"You cannot confirm your own submission"`. This is too broad: when the tournament uses `BIRTH_YEAR` or `BOTH` verification, the submitter should be allowed to confirm their own submission by correctly entering the **opponent's birth year** (not their own code).

The specific rule:
- `CODE` method: self-confirm is still **blocked**. The submitter has the code and cannot use it to confirm their own submission.
- `BIRTH_YEAR` method: self-confirm is **allowed**. The birth year check (already in the function) is sufficient.
- `BOTH` method: self-confirm is **allowed via birth year only**. When the confirmer is the submitter, **skip the code check entirely** (the submitter already has the code — requiring it would not be a meaningful verification). The birth year check still runs.

#### What to change

Restructure the verification block in `confirmMatchResult` (currently lines ~149–175 of `src/server/services/match.service.ts`):

1. Compute `const isSelfConfirm = submission.submittedById === confirmingProfileId;` before the verification checks.

2. The **code check** (`verificationMethod === "CODE" || verificationMethod === "BOTH"`) should only run when `!isSelfConfirm`. When self-confirming, skip it entirely.

3. The **birth year check** (`verificationMethod === "BIRTH_YEAR" || verificationMethod === "BOTH"`) runs unconditionally (same as today).

4. Replace the unconditional self-confirm block:
   ```ts
   // OLD — remove this:
   if (submission.submittedById === confirmingProfileId) {
     return { error: "You cannot confirm your own submission" };
   }
   ```
   With a targeted block that only fires for `CODE` method:
   ```ts
   if (isSelfConfirm && verificationMethod === "CODE") {
     return { error: "You cannot confirm your own submission" };
   }
   ```

5. The "you are not a player in this match" check that follows remains unchanged.

No changes to any other files for this fix. No UI changes needed — the confirm form already conditionally shows the birth year field based on `verificationMethod`.

---

## Commits

After implementing both changes and verifying the build compiles with no TypeScript errors:

1. **Code commit** (both changes together):
   ```
   feat(v0.16.1): RR_TO_SE match list reformat and birth year self-confirm
   ```
   Then immediately create and push the git tag:
   ```
   git tag v0.16.1
   git push origin v0.16.1
   ```

2. **Do not create the docs commit.** That will be handled separately.

---

## Out of scope

- Do not modify any test files.
- Do not modify any other pages, components, or service functions beyond what is listed above.
- Do not change the existing flat-list behavior for SE-only or RR-only events.
- Do not add error handling, loading states, or suspense boundaries beyond what already exists in the page.
