# Notifications Scheduler / Delivery Depth — Slice 3

This slice adds bounded retry behavior for failed delivery attempts.

## Retry policy baseline

- Max attempts: `3`
- Backoff: exponential from a 5-minute base (`+5m`, `+10m`, then terminal)
- Retryable error codes:
  - `MAIL_SEND_FAILED`
  - `DELIVERY_FAILED`
- Non-retryable error codes:
  - `EMAIL_TARGET_MISSING`
  - `CHANNEL_UNSUPPORTED`
  - `MAIL_PROVIDER_UNSUPPORTED`
  - `MAIL_TRANSPORT_NOT_CONFIGURED`

## State behavior

- Retryable failure:
  - attempt is recorded as `FAILED` with retry decision metadata
  - notification transitions `QUEUED -> PENDING`
  - `scheduledFor` is set to next retry time
- Terminal failure:
  - attempt is recorded as `FAILED`
  - notification transitions `QUEUED -> FAILED`
  - `failedAt` and reason are persisted

## Guardrails

- Retry loop is bounded by max attempts.
- Non-retryable failures do not get requeued.
- Attempt history remains traceable via `NotificationDeliveryAttempt` records.
