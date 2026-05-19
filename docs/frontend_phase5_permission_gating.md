# Phase 5 — Frontend Permission-Aware Admin UX

## Overview

Phase 5 adds role-based permission gating to the frontend admin area.  
The backend remains the authoritative enforcer — frontend gating is defense-in-depth and UX improvement only.

---

## Architecture Decisions

### Why role-based, not permission-based

The backend does **not** return a `permissions[]` array in any API response.  
`/users/me` returns `{ role: string }` only.  
Frontend derives the effective permission set from the user's role via `ROLE_PERMISSION_MAP` in `src/lib/auth/permissions.ts`.

**Future path**: When the backend adds `GET /users/me/permissions → { permissions: PermissionKey[] }`,  
`derivePermissions()` already checks `user.permissions` first (fast-path). No structural changes needed.

### No redirect on 403

When a user lacks permission for a page, the page renders an in-place `<AdminForbiddenView>` with a  
"Go to Dashboard" link. There is **no redirect**, and the user is **not logged out**.  
`handleLogout()` is only triggered on 401 → token refresh failure.

### SUPER_ADMIN bypass

`SUPER_ADMIN` passes all permission checks unconditionally.

---

## Files Created

| File                                           | Purpose                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/lib/auth/permissions.ts`                  | Permission utilities — PermissionKey constants, ROLE_PERMISSION_MAP, check functions |
| `src/config/admin-route-permissions.ts`        | Maps 30+ admin sub-paths to required permissions                                     |
| `src/config/navigation/filter.ts`              | Filters `NavigationConfig` to only items the user can see                            |
| `src/components/admin/AdminPermissionGate.tsx` | Server component — renders children or `AdminForbiddenView`                          |
| `src/components/admin/AdminForbiddenView.tsx`  | 403 UI — no redirect, no permission details exposed                                  |

---

## Files Modified

| File                                                        | Change                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/features/auth/types/auth.types.ts`                     | Added `SUPER_ADMIN`, `FINANCE_STAFF`, `MARKETING_STAFF`, `PRACTITIONER_REVIEWER`, `PATIENT_OPERATIONS` to `AppRole` |
| `src/config/navigation/types.ts`                            | Added `requiredPermissions?: PermissionKey[]` to `NavItem` and `NavigationSection`                                  |
| `src/config/navigation/admin.tsx`                           | Annotated nav items with `requiredPermissions`                                                                      |
| `src/config/navigation/index.ts`                            | Exported `filterAdminNavigation`                                                                                    |
| `src/app/[locale]/(admin)/layout.tsx`                       | Filters navigation via `filterAdminNavigation` before passing to `DashboardLayout`                                  |
| `src/lib/api/http-client.ts`                                | Added explicit comment: 403 must NOT trigger logout                                                                 |
| `src/app/[locale]/(admin)/admin/audit/page.tsx`             | Wrapped with `<AdminPermissionGate requiredPermissions={[AUDIT_LOG_READ]}>`                                         |
| `src/app/[locale]/(admin)/admin/finance/dashboard/page.tsx` | Wrapped with `<AdminPermissionGate requiredPermissions={[ACCOUNTING_READ, FINANCE_EVENTS_READ]}>`                   |

---

## Navigation Permissions by Role

| Role                    | Visible Sections                                |
| ----------------------- | ----------------------------------------------- |
| `SUPER_ADMIN`           | Everything                                      |
| `ADMIN`                 | Everything                                      |
| `FINANCE_STAFF`         | Finance Ops section (payments, ledger, reports) |
| `SUPPORT_AGENT`         | Support, CareChat, Sessions                     |
| `CONTENT_REVIEWER`      | (base access, articles/content items)           |
| `PATIENT_OPERATIONS`    | Patients, Sessions                              |
| `PRACTITIONER_REVIEWER` | Practitioners                                   |
| `MARKETING_STAFF`       | (base access)                                   |

---

## Permission Check Functions (`src/lib/auth/permissions.ts`)

```typescript
hasPermission(user, permission): boolean
hasAnyPermission(user, permissions[]): boolean
hasAllPermissions(user, permissions[]): boolean
hasRole(user, role): boolean
isSuperAdmin(user): boolean
canAccessAdminRoute(user, requiredPermissions[]): boolean
```

`PermissionCheckUser` accepts `{ role?, roles?, permissions? }` — forward-compatible with future backend `permissions[]`.

---

## How to Gate a New Admin Page

```tsx
// In your page.tsx (server component):
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

export default async function MyAdminPage() {
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.YOUR_PERMISSION_KEY]}
    >
      <YourScreen />
    </AdminPermissionGate>
  );
}
```

Use `requiresAny` semantics — user needs at least ONE of the listed permissions.

---

## 401 vs 403 Handling

| Status                 | Action                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| 401 (first time)       | Attempt token refresh                                                                                          |
| 401 (refresh succeeds) | Retry original request                                                                                         |
| 401 (refresh fails)    | `handleLogout()` → redirect to `/signin`                                                                       |
| 403                    | Return `AppError` with `errorType: "FORBIDDEN"`. **No logout.** Page-level guard renders `AdminForbiddenView`. |

---

## Pre-existing Issues (Not Phase 5)

TypeScript errors in `AdminPractitionerPayoutHistoryScreen.tsx` and `AdminPractitionerPayoutsListScreen.tsx`:

- `formatSettlementMoney` called with `number` instead of `string` (4 errors each)
- These pre-date Phase 5 and are unrelated

ESLint warnings in existing components:

- `setState` called synchronously in effects
- `exhaustive-deps` on logical expressions in `useMemo`
- Unused `eslint-disable` directives

---

## Remaining Risks

1. **No backend permission contract**: Backend does NOT yet return `permissions[]`. All gating is role-derived. If roles gain new capabilities without updating `ROLE_PERMISSION_MAP`, the frontend will silently under-display items.

2. **No automated tests**: No test framework (Jest/Vitest) is configured in `fayed-frontend-v1`. Unit tests for `permissions.ts` and `filter.ts` should be added when a test framework is bootstrapped.

3. **Single role only**: `fayed_user_data` cookie stores one `role` string. If the backend implements multi-role users, the cookie schema and `filterAdminNavigation` logic must be updated.

---

## Recommended Next Phase (Phase 6)

- Add `GET /users/me/permissions` backend endpoint returning `PermissionKey[]`
- Update frontend to read permissions from API response (fast-path already exists in `permissions.ts`)
- Add Vitest + unit tests for permission utilities
- Gate remaining admin sub-pages (patients, sessions, practitioners, reports)
- Consider a `ForbiddenBoundary` client component that catches `AppError.errorType === "FORBIDDEN"` thrown by API calls and renders the forbidden UI inline
