# Phase 3 Evidence Index — Availability / Scheduled Booking / Instant Booking / Presence

**Phase:** 3
**Created:** 2026-06-17

This index maps every finding to its evidence sources and lists all files inspected during the audit.

---

## Files Inspected (with specific line references)

### Backend — Availability

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/availability/availability.types.ts` | Full file | `AvailabilityExceptionType = "BLOCK" \| "OPEN_EXTRA"` |
| `fayed-backend-v1/src/modules/availability/dto/create-availability-exception.dto.ts` | Full file | BLOCK and OPEN_EXTRA exception creation DTO |
| `fayed-backend-v1/src/modules/availability/dto/replace-weekly-availability.dto.ts` | Full file | Full-replace weekly slots DTO |
| `fayed-backend-v1/src/modules/availability/services/resolve-practitioner-timezone.service.ts` | Full file | 4-tier timezone cascade; `isValidIANATimeZone` |
| `fayed-backend-v1/src/modules/availability/services/validate-availability-overlap.service.ts` | Full file | Duration 30/60 check (lines 76-81); 30-min grid check (lines 90-98); overlap check (lines 38-61) |
| `fayed-backend-v1/src/modules/availability/services/validate-availability-session-conflicts.service.ts` | Full file | Exception-slot conflict guard (lines 13-42); blocking statuses |
| `fayed-backend-v1/src/modules/availability/services/build-availability-windows.service.ts` | Full file | Window composition (lines 35-101); extra BLOCK subtraction (lines 62-72); extra OPEN_EXTRA merge (lines 50-60) |
| `fayed-backend-v1/src/modules/availability/availability-timezone.util.ts` | Full file | `isValidIANATimeZone` uses `Intl.DateTimeFormat` |
| `fayed-backend-v1/src/modules/availability/use-cases/replace-weekly-availability.use-case.ts` | Full file | Replace-all pattern (lines 51-61); no conflict check on existing sessions |
| `fayed-backend-v1/src/modules/availability/use-cases/create-availability-exception.use-case.ts` | Full file | Calls `assertNoBlockingSessionConflict` before creating exception (lines 53-57) |
| `fayed-backend-v1/src/modules/availability/controllers/practitioner-availability.controller.ts` | Full file | Guards: APPROVED + OTP + ACTIVE (lines 55-61); Roles: PRACTITIONER |
| `fayed-backend-v1/src/modules/availability/controllers/public-practitioner-availability.controller.ts` | Full file | `@Public()` with visibility policy gate |
| `fayed-backend-v1/src/modules/availability/repositories/availability-exception.repository.ts` | Full file | Soft delete via `updateMany` (lines 92-104) |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 2093-2130 | `AvailabilitySlot` and `AvailabilityException` schema |

### Backend — Sessions / Scheduled Booking

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/sessions/dto/create-scheduled-session.dto.ts` | Full file | No price/currency fields; `practitionerSlug`, `scheduledStartAt`, `durationMinutes`, `sessionMode` |
| `fayed-backend-v1/src/modules/sessions/use-cases/create-scheduled-session.use-case.ts` | Full file | `PENDING_PAYMENT` creation (line 155); `expiresAt` TTL (lines 137-139); no price |
| `fayed-backend-v1/src/modules/sessions/services/validate-session-schedule-compatibility.service.ts` | Full file | Window compatibility check (lines 57-63); duration match check |
| `fayed-backend-v1/src/modules/sessions/services/validate-session-conflicts.service.ts` | Full file | `assertNoPractitionerConflict` (lines 13-43); `assertNoPatientConflict` (lines 45-73) |
| `fayed-backend-v1/src/modules/sessions/services/expire-unpaid-session-sweeper.service.ts` | Full file | 60s sweep interval (line 12); batch size 50 (line 13); `expirePendingPaymentSessionsInRangeForPractitioner` |
| `fayed-backend-v1/src/modules/sessions/use-cases/expire-unpaid-session.use-case.ts` | Full file | `status: EXPIRED` transition (lines 62-70); wallet reservation release (lines 126-136) |
| `fayed-backend-v1/src/modules/sessions/use-cases/cancel-session.use-case.ts` | Full file | Cancellation policy evaluation; patient ownership check (lines 74-169) |
| `fayed-backend-v1/src/modules/sessions/services/evaluate-session-cancellation-policy.service.ts` | Full file | `resolveBookingType(flowType)` (line 57); time-based rule matching (lines 36-88) |
| `fayed-backend-v1/src/modules/sessions/repositories/session.repository.ts` | Lines 656-673, 1032-1073 | `listSessionsInRangeForPractitioner`; `buildBlockingSessionWhere` with `expiresAt > now` for PENDING_PAYMENT |
| `fayed-backend-v1/src/modules/sessions/dto/sessions.types.ts` | Full file | `SessionItem` (line 131 has `flowType: string`); `SessionDetailsViewModel` with both `status` and `presentationStatus` |
| `fayed-backend-v1/src/modules/sessions/dto/admin-sessions.types.ts` | Full file | `AdminSessionListItem` — NO `flowType`, NO `instantBookingRequestId` |

