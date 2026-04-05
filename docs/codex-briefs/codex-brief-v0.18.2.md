# Codex Brief — v0.18.2: Fix TD Authorization

## Context

`isAuthorizedAsTD(clerkId, tournament)` in `src/server/services/admin.service.ts` is the single source of truth for TD access. It returns `true` for the tournament creator, platform admin, or org admin for the tournament's org. Several pages and actions still use hardcoded `tournament.createdByClerkId === userId` comparisons instead, which means org admins and platform admins are incorrectly blocked.

**Signature:**
```typescript
export async function isAuthorizedAsTD(
  clerkId: string,
  tournament: { createdByClerkId: string | null; organizationId: string },
): Promise<boolean>
```

This version ships NO schema changes. It is purely a find-and-replace of authorization logic across 7 locations.

---

## Changes Required

### 1. `src/server/actions/bracket.actions.ts` — line 24

`isAuthorizedAsTD` is already imported. The condition at line 24 still uses the raw string comparison. Change it to use the import.

**Current:**
```typescript
if (!tournament || tournament.createdByClerkId !== userId) {
  redirect(`/tournaments/${tournamentId}/events/${eventId}`);
}
```

**Replace with:**
```typescript
if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
  redirect(`/tournaments/${tournamentId}/events/${eventId}`);
}
```

Also audit the rest of `bracket.actions.ts` — if any other action function in that file uses a `createdByClerkId` check, apply the same fix.

---

### 2. `src/app/matches/[matchId]/td-submit/page.tsx` — line 26

`getMatchWithSubmission` already returns `match.event.tournament` with `createdByClerkId` and `organizationId`. Add the import and update the guard.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
// Must be the tournament creator
if (match.event.tournament.createdByClerkId !== userId) {
  redirect(`/matches/${matchId}/submit`);
}
```

**Replace with:**
```typescript
if (!(await isAuthorizedAsTD(userId, match.event.tournament))) {
  redirect(`/matches/${matchId}/submit`);
}
```

---

### 3. `src/app/tournaments/[id]/edit/page.tsx` — line 38

`getTournamentDetail` returns a tournament with `createdByClerkId` and `organizationId` on the model. Add the import and update the guard.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
if (tournament.createdByClerkId !== userId) redirect(`/tournaments/${id}`);
```

**Replace with:**
```typescript
if (!(await isAuthorizedAsTD(userId, tournament))) redirect(`/tournaments/${id}`);
```

---

### 4. `src/app/tournaments/[id]/events/new/page.tsx` — line 19–20

`getTournamentDetail` returns a tournament with both required fields. Add the import and replace the `isTournamentCreator` check.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
const isTournamentCreator = tournament.createdByClerkId === userId;
if (!isTournamentCreator) redirect(`/tournaments/${id}`);
```

**Replace with:**
```typescript
const isTournamentCreator = await isAuthorizedAsTD(userId, tournament);
if (!isTournamentCreator) redirect(`/tournaments/${id}`);
```

The variable name `isTournamentCreator` is intentionally kept because it is passed as a prop to `<EventForm isTournamentCreator={isTournamentCreator} />` — do not rename it or change the JSX.

---

### 5. `src/app/tournaments/[id]/events/[eventId]/bracket/page.tsx` — line 704

`getEventDetail(eventId)` returns an event with `event.tournament` which includes the full organization object and model fields including `createdByClerkId` and `organizationId`. Add the import and update the assignment.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
const isTD = !!userId && event.tournament.createdByClerkId === userId;
```

**Replace with:**
```typescript
const isTD = !!userId && await isAuthorizedAsTD(userId, event.tournament);
```

Do NOT change any other usages of `isTD` in this file — only the assignment at line 704.

---

### 6. `src/app/tournaments/[id]/events/[eventId]/edit/page.tsx` — line 31

`getEventDetail` provides `event.tournament` with both required fields. Add the import and update the guard.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
if (event.tournament.createdByClerkId !== userId) redirect(`/tournaments/${id}/events/${eventId}`);
```

**Replace with:**
```typescript
if (!(await isAuthorizedAsTD(userId, event.tournament))) redirect(`/tournaments/${id}/events/${eventId}`);
```

---

### 7. `src/app/tournaments/[id]/events/[eventId]/standings/page.tsx` — line 49

Same pattern as the bracket page.

**Add import:**
```typescript
import { isAuthorizedAsTD } from "@/server/services/admin.service";
```

**Current:**
```typescript
const isTD = !!userId && event.tournament.createdByClerkId === userId;
```

**Replace with:**
```typescript
const isTD = !!userId && await isAuthorizedAsTD(userId, event.tournament);
```

Do NOT change any other usages of `isTD` in this file.

---

## After making changes

1. Run `npx tsc --noEmit` — must pass with zero errors.
2. Run `npm run build` — must complete successfully.
3. Do NOT run integration tests (pre-existing failures in tournament-status and tournament-edit tests are unrelated to this version and will be fixed in v0.18.4).
4. Do NOT make any other changes beyond what is listed above. No refactoring, no comment changes, no new abstractions.
