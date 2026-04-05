# Codex Implementation Brief — v0.16.2

## Context

RallyBase is a Next.js 16 (App Router) + TypeScript tournament management app.
- Tailwind CSS v4, no shadcn/ui
- No react-hook-form — all forms use `useActionState` + native FormData
- Business logic in `src/server/services/`, pages call services, services call repositories
- Do not add unsolicited comments, docstrings, refactors, or abstractions beyond what is specified

Working directory: `C:\Users\marvi\Documents\Personal\TTRC_Project\project_root`

---

## Changes

### 1 — Entrants list: sort by rating descending + scrollable

**File:** `src/app/tournaments/[id]/events/[eventId]/page.tsx`

The Entrants section (around line 346) renders `event.eventEntries` in insertion order. Each entry exposes `entry.playerProfile.playerRatings` — find the rating via `r.ratingCategoryId === event.ratingCategoryId`.

**Changes:**
1. Sort `event.eventEntries` by the matching rating value descending before the `.map()`. Entries with no matching rating (unrated) go at the bottom. Sort inline using `.slice().sort(...)` — do not mutate the original array.
2. Wrap the `<ul className="overflow-hidden rounded-lg border border-border">` that renders entrants in a `div` with `max-h-96 overflow-y-auto`.

---

### 2 — Tournament search results: scrollable

**File:** `src/app/tournaments/page.tsx`

The right column renders a paginated list of tournaments starting around line 186. The `<ul className="overflow-hidden rounded-lg border border-border">` that renders `items` should be wrapped in a `div` with `max-h-[28rem] overflow-y-auto`.

---

### 3 — Remove "View all past" link below past list

**File:** `src/app/tournaments/page.tsx`

`TournamentPreviewList` (defined near the top of the file) renders a preview of 5 items. When `tournaments.length > 5` it also renders a link below the list: `{viewAllLabel} ({tournaments.length}) →`. Remove that conditional link block entirely (the `{tournaments.length > 5 && <Link...>}` block inside `TournamentPreviewList`). The header-level "View all →" link in the `Past` section stays.

---

### 4 — Player search: default to USATT org + Singles discipline

**Files:** `src/app/players/page.tsx`, `src/components/players/PlayerSearchForm.tsx`

**In `players/page.tsx`:**

After fetching `organizations`, compute:
```ts
const usattOrg = organizations.find((o) => o.name === "USATT");
const defaultOrgId = usattOrg?.id ?? "";
```

Replace:
```ts
const ratingCategories = org ? await getRatingCategoriesForOrg(org) : [];
```
With:
```ts
const defaultRatingCategories = defaultOrgId && !org
  ? await getRatingCategoriesForOrg(defaultOrgId)
  : [];
const ratingCategories = org ? await getRatingCategoriesForOrg(org) : defaultRatingCategories;
const defaultDisciplineId =
  defaultRatingCategories.find((c) => c.name.toLowerCase().includes("singles"))?.id ?? "";
```

Use `org || defaultOrgId` everywhere `org` is currently used to filter the player search (the `organizationId` argument to `searchPlayers` and the `sortRatingCategoryId` fallback logic). Keep the existing `sortRatingCategoryId` fallback logic — just replace the bare `org` with `org || defaultOrgId` in the initial condition.

Pass two new props to `<PlayerSearchForm>`:
```tsx
<PlayerSearchForm
  organizations={organizations}
  ratingCategories={ratingCategories}
  defaultOrgId={defaultOrgId}
  defaultDisciplineId={defaultDisciplineId}
/>
```

**In `PlayerSearchForm.tsx`:**

Add `defaultOrgId?: string` and `defaultDisciplineId?: string` to the props type.

On the org `<select>`: change `defaultValue={org}` → `defaultValue={org || defaultOrgId}`.
On the discipline `<select>`: change `defaultValue={discipline}` → `defaultValue={discipline || defaultDisciplineId}`.

---

### 5 — Remove status pill from EventMatchRow on matches page and RRtoSEMatchesList

**Files:** `src/components/tournaments/EventMatchRow.tsx`, `src/app/tournaments/[id]/events/[eventId]/matches/page.tsx`, `src/components/tournaments/RRtoSEMatchesList.tsx`

**In `EventMatchRow.tsx`:**
Add `showStatus?: boolean` to the component props (alongside `match`). Default it to `true`. Wrap the status pill `<span>` in `{showStatus !== false && (...)`.

**In `matches/page.tsx`:**
Pass `showStatus={false}` to every `<EventMatchRow>` in the flat list.

**In `RRtoSEMatchesList.tsx`:**
Pass `showStatus={false}` to every `<EventMatchRow>` in both the RR and SE sections.

---

### 6 — Green + bold winner name on all match cards

Make completed-match winner names `font-semibold text-green-400` everywhere.