### Backend — Instant Booking

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/instant-booking/use-cases/create-instant-booking-request.use-case.ts` | Full file | Duplicate guard (lines 78-92); pricing snapshot stored in metadataJson (lines 103-128); TTL 2 min (line 31) |
| `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts` | Full file | **RACE CONDITION**: plain `findById` (line 50) — no `FOR UPDATE`; `linkedSessionId` uniqueness violation unhandled; presence re-check (lines 74-82) |
| `fayed-backend-v1/src/modules/instant-booking/use-cases/reject-instant-booking-request.use-case.ts` | Full file | No notification calls |
| `fayed-backend-v1/src/modules/instant-booking/use-cases/cancel-instant-booking-request.use-case.ts` | Full file | No notification calls |
| `fayed-backend-v1/src/modules/instant-booking/services/validate-instant-booking-eligibility.service.ts` | Full file | Presence check with 2-min TTL (lines 91-119); availability check (lines 121-160); conflict check (lines 162-166) |
| `fayed-backend-v1/src/modules/instant-booking/services/create-session-from-instant-booking.service.ts` | Full file | `flowType: INSTANT` (line 48); `PENDING_PAYMENT` session (line 46); session events with `instantBookingRequestId` |
| `fayed-backend-v1/src/modules/instant-booking/services/validate-instant-booking-status-transition.service.ts` | Full file | State machine: PENDING → all terminal states; `CONVERTED_TO_SESSION` dead state |
| `fayed-backend-v1/src/modules/instant-booking/instant-booking-request.repository.ts` | Full file | `requestInclude` excludes `metadataJson` (lines 36-41); `markExpired` (lines 108-130) |
| `fayed-backend-v1/src/modules/instant-booking/instant-booking.mapper.ts` | Full file | No pricing data surfaced |
| `fayed-backend-v1/src/modules/instant-booking/instant-booking.types.ts` | Full file | `InstantBookingRequest` — NO price, currency, or amount fields |
| `fayed-backend-v1/src/modules/instant-booking/instant-booking-errors.ts` | Full file | 16 error codes; `INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED` for expired/finalized |
| `fayed-backend-v1/src/modules/instant-booking/instant-booking.module.ts` | Full file | No `ScheduleModule` imported; no notifications integration |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 308-315, 2369 | `InstantBookingRequestStatus` enum (6 values); `linkedSessionId @unique` constraint |

### Backend — Presence

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/presence/presence-liveness.ts` | Full file | `PRESENCE_LIVENESS_TTL_MS = 2 * 60 * 1000`; `resolveEffectivePresenceStatus` — read-time demotion only, no write |
| `fayed-backend-v1/src/modules/presence/repositories/practitioner-presence.repository.ts` | Full file | `updateStatus` (line 50) — accepts any PresenceStatus including AWAY (never set elsewhere) |
| `fayed-backend-v1/src/modules/presence/controllers/practitioner-presence.controller.ts` | Full file | All endpoints require APPROVED + OTP + ACTIVE (lines 34-43) |
| `fayed-backend-v1/src/modules/presence/controllers/public-practitioner-presence.controller.ts` | Full file | `@Public()` — visibility gated |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 159-164, 2135 | `PresenceStatus` enum (4 values); `isInstantBookingEnabled` boolean |

