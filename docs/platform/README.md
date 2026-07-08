# Sawiyaa Platform Docs

This is the consolidated English handbook for the Sawiyaa healthcare platform.

It explains the current product model across:

- public web
- patient web
- practitioner web
- admin web
- mobile
- backend service boundaries
- money, sessions, support, and content flows
- the Sawiyaa Clinical Warmth design language

Start here when you need the current status or the practical rules behind the screens.

## Current platform status

| Area | Status | Notes |
| --- | --- | --- |
| Availability | Closed | Week-by-week availability is the current model. `DRAFT`, `PUBLISHED`, and `ARCHIVED` weeks are explicit. |
| Instant Booking | Closed with one deferred external check | Core product flow is closed; provider-side checkout QA can still lag behind. |
| Payments and payouts | Closed for current workflows | Money flows are backend-owned and currency-aware. Individual practitioner payout is the active payout path. |
| Specialties localization | Closed | `nameAr` and `nameEn` are part of the live contract and must be filled and displayed correctly. |
| Academy v2 | Closed / complete | Academy is the only visible learning product. Public program browsing, enrollment, payment return, learner portal, admin learners, attendance, manual enrollment, and certificates are implemented and smoke-tested. |
| Practitioner onboarding | Closed | Self-application and admin direct-create have distinct step-up rules. |
| Support and care chat | Closed | Support ownership and care-chat approval are explicit operational rules. |
| Notifications | Closed / active | Operational notifications, reminders, and care-chat approval messages are documented. |
| Mobile parity | Closed | Mobile mirrors the core booking, session, and finance contracts. |
| External provider QA | Deferred | Provider-side sandbox behavior can still block final end-to-end verification. |
| Removed flows | Retired | `/admin/settlements` and the legacy recurring availability runtime flow are not active product paths. |

## Feature status matrix

| Area | Feature | Status | Notes |
| --- | --- | --- | --- |
| Availability | Week-by-week availability | Closed | Public booking reads only `PUBLISHED` weeks. |
| Availability | Week statuses | Closed | `DRAFT`, `PUBLISHED`, `ARCHIVED`. |
| Availability | Legacy recurring runtime flow | Retired | Do not reintroduce `AvailabilitySlot` runtime behavior. |
| Booking | Scheduled booking | Closed | Backend owns availability and payment validation. |
| Booking | Instant Booking | Closed | Frozen pricing, eligibility, and payment confirmation remain backend-owned. |
| Sessions | Session join and joinAvailability | Closed | `joinAvailability.canJoin` controls the Join CTA. |
| Sessions | Session presentation state | Closed | `presentationStatus` is translated, not rendered raw. |
| Finance | Wallet, refunds, payouts | Closed | Individual practitioner payout is the active payout workflow. |
| Finance | Accounting reconciliation | Closed | Diagnostic only, no money movement. |
| Academy | Public Academy, learner portal, attendance, certificates | Closed / complete | Academy is the only visible training product; Training stays legacy/internal only. |
| Practitioner | Onboarding / profile | Closed | Self-apply and admin direct-create are separate flows. |
| Admin | Support / moderation / finance | Closed | Support ownership, care chat approval, and payout rules are explicit. |
| Specialties | Localized names | Closed | Admin uses raw `nameAr` / `nameEn`; public pages use locale-aware display helpers. |

## How to read this set

1. Start with [Platform overview](platform-overview.md).
2. Read [Architecture and developer guide](architecture-and-developer-guide.md) next for the repo and route map.
3. Use [Users and journeys](users-and-journeys.md) to understand the experience by audience.
4. Use [Availability system](availability-system.md) for the current scheduling contract.
5. Use [Booking, sessions, and availability](booking-sessions-and-availability.md) for the care flow core.
6. Use [Specialties localization](specialties-localization.md) for localized specialty names.
7. Use [Payments, wallet, and finance](payments-wallet-and-finance.md) and [Finance and payouts](finance-and-payouts.md) for money flows.
8. Use [Practitioner onboarding](practitioner-onboarding.md) for direct-create and approval policy.
9. Use [Operations and support](operations-and-support.md) and [Support and care chat](support-and-care-chat.md) for admin and support workflows.
10. Use [Security, roles, and permissions](security-roles-and-permissions.md) for access rules.
11. Use [Design, content, and i18n](design-content-and-i18n.md) for tone and visual guidance.
12. Keep [Glossary](glossary.md) open for shared terms.
13. Review [Deferred work and risks](deferred-work-and-risks.md) and [Production rollout](production-rollout.md) for rollout safety.

## Core docs

- [Platform overview](platform-overview.md)
- [Architecture and developer guide](architecture-and-developer-guide.md)
- [Users and journeys](users-and-journeys.md)
- [Availability system](availability-system.md)
- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Specialties localization](specialties-localization.md)
- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Finance and payouts](finance-and-payouts.md)
- [Practitioner onboarding](practitioner-onboarding.md)
- [Operations and support](operations-and-support.md)
- [Support and care chat](support-and-care-chat.md)
- [Security, roles, and permissions](security-roles-and-permissions.md)
- [Design, content, and i18n](design-content-and-i18n.md)
- [Notifications and alerting](notifications-and-alerting.md)
- [Provider abstractions](provider-abstractions.md)
- [Accounting reconciliation](accounting-reconciliation.md)
- [Production rollout](production-rollout.md)
- [Removed and deprecated flows](removed-and-deprecated-flows.md)
- [Glossary](glossary.md)
- [Deferred work and risks](deferred-work-and-risks.md)

## Appendix

- [Competitor study: Shezlong and Esaal](fayed_competitor_study_shezlong_esaal.md)

## Source of truth

When a doc and the code disagree, the code wins.

Update this handbook whenever the product changes in a way users can feel:

- a new route is added
- a role or permission changes
- a payment, payout, or refund flow changes
- a patient journey screen changes
- a chat state or cancellation policy changes
- a localization contract changes
