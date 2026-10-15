# Notifications Scheduler / Delivery Depth — Slice 3B1

This slice adds a provider-aware, bounded retry policy for failed delivery
attempts. It does not change queue topology, worker pools, provider rate
limiting, notification timing, or notification lifecycle semantics.

## Error taxonomy

Every provider outcome is normalized to one of:

- `TRANSIENT`: retryable when the outcome is known not to have been accepted.
- `RATE_LIMITED`: retryable and scheduled no earlier than `Retry-After`.
- `PERMANENT`: terminal; malformed or unsupported requests are not retried.
- `CONFIGURATION`: terminal; operators must repair configuration.
- `RECIPIENT_INVALID`: terminal; invalid Expo devices are revoked where known.
- `UNKNOWN_OUTCOME`: quarantined/reconciled, never treated as a generic send retry.

HTTP status, safe provider error code, and `Retry-After` are
persisted in the delivery attempt response metadata. Secrets and provider
response bodies are not persisted.

## Retry policy baseline

- Max attempts: `NOTIFICATION_RETRY_MAX_ATTEMPTS` (default `3`)
- Base delay: `NOTIFICATION_RETRY_BASE_DELAY_MS` (default `5m`)
- Exponential delay is bounded by `NOTIFICATION_RETRY_MAX_DELAY_MS` (default `30m`).
- Deterministic per-notification jitter is bounded by `NOTIFICATION_RETRY_JITTER_MS`
  (default `30s`).
- `Retry-After` is parsed from seconds or HTTP-date and bounded by
  `NOTIFICATION_RETRY_AFTER_MAX_MS` (default `30m`).
- The retry decision stores category, reason, delay, `Retry-After`, and the
  calculated next retry timestamp.

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
- Permanent/configuration/recipient failures do not get requeued.
- Unknown provider outcomes do not consume generic retry budget; they use the
  existing provider-specific reconciliation/quarantine path.
- Session reminders use the existing freshness windows and are suppressed when
  a retry would be stale.
- Reconciliation that resolves an existing Expo ticket without a new provider
  send updates the existing attempt rather than allocating a new attempt number.
- Attempt history remains traceable via `NotificationDeliveryAttempt` records.

Phase 3B2A adds the provider-capacity foundation in metrics-only mode: EMAIL
and PUSH have separate BullMQ lanes, DB fallback and stale recovery share the
same local provider gates, and readiness exposes provider capacity metrics.
Global provider rate admission and quota enforcement remain deferred to Phase
3B2B; no provider quota is inferred or enabled here.