### Backend — Matching

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-backend-v1/src/modules/matching/use-cases/create-matching-session.use-case.ts` | Full file | Creates `COMPLETED` state directly; no session creation |
| `fayed-backend-v1/src/modules/matching/services/score-practitioner-match.service.ts` | Full file | 10-signal weighted scoring (lines 17-28); availability as coarse binary check |
| `fayed-backend-v1/src/modules/matching/repositories/matching-candidate.repository.ts` | Lines 122-133 | Presence loaded but only coarse binary availability checked |
| `fayed-backend-v1/prisma/schema.prisma` | Lines 166-170, 1832-1849 | `MatchingSessionStatus`; `MatchingSession` — NO session relation |

### Frontend — Patient Web / Availability

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/practitioners-discovery/components/PublicAvailabilityViewer.tsx` | Full file | Backend windows → client-side slot tiling; practitioner timezone `data.timezone` never displayed (line 496-497); no patient booking conflict pre-check (line 93-95) |
| `fayed-frontend-v1/src/features/practitioners-discovery/components/PractitionerSlugAdsorptionCard.tsx` | Full file | Slot picker integration |
| `fayed-frontend-v1/src/features/practitioners-discovery/hooks/use-public-availability-windows.ts` | Full file | `fetchPublicAvailabilityWindows` API hook |
| `fayed-frontend-v1/src/features/practitioners-discovery/utils/availability-slot-utils.ts` | Lines 81-103 | `buildSlotsFromWindow` — client-side slot tiling |

### Frontend — Patient Web / Sessions

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/sessions/components/PatientSessionsPanel.tsx` | Full file | `presentationStatus` via i18n at lines 687-689 — direct key interpolation |
| `fayed-frontend-v1/src/features/sessions/components/SessionStatusBadge.tsx` | Full file | Direct `presentationStatus` in i18n key (line 41-45); fallback only for null |
| `fayed-frontend-v1/src/features/sessions/components/PatientSessionDetailPanel.tsx` | Full file | `joinAvailability.canJoin` correctly gates join CTA (line 489) |
| `fayed-frontend-v1/src/features/sessions/hooks/use-sessions.ts` | Full file | `useCreateScheduledSession` returns `PENDING_PAYMENT` on success (lines 234-238) |
| `fayed-frontend-v1/src/features/sessions/hooks/use-patient-sessions.ts` | Full file | `usePatientSessions` with pagination |

### Frontend — Patient Web / Instant Booking

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/instant-booking/components/PatientInstantBookingScreen.tsx` | Full file | `usePatientInstantBookingPractitioners`; frozen price display via `instantBookingPricing[currency][minutes]` |
| `fayed-frontend-v1/src/features/instant-booking/components/RequestStateCard.tsx` | Full file | `t(\`statuses.${request.status}\`)` — i18n per status |
| `fayed-frontend-v1/src/features/instant-booking/hooks/use-patient-instant-booking.ts` | Full file | `refetchInterval: 3_000` while PENDING |

### Frontend — Practitioner Web / Availability

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/availability/components/WeeklyScheduleEditor.tsx` | Full file | No awareness of existing bookings (line 139 only consumes weeklySlots); timezone displayed (line 393) |
| `fayed-frontend-v1/src/features/availability/components/AvailabilityExceptionsList.tsx` | Full file | Three exception modes (lines 25, 495-518); no booking-conflict pre-check on delete |
| `fayed-frontend-v1/src/features/availability/api/availability.api.ts` | Full file | `replaceWeeklyAvailability`, `createAvailabilityException`, `deleteAvailabilityException` |

### Frontend — Practitioner Web / Instant Booking

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/instant-booking/components/PractitionerInstantBookingRequestsScreen.tsx` | Full file | 4s polling interval; request state display; accept/reject with error mapping |
| `fayed-frontend-v1/src/features/instant-booking/components/InstantBookingRequestCard.tsx` | Full file | No price in request card (type has no price fields); `disableActions` gating (line 152); `requestExpired` check |
| `fayed-frontend-v1/src/features/instant-booking/api/instant-booking.api.ts` | Full file | `acceptInstantBookingRequest`, `rejectInstantBookingRequest` |
| `fayed-frontend-v1/src/features/instant-booking/hooks/use-instant-booking.ts` | Lines 126-152 | `refetchInterval: 4_000` for pending requests |

