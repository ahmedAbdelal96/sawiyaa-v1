# Session Reminder Execution Direction

The current production direction is:

```text
DB_ONLY
```

PostgreSQL is authoritative for reminder discovery, atomic claim/lease,
freshness and session validation, and recovery. The PostgreSQL dispatcher then
creates the canonical Notification intent, which continues through the existing
Notification delivery pipeline.

`REDIS_SHADOW` is reserved for comparison and validation. It must not create
customer-visible reminder execution. `REDIS_PRIMARY_WITH_DB_RECOVERY` remains
an experimental/future reevaluation mode and is not the recommended production
mode.

The reminder Redis/BullMQ implementation, tests, deterministic job IDs,
staging service, execution worker, and recovery capability are intentionally
preserved but dormant when `REMINDER_REDIS_MODE` is missing, empty, malformed,
unknown, or set to `DB_ONLY`. Redis reminder execution requires both an
explicit valid non-default mode and `REMINDER_REDIS_ENABLED=true`.

This setting is separate from the Redis/BullMQ infrastructure used by the
downstream Notification delivery pipeline.