**`src/components/tournaments/EventMatchRow.tsx`:**
`p1Bold`/`p2Bold` classes: change from `"font-semibold"` to `"font-semibold text-green-400"`.

**`src/components/tournaments/ManageEventMatchList.tsx`:**
`isWinner1`/`isWinner2` winner classes (around lines 109, 113): change from `"font-semibold text-text-1"` to `"font-semibold text-green-400"`.

**`src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx` — `MatchCard` function:**
`p1Wins`/`p2Wins` winner classes (around lines 93, 110): change from `"font-semibold text-text-1"` to `"font-semibold text-green-400"`.

---

### 7 — Default-win `(D)` indicator in EventMatchRow and ManageEventMatchList

The bracket page `MatchCard` already renders `(D)` for default wins. Add the same to `EventMatchRow` and `ManageEventMatchList`.

**`src/components/tournaments/EventMatchRow.tsx`:**
- Add `isDefault: boolean` to `SerializedEventMatch` type.
- In the render, append ` (D)` to the winner's `displayName` when `match.isDefault` is true. Only the winner gets it (same as bracket).

**`src/app/tournaments/[id]/events/[eventId]/matches/page.tsx`:**
Add `isDefault: m.isDefault` to the serialization map.

**`src/app/tournaments/[id]/events/[eventId]/page.tsx`:**
The same `SerializedEventMatch` serialization exists around line 161. Add `isDefault: m.isDefault` there too.

**`src/components/tournaments/ManageEventMatchList.tsx`:**
- Add `isDefault?: boolean` to the `MatchRow` type.
- In the render, append ` (D)` to the winner's name when `match.isDefault` is true.

**`src/app/tournaments/[id]/events/[eventId]/manage/page.tsx`:**
Around line 87, `serializedMatches` is built. Add `isDefault: m.isDefault` to each row.

---

### 8 — Bracket center column label: "Semifinals / Final"

**File:** `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx`

In `StackedCenterColumn` (around line 406), the label div currently renders:
```tsx
<p className="text-xs font-bold uppercase tracking-wide text-text-1">Final</p>
```
Change the text to `"Semifinals / Final"`.

---

### 9 — Persist create event fields on error

**Files:** `src/server/actions/tournament.actions.ts`, `src/components/tournaments/EventForm.tsx`

**In `tournament.actions.ts`:**

Extend `TournamentActionState`:
```ts
export type TournamentActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  fields?: Record<string, string>;
} | null;
```

In `createEventAction`, on every early-return error path (auth failure, validation failure, service error), include:
```ts
fields: Object.fromEntries(
  [...formData.entries()].filter(([, v]) => typeof v === "string")
) as Record<string, string>,
```

**In `EventForm.tsx`:**

The component already receives `state` from `useActionState`. For every `<input>`, `<select>`, and `<textarea>` in the create-event form path, add a fallback: if the field currently uses a fixed `defaultValue` or no default, change it to `state?.fields?.["fieldName"] ?? existingDefault`. Use the `name` attribute value as the key (e.g. `state?.fields?.["name"]`, `state?.fields?.["format"]`, etc.).

Only update `defaultValue` for fields in the create path. The edit path already receives `defaultValues` from the server — do not change that logic.

---

### 10 — Player number in player search results

**File:** `src/app/players/page.tsx`

`playerNumber` is a scalar field on `PlayerProfile` and is already returned by the repository query (no DB change needed).

In the player results list (around line 115), the current layout is:
```tsx
<span>{p.displayName}</span>
<span>{rating ? Math.round(rating.rating) : "Unrated"}</span>
```

Change to a three-element row: player number on the far left (muted), display name in the middle (flex-1), rating on the far right. Example layout:
```tsx
<span className="w-10 shrink-0 text-xs text-text-3">#{p.playerNumber}</span>
<span className="flex-1 text-sm font-medium text-text-1">{p.displayName}</span>
<span className="shrink-0 text-xs text-text-3">{rating ? Math.round(rating.rating) : "Unrated"}</span>
```

The outer `<Link>` already uses `flex items-center justify-between` — adjust to `flex items-center gap-3` so spacing is consistent.

---

## Commits

After all 10 changes are implemented and `tsc --noEmit` passes:

1. **Code commit:**
   ```
   feat(v0.16.2): UI fixes — entrants sort/scroll, winner colors, match list cleanup, player search defaults
   ```
   Then immediately:
   ```
   git tag v0.16.2
   git push origin main --tags
   ```

2. **Do not create the docs commit.** That will be handled separately.

---

## Out of scope

- Do not modify any test files.
- Do not change `updateEventAction` — the persist-fields change applies to `createEventAction` only.
- Do not add green color to any element other than winner name text.
- Do not add `(D)` to the bracket `MatchCard` — it already renders it correctly.
- Do not modify any other files not listed above.