### Frontend — Admin Sessions

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx` | Full file | `flowType` absent from list and drawer; no payment data in drawer (lines 826-1033) |
| `fayed-frontend-v1/src/features/admin/sessions/types/admin-sessions.types.ts` | Full file | `AdminSessionListItem` — no `flowType`, no `instantBookingRequestId`, no `paymentStatus` |
| `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionManualDecisionPanel.tsx` | Full file | 6 decision types; 3-confirmation safety; correctly gated |
| `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionRuntimeInspectorScreen.tsx` | Full file | Correctly separates `presentationStatus` from `status`; no `flowType` badge |
| `fayed-frontend-v1/src/features/admin/sessions/types/admin-session-runtime.types.ts` | Full file | `presentationStatus` in inspector types |

### Frontend — Admin Practitioners

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-frontend-v1/src/features/admin/practitioners/components/AdminPractitionersDirectory.tsx` | Full file | `isOnlineNow` presence; no availability management; no scheduling visibility |

### Mobile — Patient Sessions

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/app/(patient)/sessions.tsx` | Lines 406-408 | **AUDIT-012**: direct `t()` for `presentationStatus` without fallback |
| `fayed-mobile/app/(patient)/sessions.tsx` | Lines 563-581 | `mapSessionPresentationTone` — all 9 statuses covered |
| `fayed-mobile/app/(patient)/sessions/[id].tsx` | Lines 429-446 | `formatPresentationStatusLabel` — safe with `?? status` fallback |
| `fayed-mobile/app/(patient)/sessions/[id].tsx` | Lines 448-462 | **AUDIT-027**: `formatModeLabel` — fallback is raw `mode` string |
| `fayed-mobile/app/(patient)/sessions/[id].tsx` | Lines 464-478 | **AUDIT-028**: `formatFlowTypeLabel` — fallback is raw `flowType` string |
| `fayed-mobile/app/(patient)/sessions/[id].tsx` | Lines 55-58 | `joinAvailability.canJoin` as authoritative join gate |
| `fayed-mobile/app/(patient)/sessions/select-time.tsx` | Full file | Native scheduled booking; `usePublicAvailabilityWindows` hook |
| `fayed-mobile/src/features/patient/sessions/hooks.ts` | Lines 48-65 | `usePublicAvailabilityWindows` — backend-provided slots |

### Mobile — Practitioner Sessions

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/app/(practitioner)/sessions/index.tsx` | Lines 520-522 | **AUDIT-013**: direct `t()` for `presentationStatus` without fallback |
| `fayed-mobile/app/(practitioner)/sessions/index.tsx` | Lines 784-800 | **AUDIT-014**: `mapSessionBadge` — `UNDER_REVIEW` case missing |
| `fayed-mobile/app/(practitioner)/sessions/index.tsx` | Lines 829-847 | `mapSessionPresentationTone` — `UNDER_REVIEW` covered |
| `fayed-mobile/app/(practitioner)/sessions/index.tsx` | Lines 544, 371-373 | `sessionMode` in i18n key — needs key existence verification |
| `fayed-mobile/app/(practitioner)/sessions/[id].tsx` | Lines 343-346 | `StatusBadge` uses `mapSessionBadge` — `UNDER_REVIEW` gap active here |
| `fayed-mobile/app/(practitioner)/sessions/[id].tsx` | Lines 604-645 | `shouldAutoCheckJoin`; `canShowPrepareAction`; `canShowJoinCheckAction` |

