# Notifications Scheduler Core (Slice 1)

## Lifecycle Semantics
- `PENDING`: eligible to be selected for due execution once `scheduledFor <= now`.
- `QUEUED`: atomically claimed by scheduler core for execution pipeline.
- Terminal statuses remain unchanged in this slice: `SENT`, `FAILED`, `SUPPRESSED`, `CANCELLED`, `DELIVERED`, `READ`.

## Due Selection Rule
- Select from `Notification` where:
  - `status = PENDING`
  - `scheduledFor IS NOT NULL`
  - `scheduledFor <= now`
- Ordered by `scheduledFor ASC`, then `createdAt ASC`.
- Batch-limited by caller-provided `limit`.

## Atomic Claim Rule
- Claim one notification with conditional update:
  - match by `id`
  - still `status = PENDING`
  - still `scheduledFor <= now`
- Transition to `QUEUED`.
- `updateMany.count = 0` means claim lost (already claimed/updated by another run).

## Scope Boundary
- Slice 1 does not execute delivery attempts yet.
- Slice 1 provides deterministic due-item claiming only.
