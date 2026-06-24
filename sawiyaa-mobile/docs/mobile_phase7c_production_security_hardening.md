# Phase 7C — Mobile Production Security Hardening

Project: `D:\Web\full-projects\sawiyaa\sawiyaa-mobile`  
Date: 2026-05-12  
Scope: Mobile only (Expo / React Native). No backend or web frontend changes.

## Executive Verdict

**Mostly complete with gaps.**

Clear answer: **Is mobile production security hardening complete enough to proceed to final cross-platform security validation?** **Yes**, with the gaps listed below (notably lint toolchain and CSP-equivalent concerns are not applicable on mobile, but storage/logging/persistence are).

## Inventory (Current State)

### Auth / Session
Key files:
- `src/features/auth/contracts.ts`
- `src/features/auth/roles.ts`
- `src/features/auth/storage.ts`
- `src/features/auth/api.ts`
- `src/features/auth/query-auth.ts`
- `src/providers/AuthProvider.tsx`

Observed behavior:
- Mobile supports **PATIENT** and **PRACTITIONER** only; unsupported roles resolve to null.
- AuthProvider bootstraps session on app start, validates via `/auth/me`, then refreshes once if unauthorized.
- Logout clears local session and revokes push registration (best-effort).

### Token Storage (Pre-Phase 7C)
- Tokens were persisted inside a single AsyncStorage session object (`fayed.mobile.auth.session.v1`).

### API / Network Layer
Key file:
- `src/lib/api.ts` (Axios client + refresh interceptor)

Observed behavior:
- Base URL can come from `EXPO_PUBLIC_API_URL` (absolute) or dev fallbacks (http).
- Refresh-once interceptor exists; skips refresh for auth endpoints and for requests without an Authorization header.

### Routing / Deep Links / Notifications
Key files:
- `src/features/push/service.ts` (`extractNotificationHref`)
- `src/features/patient/notifications/routes.ts` (route allowlist mapping)
- Notification tap handling in `src/providers/AuthProvider.tsx` (patient-only)
- Hosted checkout flows use `normalizeAllowedExternalUrl()` in `src/lib/external-url.ts`

### Local Data Persistence
AsyncStorage usages found:
- Language preference: `src/i18n/index.ts` (`fayed.app.language`)
- Auth session metadata (post-Phase 7C): `src/features/auth/storage.ts` (`fayed.mobile.auth.session.v2`)
- Legacy auth session (pre-Phase 7C): `fayed.mobile.auth.session.v1` (now migrated/cleared)
- Device id: `src/features/auth/storage.ts` (`fayed.mobile.device.id.v1`)
- Push registration: `src/features/push/storage.ts` (`fayed.mobile.push.registration.v1`)

## What Changed (Phase 7C)

### Secure Token Storage (AsyncStorage → SecureStore)
- Added SecureStore-backed token persistence (Keychain/Keystore):
  - `src/features/auth/secure-token-storage.ts`
- Refactored auth session persistence:
  - Tokens are stored in SecureStore keys.
  - AsyncStorage `fayed.mobile.auth.session.v2` stores **metadata only**: `{ role, user }`.
  - Legacy `fayed.mobile.auth.session.v1` is migrated once and then removed.
  - Fail-closed behavior: if metadata exists but secure tokens are missing, session restore returns null and clears metadata.
  - Fail-closed persistence: if SecureStore writes fail, the session is not persisted and local artifacts are cleared.
  - File: `src/features/auth/storage.ts`

### API Base URL Hardening
- Enforced **https://** for `EXPO_PUBLIC_API_URL` in production builds:
  - `src/lib/api.ts`
- Dev still supports local http for emulator/simulator.

### Notification Route Hardening
- Tightened patient notification href parsing:
  - `src/features/patient/notifications/routes.ts`
- Now rejects:
  - absolute URLs (e.g. `https://...`)
  - unsafe protocols (e.g. `javascript:`, `data:`, `file:`)
  - non-internal paths not starting with `/`

## Storage Classification Table

| Item | Location | Sensitivity | Action taken |
|---|---|---|---|
| Access token | SecureStore | Sensitive | Moved to SecureStore (`src/features/auth/secure-token-storage.ts`). |
| Refresh token | SecureStore | Sensitive | Moved to SecureStore. |
| Token expiries | SecureStore | Moderate | Stored alongside tokens for restore validation. |
| Auth session metadata `{role,user}` | AsyncStorage (`auth.session.v2`) | Moderate | Kept in AsyncStorage without tokens; cleared if secure tokens missing. |
| Legacy auth session `{role,user,tokens}` | AsyncStorage (`auth.session.v1`) | Sensitive | Migrated once, then removed. |
| Device id | AsyncStorage (`device.id.v1`) | Moderate | Kept (device identifier for refresh/push registration). |
| Push registration (expo token + deviceId + role + userId) | AsyncStorage | Moderate | Kept; revoked/cleared on sign-out best-effort. |
| Language preference | AsyncStorage | Non-sensitive | Kept. |

## Tests / Verification

Commands run:
- `npx tsc --noEmit` (pass)
- `npm test` (pass)
- `npm run lint` (fails to run: ESLint is not installed; script exists but `eslint` command is missing)

Added/updated tests:
- Secure token migration + fail-closed restore:
  - `__tests__/auth/secure-token-storage.test.ts`
- Notification route hardening:
  - `__tests__/auth/notification-route-hardening.test.ts`

## Remaining Risks (Ranked)

### Critical
- None identified in this sweep for token persistence and notification routing, assuming `EXPO_PUBLIC_API_URL` is configured correctly in production.

### High
- `npm run lint` cannot be executed (toolchain gap). This reduces confidence in continued safe iteration and should be fixed before a release pipeline relies on lint.

### Medium
- SecureStore behavior on web is fail-closed (tokens not persisted). If mobile web is a supported surface, this needs explicit product decision and documentation.
- Push registration is still stored in AsyncStorage (moderate sensitivity). Acceptable, but should be cleared on session expiry as well (currently cleared on sign-out best-effort).

### Low
- `npm audit` reports vulnerabilities in dependencies (not addressed in this phase to avoid scope creep; should be reviewed separately).

## Follow-Ups Discovered

Mobile-only:
1. Add ESLint devDependency (or remove lint script) so CI verification is consistent.
2. Consider clearing stored push registration on auth failure/session expiry (not only sign-out).

Backend follow-ups:
- None required for these mobile changes.