### Mobile — Instant Booking

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/src/features/instant-booking/components/PatientInstantBookingScreen.tsx` | Full file | Status via i18n keys; 3s polling while PENDING |
| `fayed-mobile/src/features/instant-booking/components/PractitionerInstantBookingRequestsScreen.tsx` | Full file | 4s auto-refetch; accept/reject; `isInstantBookingEnabled` display |
| `fayed-mobile/src/features/instant-booking/api.ts` | Full file | All instant booking endpoints |
| `fayed-mobile/src/features/instant-booking/hooks.ts` | Full file | `refetchInterval: 3_000` while PENDING |

### Mobile — Presence

| File | Lines Inspected | Key Findings |
|------|----------------|--------------|
| `fayed-mobile/src/features/practitioner/presence/api.ts` | Full file | `getMyPresence`, `setMyPresenceStatus`, `setMyInstantBooking`, `heartbeatMyPresence` |
| `fayed-mobile/src/features/practitioner/presence/hooks.ts` | Full file | 60s heartbeat interval; AppState-aware; in-flight guard; optimistic updates |

---

## Finding Evidence

### AUDIT-009

**File:** `fayed-frontend-v1/src/app/[locale]/(public)/patient/sessions/[id]/payment-return/page.tsx`
**Description:** Payment return page is in `(public)` route group — accessible without authentication before `usePatientSession` can error.

### AUDIT-010

**File:** `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts:50`
**Snippet:** `const request = await this.instantBookingRequestRepository.findById(requestId);` — plain read without `FOR UPDATE`. `linkedSessionId` unique constraint at `schema.prisma:2369` — unhandled `UniqueConstraintViolation` if two accepts race.

### AUDIT-011

**File:** `fayed-frontend-v1/src/features/admin/sessions/types/admin-sessions.types.ts:24-42`
**Snippet:** `AdminSessionListItem` has no `flowType` field. Backend `SessionItem` at `sessions.types.ts:131` has `flowType: string`.

### AUDIT-012

**File:** `fayed-mobile/app/(patient)/sessions.tsx:406-408`
**Snippet:**
```tsx
<StatusChip
  label={t(`patientSessionsFlow.presentationStatus.${session.presentationStatus}`)}
  tone={tone}
/>
```

### AUDIT-013

**File:** `fayed-mobile/app/(practitioner)/sessions/index.tsx:520-522`
**Snippet:**
```tsx
<StatusChip
  label={t(`practitioner.presentationStatus.${session.presentationStatus}`)}
  tone={statusTone}
/>
```

### AUDIT-014

**File:** `fayed-mobile/app/(practitioner)/sessions/index.tsx:784-800`
**Snippet:**
```typescript
function mapSessionBadge(status: SessionPresentationStatus): SessionBadge | undefined {
  switch (status) {
    case 'JOINABLE': return 'success';
    case 'IN_PROGRESS': return 'info';
    case 'UPCOMING': return 'primary';
    case 'UNAVAILABLE': return 'neutral';
    case 'COMPLETED': return 'success';
    case 'ENDED': return 'neutral';
    case 'CANCELLED': return 'error';
    case 'NO_SHOW': return 'warning';
    // UNDER_REVIEW is MISSING
  }
  return undefined;
}
```

### AUDIT-015

**File:** `fayed-frontend-v1/src/features/practitioners-discovery/components/PublicAvailabilityViewer.tsx:496-497`
**Snippet:**
```tsx
<span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
```
`data.timezone` from backend is never rendered in the component.

### AUDIT-016

**File:** `fayed-frontend-v1/src/features/practitioners-discovery/components/PublicAvailabilityViewer.tsx:93-95`
**Snippet:**
```tsx
if (current <= earliestAllowedStart) continue;
```
No API call to check patient booking conflicts before slot selection.

### AUDIT-017

**File:** `fayed-frontend-v1/src/features/sessions/components/SessionStatusBadge.tsx:41-45`
**Snippet:**
```tsx
const labelKey = presentationStatus
  ? `presentationStatus.${displayStatus ?? "UNAVAILABLE"}`
  : `status.${displayStatus ?? "DRAFT"}`;
