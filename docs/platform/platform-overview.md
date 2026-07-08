# Platform Overview

Sawiyaa is a healthcare platform that connects patients with practitioners for discovery, booking, sessions, follow-up, support, and structured content.

The product is not a generic SaaS dashboard. It is a care platform, so the experience must feel calm, trustworthy, and clear.

## Core product promise

- Help patients find the right practitioner with less confusion.
- Help practitioners manage availability, sessions, and earnings with less friction.
- Help admins operate the platform safely and consistently.
- Keep money, chat, session, availability, and instant booking flows understandable at every step.

## Main product surfaces

- **Public web**: marketing pages, help, policies, practitioner discovery, articles, sign-in, sign-up, and public session booking flows.
- **Patient web**: dashboard, instant booking, sessions, chat, wallet, payments, profile, support, help, and related care flows.
- **Practitioner web**: dashboard, profile, availability, instant booking queue, sessions, chat, wallet, ledger, promo codes, support, and practice operations.
- **Admin web**: user management, moderation, support, content, finance, practitioner payouts, accounting reconciliation, refunds, reports, policies, and platform operations.
- **Mobile**: patient and practitioner Expo app surfaces that mirror the core care flows, including instant booking and payment-return states where applicable.

## What makes the product different

- Arabic-first behavior with full RTL support.
- Bilingual UX where English is available and should feel equally polished.
- Clinical Warmth design language instead of generic startup styling.
- Week-by-week availability with explicit week statuses.
- Sensitive financial and medical-adjacent flows that must be explicit and data-driven.
- Two chat models:
  - session chat for a specific booked session
  - care chat for broader support or care follow-up

## Product principles

1. **Clarity over density** - show the next useful action first.
2. **Trust through consistency** - use predictable page structures and familiar controls.
3. **Warmth without playfulness** - calm, professional, human, and not sterile.
4. **Data-driven money** - never fake amounts, currencies, or refund states.
5. **Backend source of truth** - do not invent frontend-only business rules.
6. **No route leakage** - never expose raw paths or technical reasons to patients.

## Business model snapshot

Sawiyaa behaves like a managed healthcare marketplace:

- the patient side creates demand
- the practitioner side supplies expertise and availability
- the platform handles discovery, policy, payment, support, and moderation

In practical terms, the product is centered on:

- session-based transactions
- instant booking fast-path sessions with backend-owned pricing
- platform-controlled money flow
- wallet, payouts, and accounting reconciliation
- refund and cancellation policy enforcement
- practitioner payout operations
- optional training and content expansion paths
- future B2B / AI expansion as deferred work, not current core

Only document fee and revenue rules that the code currently enforces.

## What Sawiyaa Is

Sawiyaa is a managed healthcare marketplace.

It connects patients with practitioners and combines discovery, booking, instant booking, availability, sessions, payments, wallet, support, chat, admin operations, notifications, and mobile parity into one care platform.

Its value is more than taking a booking. It gives the platform:

- trust in who the patient is booking with
- speed in getting to the right next step
- clarity in what happens before, during, and after payment
- operational control for admins, support, and finance teams

## What Sawiyaa Is Not

Sawiyaa is not:

- a generic SaaS dashboard
- a simple doctor directory
- a frontend-only booking UI
- a payment wrapper
- a chat-only consultation app
- an AI-first product yet

That matters because the product should be judged as a managed healthcare marketplace, not just a page collection.

## Strategic direction

The platform now has two layers:

### Platform Core

The core handles the operational backbone:

- authentication and identity
- patients and practitioners
- sessions and scheduling
- availability and presence
- instant booking
- payments, refunds, wallet, payouts, and accounting
- support and moderation
- notifications
- content and training
- admin operations and diagnostics

### Care Experience Layer

The care experience layer turns the platform into a guided journey instead of a static listing:

- guided entry points
- guided matching
- assessments and self-discovery
- session booking hardening
- support as a product surface
- therapy journey and patient journey views
- continuity and follow-up signals

## Market positioning insight

The competitor study exists to sharpen product choices, not to encourage imitation.

- Shezlong shows the value of depth, trust, and structured mental-health booking.
- Esaal shows the value of mobile-first access and multi-specialty breadth.
- Sawiyaa should compete through clearer UX, stronger session-state handling, better financial correctness, localized specialty names, and guided care.

The practical outcome is that Sawiyaa should feel easier to trust, easier to navigate, and more operationally consistent than a generic booking product.

## Source note

The root `DESIGN.md` remains the canonical source for the visual token palette and brand values. This docs set summarizes the product-facing rules and workflow implications.

## Related docs

- [Competitor study: Shezlong and Esaal](fayed_competitor_study_shezlong_esaal.md)
- [Architecture and developer guide](architecture-and-developer-guide.md)
- [Users and journeys](users-and-journeys.md)
- [Availability system](availability-system.md)
- [Finance and payouts](finance-and-payouts.md)
- [Specialties localization](specialties-localization.md)
