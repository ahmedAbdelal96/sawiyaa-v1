# Notifications Scheduler / Delivery Depth — Slice 4

This slice prevents stale or obsolete queued notifications from being sent.

## Guard integration point

- Domain validity is checked in the delivery attempt engine before creating any delivery attempt.
- Invalid notifications are suppressed immediately.

## Suppression behavior

- Notification transitions: `QUEUED -> SUPPRESSED`
- `suppressedReason` is persisted with explicit reason codes.
- No channel execution occurs for suppressed notifications.
- No `NotificationDeliveryAttempt` record is created for suppressed notifications.

## Guarded domains (current baseline)

- `SESSION` notifications:
  - suppressed if session is missing or terminal-invalid (`CANCELLED`, `COMPLETED`, `NO_SHOW`, `EXPIRED`, `REFUNDED`)
- `TRAINING_ENROLLMENT` notifications:
  - suppressed if enrollment is missing or not `ACTIVE`
  - suppressed if linked schedule is `CANCELLED`, `COMPLETED`, or `ARCHIVED`
- `PAYMENT` notifications:
  - `payments.payment-succeeded` requires payment `CAPTURED` or `AUTHORIZED`
  - `payments.payment-failed` requires payment `FAILED`, `CANCELLED`, or `EXPIRED`
- `REFUND` notifications:
  - `payments.refund-requested` requires refund `REQUESTED` or `PROCESSING`
  - `payments.refund-succeeded` requires refund `SUCCEEDED`
  - `payments.refund-failed` requires refund `FAILED` or `CANCELLED`