```
`displayStatus ?? "UNAVAILABLE"` only handles null/undefined, not unknown enum values.

### AUDIT-018

**File:** `fayed-frontend-v1/src/features/instant-booking/types/instant-booking.types.ts:84-97`
**Snippet:**
```typescript
export type InstantBookingRequest = {
  id: string; patient: InstantBookingPatient; practitioner: InstantBookingPractitioner;
  requestedDurationMinutes: number; preferredMode: SessionMode;
  status: InstantBookingRequestStatus; requestedAt: string;
  expiresAt: string; respondedAt: string | null; responseReason: string | null;
  linkedSessionId: string | null;
  // NO price, NO currency, NO amount
};
```

### AUDIT-019

**File:** `fayed-frontend-v1/src/features/availability/components/WeeklyScheduleEditor.tsx:139`
**Snippet:**
```tsx
initialDraft = useMemo(() => slotsToDraftSchedule(data.weeklySlots), [data.weeklySlots])
```
Only `weeklySlots` consumed — no API call to fetch existing bookings.

### AUDIT-020

**File:** Grep across `fayed-frontend-v1/src/features/admin/**` — zero references to `instantBookingRequestId`
**Description:** Field absent from all admin session types and components.

### AUDIT-021

**File:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx:826-1033`
**Description:** Session drawer has no payment section. Backend `SessionCancellationPreviewItem` (`sessions.types.ts:266-293`) has payment data but is not used.

### AUDIT-022

**File:** `fayed-frontend-v1/src/features/admin/sessions/components/AdminSessionsListScreen.tsx:55,67-75`
**Snippet:**
```typescript
export const STATUS_FILTERS = ['DRAFT', 'PENDING_PAYMENT', ...];
export type SessionTabValue = 'ALL' | 'PENDING' | 'UPCOMING' | 'UNAVAILABLE' | 'ENDED';
```

### AUDIT-023

**File:** `fayed-backend-v1/src/modules/instant-booking/use-cases/create-instant-booking-request.use-case.ts:103-128`
**Snippet:** `pricingSnapshot` stored in `metadataJson`. Not retrieved in `requestInclude` (`instant-booking-request.repository.ts:36-41`).

### AUDIT-024

**File:** `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts:28-111`
**Description:** Zero notification calls. `instant-booking.module.ts` has no notifications integration.

### AUDIT-025

**File:** `fayed-frontend-v1/src/features/admin/practitioners/components/AdminPractitionersDirectory.tsx`
**Description:** No availability management or visibility. Grep across admin features returned zero relevant results.

### AUDIT-026

**File:** Search across all `fayed-frontend-v1/src/features/admin/**`
**Description:** No instant booking admin surface found.

### AUDIT-027

**File:** `fayed-mobile/app/(patient)/sessions/[id].tsx:448-462`
**Snippet:**
```typescript
return map[mode] ?? mode; // fallback is raw string
```

### AUDIT-028

**File:** `fayed-mobile/app/(patient)/sessions/[id].tsx:464-478`
**Snippet:**
```typescript
return map[flowType] ?? flowType; // fallback is raw string
```

### AUDIT-029

**File:** `fayed-backend-v1/src/modules/presence/presence-liveness.ts:25-40`
**Snippet:**
```typescript
return isPresenceFresh(presence, referenceTime) ? presence.status : PresenceStatus.OFFLINE;
```
No sweeper or cron that corrects the `Presence` table row.

### AUDIT-030

**File:** `fayed-backend-v1/src/modules/instant-booking/instant-booking.module.ts`
**Description:** No `ScheduleModule` imported. `markExpired` only called on accept/reject/cancel/list.

---

## Runtime Checks Performed

**Status:** Skipped

Runtime checks were not performed because:
1. Starting all three servers simultaneously (backend port 7000, web port 3000, mobile port 8081) was not feasible.
2. Creating real bookings, instant booking requests, or availability mutations was explicitly forbidden.
3. Verifying slot rendering, instant booking state transitions, and presence display required code inspection rather than live observation.

This is a known limitation of Phase 3. Runtime verification should be performed when findings are addressed.

---

## Limitations

- **Runtime checks skipped** — no live API responses, slot rendering, or booking flows verified in running state
- **Backend slot windows** — `buildAvailabilityWindowsService` verified through code only; actual window boundaries not verified against timezone boundaries
- **Conflict detection** — application-level checks verified through code; no database-level locking mechanism verified in live conditions
- **Instant booking race condition** — the race condition (AUDIT-010) verified through code analysis; not reproduced in a live environment
- **Mobile i18n key coverage** — mobile i18n key existence for `sessionMode` (VIDEO/AUDIO/CHAT) not verified against locale files
- **Database not inspected** — Prisma schema reviewed but actual data not queried
