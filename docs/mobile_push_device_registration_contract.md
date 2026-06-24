# Mobile Push Device Registration Contract

Status: Device registration foundation is implemented and code-validated; backend smoke started on fayed_db and real-device execution is pending.

## Scope

This document covers only mobile device registration lifecycle readiness.
It does not claim that provider-side delivery dispatch is active.

## Backend Endpoints

Base path: /api/v1/notifications/devices

### POST /register

Auth: Required (Bearer access token)

Purpose:
Link or refresh one physical device token for the authenticated user and requested role.

Request body:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "provider": "EXPO",
  "platform": "IOS",
  "role": "PATIENT",
  "deviceId": "device_1714820000000_abcd1234",
  "appVersion": "1.0.0",
  "locale": "ar",
  "timezone": "Africa/Cairo",
  "enabled": true
}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "role": "PATIENT",
      "provider": "EXPO",
      "platform": "IOS",
      "deviceId": "device_1714820000000_abcd1234",
      "appVersion": "1.0.0",
      "locale": "ar",
      "timezone": "Africa/Cairo",
      "enabled": true,
      "lastSeenAt": "2026-05-04T10:00:00.000Z",
      "revokedAt": null,
      "createdAt": "2026-05-04T10:00:00.000Z",
      "updatedAt": "2026-05-04T10:00:00.000Z"
    }
  }
}
```

Security rules:

- Authenticated role must include the requested role.
- Allowed role values are PATIENT and PRACTITIONER.
- Token is write-only; raw token is not returned in API response payloads.
- If deviceId is reused for the same user and role, previous active rows are revoked.

### POST /revoke

Auth: Required (Bearer access token)

Purpose:
Best-effort disable for current user device rows.

Request body (at least one selector is required):

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "deviceId": "device_1714820000000_abcd1234"
}
```

Response shape:

```json
{
  "success": true,
  "data": {
    "item": {
      "revokedCount": 1
    }
  }
}
```

Security rules:

- Operation is scoped to authenticated user ownership.
- Missing both token and deviceId returns bad request.

### GET /me

Auth: Required (Bearer access token)

Purpose:
List current user device registrations without exposing push tokens.

Response shape:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "role": "PATIENT",
        "provider": "EXPO",
        "platform": "ANDROID",
        "deviceId": "device_1714820000000_abcd1234",
        "appVersion": "1.0.0",
        "locale": "ar",
        "timezone": "Africa/Cairo",
        "enabled": true,
        "lastSeenAt": "2026-05-04T10:00:00.000Z",
        "revokedAt": null,
        "createdAt": "2026-05-04T10:00:00.000Z",
        "updatedAt": "2026-05-04T10:00:00.000Z"
      }
    ]
  }
}
```

## Mobile Lifecycle Guarantees

Implemented behavior:

- Startup and session restore perform a best-effort sync without requesting OS permission by default.
- User-triggered enable action is the only path that can request permission.
- Notifications UI copy is plain-language user-facing wording; it does not expose raw token data.
- Logout performs best-effort revoke and always clears local auth state in finally.
- Tap routing allows only supported patient deep links; unsupported targets safely route to /(patient)/notifications.

## Role and Platform Validation Matrix

Supported role and platform permutations:

- PATIENT + IOS + EXPO
- PATIENT + ANDROID + EXPO
- PRACTITIONER + IOS + EXPO
- PRACTITIONER + ANDROID + EXPO

Behavioral notes:

- WEB is accepted by backend contracts but mobile registration flow reports not-supported for non-physical devices.
- Provider enum includes EXPO, FCM, APNS for forward compatibility; this pass validates registration metadata and ownership only.

## DB Migration Path Decision (Current)

Chosen path for real-device validation in this workspace:

- Use a fresh local development database instead of resetting fayed_db.
- Reason: current fayed_db has existing unapplied migration chain and may contain important local data.

Exact safe path A (only if fayed_db is disposable and explicit reset is approved):

```powershell
Set-Location D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1
npx prisma migrate reset
```

Then choose seed execution when prompted.

Exact safe path B (recommended when data may matter):

```powershell
# 1) Create a new local PostgreSQL database, for example:
#    fayed_push_device_real_device_db

Set-Location D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1

# 2) Build an override URL for this terminal session only (no .env edits required)
$line = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$raw = $line.Substring('DATABASE_URL='.Length).Trim('"')
$uri = [System.Uri]$raw
$builder = New-Object System.UriBuilder($uri)
$builder.Path = '/fayed_push_device_real_device_db'
$env:DATABASE_URL = $builder.Uri.AbsoluteUri

# 3) Apply migration chain and seed into the fresh DB
npx prisma migrate deploy
npm run prisma:seed

