# Notifications Scheduler / Delivery Depth — Final Slice (Ops Visibility)

This slice exposes minimal admin/support operational diagnostics for notification delivery.

## Endpoints

- `GET /admin/notifications`
  - Filters: `status`, `channel`, `category`, `scheduledFrom`, `scheduledTo`, `page`, `limit`
  - Default statuses when omitted: `PENDING`, `QUEUED`, `FAILED`, `SUPPRESSED`
- `GET /admin/notifications/:id`
  - Returns lifecycle detail + attempt history (latest 20 attempts)

## Access control

- Protected by `JwtAccessAuthGuard` + `RolesGuard`
- Allowed roles: `ADMIN`, `SUPPORT_AGENT`
- Active account required

## Diagnostics returned

- Notification lifecycle state
- Channel/category/type slug
- `failedAt`, `suppressedReason`
- Delivery attempt history:
  - `attemptNumber`
  - `status`
  - `provider`
  - `errorCode` / `errorMessage`
  - `attemptedAt`

## Intentional scope limits

- No requeue endpoint in this slice (deferred for safety/scope control)
- No dashboard/analytics expansion
- No new channels
