# Operations and Support

Sawiyaa is designed to be operated, not just used.

The platform has a clear operational layer that keeps the product safe, financially correct, and responsive when exceptions happen.

## What operations must manage

- user and practitioner onboarding issues
- session lifecycle exceptions
- booking and payment failures
- refunds and cancellations
- support requests
- chat moderation
- content moderation
- payouts and settlements
- notifications and escalations
- policy changes and system settings

## Operational teams

The current product model supports these operational actors:

- **Admin** - broad platform operations and governance.
- **Support** - handles user-facing issues and triage.
- **Finance / operations** - manages wallet, refunds, settlement, and payout activity.
- **Moderation** - handles sensitive content or conversation review.
- **Content review** - manages article or content approval workflows where relevant.

## Core operational loops

### 1. Session operations

The session loop covers:

- discovery and matching
- instant booking request handling for same-day or now sessions
- booking
- payment initiation
- session access window
- live session state
- cancellation handling
- post-session history
- manual session decisions for exceptional closeout

### Manual session decision operations

Admins can apply explicit manual decisions to close a session outside the normal flow. This is used for operational exceptions such as no-shows or sessions that require review before final handling.

The admin decision endpoint accepts:

- `decisionType` — the target state such as `NO_SHOW` or `UNDER_REVIEW`
- `reasonCode` — operational reason for the decision
- `confirmEvidenceReviewed` — confirms the admin has reviewed the relevant context
- `confirmNoAutomaticRefund` — explicitly confirms no automatic refund should trigger
- `confirmNoAutomaticPayout` — explicitly confirms no automatic payout should trigger

**Propagation**: Manual decisions update the session `presentationStatus` through the backend contract. The change propagates to all surfaces that read session state:

- admin session surfaces and session detail
- patient web and mobile session list and detail
- practitioner web and mobile session list and detail
- support and operations context where session state appears

**Financial side effects**: Manual session decisions are operational and auditable states. They do not automatically imply refund or payout unless the finance policy explicitly handles that outcome for the given decision type. The explicit confirmation fields on the decision endpoint make this intentional for each action.

**Support communication**: When a session is marked `NO_SHOW` or `UNDER_REVIEW`, support staff should communicate this in human language to the patient and practitioner. Do not reference raw enum values or technical decision codes in user-facing communication.

### 2. Money operations

The money loop covers:

- payment acceptance
- `PaymentPurpose.SESSION_INSTANT_BOOKING` processing for accepted instant-booking sessions
- payment status tracking
- refund decisions
- wallet balance updates
- practitioner payouts
- settlement generation
- exception handling

### 3. Chat operations

The chat loop covers:

- session chat availability
- read-only or disabled sending states
- moderation actions
- support or care follow-up
- attachment access control

### 4. Support operations

The support loop covers:

- issue intake
- routing to the correct team
- status tracking
- escalation
- resolution and follow-up

## Operating principles

1. **No hidden state** - if something is blocked, show the reason in human language.
2. **Policy-driven decisions** - especially for refunds, cancellations, and moderation.
3. **Auditable actions** - important admin actions should be traceable.
4. **Currency accuracy** - no ambiguous money presentation.
5. **Separation of concerns** - sessions, support, chat, and finance are related but not the same thing.
6. **Fast-path safety** - instant booking must still respect eligibility, payment confirmation, and join locking.

## Operational screens

The admin web app is the primary operations console for:

- sessions
- chat moderation
- support queues
- financial records
- settlements and payout tools
- policy configuration
- reporting and diagnostics

## Support surfaces

- public help for visitors
- patient support for signed-in patients
- practitioner support for provider-side issues
- admin support queues for operational resolution

## Deferred external checks

Some checks are intentionally not treated as product failures:

- Paymob provider sandbox QA still needs external approval
- provider checkout can return `403 Forbidden` in this environment
- any external provider verification should be tracked as deferred, not as a product logic change

## What this means for product design

An operational platform needs screens that are:

- easy to scan
- easy to audit
- clear about status
- calm in error states
- explicit about next steps

This is why Sawiyaa screens should prioritize clarity, hierarchy, and policy-aware messaging.