# 4) Start backend in same terminal session using the overridden DATABASE_URL
npm run build
node dist/src/main.js
```

Current non-destructive status check:

- `npx prisma migrate status` on fayed_db reports 4 pending migrations.
- No reset was executed in this pass.

## Verified in This Pass

- Backend `npx prisma format` completed.
- Backend `npm run prisma:generate` completed.
- Backend `npx prisma migrate status` against fayed_db reports pending unapplied migrations and no reset was executed.
- Backend `npm run build` completed.
- Targeted Jest suite for notification device foundation and package slot validator passed (5/5 suites).
- Backend runtime booted on fayed_db and mapped `/api/v1/notifications/devices/register`, `/revoke`, and `/me`.
- Unauthenticated `POST /api/v1/notifications/devices/register` returned HTTP 401.
- Backend `npm run typecheck` still fails with unrelated existing spec typing debt (149 errors across 30 files).
- Mobile `npx tsc --noEmit` passed.
- Mobile `npm run lint` and `npm run test` scripts exist but did not execute because eslint and jest executables are not available in current environment.

## Mobile Real-Device Connectivity Requirements

- Mobile API base URL is resolved from `EXPO_PUBLIC_API_URL` when set.
- If not set, Android defaults to `http://10.0.2.2:7000/api/v1` and iOS defaults to `http://localhost:7000/api/v1`.
- Physical devices cannot use localhost to reach your desktop backend.

For physical Android and iOS validation, use one of these:

- LAN IP path: set `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:7000/api/v1` and ensure backend binds to `0.0.0.0` plus firewall rule allows port 7000.
- Tunnel path: expose backend with a secure tunnel and set `EXPO_PUBLIC_API_URL` to the tunnel URL ending with `/api/v1`.

Expo push token generation prerequisites:

- Must run on a physical iOS or Android device.
- `expo-notifications` plugin must be present in `app.json`.
- App must request and receive notification permission for granted path.
- Expo project id must be available via EAS config or app extras for stable `getExpoPushTokenAsync` behavior.

## Real-Device Validation Checklist (Executable)

Current execution status in this pass:

- Android physical-device validation: not executed yet (all Android checklist items remain pending).
- iOS physical-device validation: not executed yet (all iOS checklist items remain pending).
- Provider delivery dispatch validation: not executed and intentionally out of scope.

Backend preflight:

- [ ] Apply pending migrations to fayed_db using non-destructive migration flow (no reset).
- [x] Start backend and confirm route availability under /api/v1.
- [x] Confirm unauthenticated register returns 401.
- [ ] Confirm PATIENT register/list/revoke endpoints return expected success payloads without token fields.
- [ ] Confirm PRACTITIONER register/list/revoke endpoints return expected success payloads without token fields.

Mobile preflight:

- [ ] Confirm signed-in session does not trigger OS permission prompt on startup.
- [ ] Confirm explicit "Enable app alerts" action triggers permission flow.
- [ ] Confirm status card wording stays user-facing and does not expose token strings.
- [ ] Confirm logout clears local auth state even when revoke request fails.

iOS execution:

- [ ] Install development build on physical iOS device.
- [ ] Sign in as patient, tap enable, grant permission, confirm register succeeds.
- [ ] Sign in as practitioner, tap enable, grant permission, confirm register succeeds.
- [ ] Trigger sample notification payloads and confirm supported deep links open expected screens.
- [ ] Trigger unsupported payload and confirm safe fallback to /(patient)/notifications.

Android execution:

- [ ] Install development build on physical Android device.
- [ ] Sign in as patient, tap enable, grant permission, confirm register succeeds.
- [ ] Sign in as practitioner, tap enable, grant permission, confirm register succeeds.
- [ ] Trigger sample notification payloads and confirm supported deep links open expected screens.
- [ ] Trigger unsupported payload and confirm safe fallback to /(patient)/notifications.

## Supported Tap Destinations (Current)

Current patient notification route mapper supports only these targets:

- /(patient)/sessions and /(patient)/sessions/:id
- /(patient)/payments
- /(patient)/support and /(patient)/support/:id
- /(patient)/care-chat, /(patient)/care-chat/:conversationId, /(patient)/care-chat/request/:requestId
- /(patient)/assessments
- /(patient)/profile

Any other target returns null and is handled by UI fallback to /(patient)/notifications.

## Provider Dispatch Work (Next Batch)

Not implemented in this pass. Decide and implement in next batch:

- Delivery channel strategy: Expo relay only vs direct FCM/APNS vs hybrid.
- Credential management: secure storage for Expo access token and/or FCM/APNS credentials per environment.
- Delivery runner policy: retries, exponential backoff, timeout ceilings, and dead-letter handling.
- Invalid token handling: classify permanent vs transient failures and auto-revoke stale tokens.
- Observability: structured logs, metrics, and admin visibility for attempts, success rates, and failures.
- Preference enforcement: honor user notification preferences and role-specific policy gates before dispatch.

## Limitations

- This pass validates device registration and route-safe tap behavior only.
- No production delivery guarantees are made yet.
- Android and iOS physical-device execution has not been run in this environment in this pass.
- Existing workspace remains heavily dirty; only a focused push-foundation commit slice should be selected.
