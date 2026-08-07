# Session No-Show Runtime Readiness

## Current status

`PROVIDER_RUNTIME_PROVEN = PROVEN_FOR_ONE_PARTY_NO_SHOW`.

Daily REST runtime is proven with synthetic development-only rooms. Historical
`/meetings` responses positively mapped booked `user_id` values, completed
one-party and both-party records, multi-device overlap, reconnects, and unknown
identities. A room with no participants returned no presence and no meeting
record, so it cannot prove `BOTH_NO_SHOW`.

`PATIENT_NO_SHOW_RUNTIME_PROVEN = true`  
`PRACTITIONER_NO_SHOW_RUNTIME_PROVEN = true`  
`BOTH_NO_SHOW_RUNTIME_PROVEN = false`

These are provider-evidence results, not automatic decisions. No terminal
status was written. A disposable local run proved real Daily signed webhook
delivery, HMAC/timestamp validation, trusted `user_id` mapping, persistence,
duplicate replay idempotency, and agreement with the historical REST meeting
records for both one-party scenarios. The temporary secret was held only in
the process environment and was not written to a repository file.

## Safe next step

Before any future provider rollout, repeat the same proof with the deployment
secret manager and an approved callback. Never use customer rooms or personal
data.

The controlled run recorded only sanitized room prefixes, participant
identity-field availability, webhook/REST agreement, unknown-participant
behavior, multi-device/reconnect behavior, and cleanup results. Raw tokens,
API keys, signatures, and payloads must not be stored. Daily finalization is
still asynchronous; meeting-ended availability must be polled with a bounded
wait before a reconciliation is considered complete.

## Financial rollout gate

No owner-approved financial policy was found for automatic patient,
practitioner, or both-party no-show. The current system keeps no-show status,
package entitlement decisions, earning review, refund eligibility, wallet
credits, payouts, and settlement release behind existing Admin/manual
boundaries. Do not implement automatic financial behavior until each outcome
has an explicit approved policy and PostgreSQL proof.
