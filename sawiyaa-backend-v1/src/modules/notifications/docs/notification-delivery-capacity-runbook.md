# Notification delivery capacity and recovery runbook

This runbook describes the final notification delivery topology. It is for
local/staging verification and production operations; it does not contain
provider credentials or guessed provider quotas.

## Source of truth and topology

- PostgreSQL `Notification` rows and delivery-attempt rows are authoritative.
- BullMQ is a transport accelerator, not a second lifecycle state machine.
- `notifications-email` and `notifications-push` are the provider lanes.
  `notifications` remains the compatibility/default lane.
- If BullMQ or its Redis transport is unavailable, the database scheduler and
  stale-queued recovery continue to discover work.
- Session reminders remain PostgreSQL `DB_ONLY`; the dormant Redis reminder
  path must not be enabled by this capacity feature.
- The capacity coordinator uses a dedicated Redis URL and key prefix. It must
  not share keys with BullMQ, throttling, or session-reminder Redis.

## Capacity modes

`NOTIFICATION_CAPACITY_MODE` accepts:

- `METRICS_ONLY` (default): local gates and metrics run; no global admission.
- `SHADOW`: the global Redis token-bucket decision is computed and measured,
  but it never blocks a provider call.
- `ENFORCED`: global admission is authoritative. A missing or unavailable
  coordinator fails closed before the provider call and leaves the notification
  retryable through the existing database lifecycle.

Provider rates and bursts are intentionally operator-owned:

- `NOTIFICATION_BREVO_REQUESTS_PER_SECOND` / `NOTIFICATION_BREVO_BURST`
- `NOTIFICATION_EXPO_MESSAGES_PER_SECOND` / `NOTIFICATION_EXPO_BURST`
- `NOTIFICATION_SMTP_SENDS_PER_SECOND` / `NOTIFICATION_SMTP_BURST`

Do not enable `ENFORCED` until each configured provider has approved values,
the dedicated Redis 5+ service is reachable from every worker, and the
readiness/alerting checks below have been observed in `SHADOW`.

## Approved initial configuration

The initial rollout values are deliberately conservative operating values, not
claims about a provider's maximum quota:

| Provider |       Rate / second | Burst | Local concurrency |
| -------- | ------------------: | ----: | ----------------: |
| Brevo    |         20 requests |    20 |                 5 |
| Expo     | 200 device messages |   200 |                 4 |
| SMTP     |   5 send operations |    10 |                 3 |

The exact environment keys are:

- `NOTIFICATION_CAPACITY_MODE` (`SHADOW` for the initial staging rollout;
  `METRICS_ONLY` remains the safe local default).
- `NOTIFICATION_BREVO_REQUESTS_PER_SECOND=20`,
  `NOTIFICATION_BREVO_BURST=20`, and
  `NOTIFICATION_BREVO_MAX_CONCURRENCY=5`.
- `NOTIFICATION_EXPO_MESSAGES_PER_SECOND=200`,
  `NOTIFICATION_EXPO_BURST=200`, and
  `NOTIFICATION_EXPO_MAX_CONCURRENCY=4`.
- `NOTIFICATION_SMTP_SENDS_PER_SECOND=5`,
  `NOTIFICATION_SMTP_BURST=10`, and
  `NOTIFICATION_SMTP_MAX_CONCURRENCY=3`.
- `NOTIFICATION_CAPACITY_REDIS_URL` must be a dedicated Redis 5+ URL. Keep
  `NOTIFICATION_CAPACITY_KEY_PREFIX=sawiyaa:notification-capacity` isolated
  from queue, throttle, and reminder namespaces.

The API process and notification worker must receive the same capacity keys.
Configuration is read at startup, so restart both roles after changing it.
The startup log prints mode, rate/burst, local concurrency, and sanitized
coordinator health only; it must never print URLs, passwords, or provider keys.

## Shadow rollout and rollback

1. Provision a dedicated Redis 5+ coordinator and set the same capacity URL,
   prefix, rates, bursts, and local concurrency on the API and worker roles.
2. Start with `NOTIFICATION_CAPACITY_MODE=SHADOW`; do not point it at the
   legacy Redis 3 service on port 6379.
3. Confirm readiness reports the expected provider limits and coordinator
   health, then observe shadow throttles, provider 429s, queue age, worker
   heartbeat, and retryable backlog under representative load.
4. Only after that observation and provider approval may a separate change
   move to `ENFORCED`; verify readiness is `READY` before sending production
   traffic.
5. Roll back by changing `ENFORCED` to `SHADOW` first, or to
   `METRICS_ONLY` if the coordinator is unavailable, then restart API and
   workers. Do not delete notification history or bypass the existing retry
   lifecycle.

The initial worker recommendation is two notification worker replicas. This
runbook does not change deployment replica counts; scale only after observing
database connection usage, queue age, provider responses, and capacity
metrics.

## Readiness and alert signals

Review the notification readiness payload for:

- queue status, Redis status, worker heartbeat, and oldest waiting job age;
- global coordinator health, mode, configured providers, fail-closed count,
  and the last coordinator error;
- provider capacity admissions, deferrals, cooldowns, and local gate metrics.

Alert on:

- `ENFORCED` with coordinator `UNAVAILABLE`;
- increasing fail-closed deferrals or coordinator errors;
- queue `DEGRADED`, missing worker heartbeat, or an oldest-waiting age above
  the service-level target;
- repeated `RATE_LIMITED` outcomes, provider cooldown growth, or retryable
  backlog growth;
- any delivery-attempt result that has `providerSendAttempted=false` while
  the notification remains retryable (this is expected for capacity deferral,
  not for an accepted provider send).

## Incident response

1. Confirm the failing scope from readiness and structured logs: queue,
   PostgreSQL, capacity Redis, provider, or recipient.
2. Do not manually mark notifications `SENT`. Inspect the notification row and
   its attempt history first.
3. For capacity-Redis failure in `ENFORCED`, restore the dedicated Redis
   service or temporarily return to the approved `SHADOW`/`METRICS_ONLY`
   posture through the normal configuration change process. Never bypass the
   provider gate with a second sender.
4. For BullMQ failure, keep the database scheduler enabled and verify stale
   queued recovery. Repair the transport before re-enabling higher worker
   concurrency.
5. For provider `429`, preserve the provider `Retry-After` cooldown. Do not
   increase concurrency to compensate.
6. For an unknown provider outcome, reconcile the existing attempt before any
   replay. Do not create a duplicate attempt by guessing whether the provider
   accepted the request.

## Rollback and verification

- Roll back capacity enforcement by configuration mode only; do not delete
  PostgreSQL notification or attempt history.
- Preserve the dedicated Redis key prefix so an old token bucket cannot be
  confused with a new deployment.
- After recovery, verify one controlled provider-stub lifecycle for each lane:
  `PENDING -> QUEUED -> SENT`, transient retry, rate-limit cooldown, permanent
  failure, and coordinator outage with no provider call.
- Run the focused notification tests and the authorized local PostgreSQL
  integration/load suites before changing the mode again.

## Local disposable proof

Use a disposable local PostgreSQL database named
`sawiyaa_notification_YYYYMMDD` and/or `sawiyaa_session_reminder_YYYYMMDD`.
The integration tests reject non-local hosts, non-5432 ports, and non-dated
database names. Use a separate Redis 7+ container/port for BullMQ or capacity
proof; do not alter an existing Redis 3 instance.
