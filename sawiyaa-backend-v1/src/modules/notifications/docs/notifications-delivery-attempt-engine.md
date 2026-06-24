# Notifications Scheduler / Delivery Depth — Slice 2

This slice executes claimed (`QUEUED`) notifications through supported channels and persists deterministic delivery-attempt records.

## Supported channels

- `IN_APP`
- `EMAIL`

## Execution baseline

1. Scheduler slice claims due `PENDING` notifications into `QUEUED`.
2. Delivery attempt engine fetches only `QUEUED` notifications.
3. A `NotificationDeliveryAttempt` record is created with `PENDING` status.
4. Channel wrapper executes send logic and returns a normalized result.
5. Attempt + notification statuses are finalized deterministically:
   - success -> attempt `SENT`, notification `SENT`
   - failure -> attempt `FAILED`, notification `FAILED`

## Guardrails

- Non-queued notifications are skipped (`NOTIFICATION_NOT_QUEUED`).
- Unsupported channels return explicit failure (`CHANNEL_UNSUPPORTED`).
- Email notifications require `payloadJson.target`; missing target fails explicitly (`EMAIL_TARGET_MISSING`).
- Duplicate execution in the same run boundary is mitigated by strict `QUEUED`-only execution and queued-state update guards.
