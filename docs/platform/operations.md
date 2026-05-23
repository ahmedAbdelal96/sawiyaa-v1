# Operating Model

Fayed is designed to be operated, not just used.

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
- booking
- payment initiation
- session access window
- live session state
- cancellation handling
- post-session history

### 2. Money operations

The money loop covers:

- payment acceptance
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

## Operational screens

The admin web app is the primary operations console for:

- sessions
- chat moderation
- support queues
- financial records
- settlements and payout tools
- policy configuration
- reporting and diagnostics

## What this means for product design

An operational platform needs screens that are:

- easy to scan
- easy to audit
- clear about status
- calm in error states
- explicit about next steps

This is why Fayed screens should prioritize clarity, hierarchy, and policy-aware messaging.

