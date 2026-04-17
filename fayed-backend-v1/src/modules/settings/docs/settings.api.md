# Settings Module API (Slices 1-3)

## Scope
- User-owned settings with explicit ownership boundaries and frontend-stable DTO contracts.
- Locale/timezone preferences are persisted on `User.defaultLocale` + `User.timezone`.
- Notification preferences are now persisted with deterministic default fallback.

## Ownership Boundaries

### Owned by Settings Module
- User locale preference contract (`/settings/me/preferences`).
- User timezone preference contract (`/settings/me/preferences`).
- User notification preference state contract (`/settings/me/notification-preferences`).

### Explicitly Out of Scope
- Profile editing (`users/patients/practitioners` domains).
- Notification delivery runtime orchestration (`notifications` domain).
- Auth/security mutation flows (password/2FA/session revocation).
- Internal environment/config keys.
- Chat-specific preferences (pending chat domain closure).

## Endpoints

- `GET /api/v1/settings/me`
- `PATCH /api/v1/settings/me/preferences`
- `GET /api/v1/settings/me/notification-preferences`
- `PUT /api/v1/settings/me/notification-preferences`

## Contract Notes
- `GET /settings/me` returns deterministic defaults when values are missing:
  - `locale`: `ar`
  - `timezone`: `Africa/Cairo`
- `PATCH /settings/me/preferences` validates + normalizes locale/timezone and persists them.
- `GET /settings/me/notification-preferences` remains read-only baseline.
- `GET /settings/me/notification-preferences` returns resolved state:
  - persisted `NotificationPreference` rows override defaults
  - missing `(type, channel)` rows fallback to `NotificationType.defaultEnabled`
  - only supported channels are surfaced (`IN_APP`, `EMAIL`) and only when the type supports that channel
- `PUT /settings/me/notification-preferences` performs bulk upsert by `(userId, notificationTypeId, channel)`.

## Error Contract Baseline (Machine-Readable)
- `SETTINGS_INVALID_LOCALE`
- `SETTINGS_INVALID_TIMEZONE`
- `SETTINGS_INVALID_NOTIFICATION_TYPE`
- `SETTINGS_INVALID_NOTIFICATION_CHANNEL`
- `SETTINGS_DUPLICATE_NOTIFICATION_PREFERENCE`
- `SETTINGS_OWNER_NOT_FOUND`
