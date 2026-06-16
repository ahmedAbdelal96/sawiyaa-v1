# Fayed Platform Docs

This is the consolidated English handbook for the Fayed healthcare platform.

It explains how the platform works today:

- public web
- patient web
- practitioner web
- admin web
- backend service boundaries
- money, sessions, chat, support, and content flows
- the Fayed Clinical Warmth design language

Start here when you need the product model, the current status, or the practical rules behind the screens.

## Current platform status

| Area | Status | Notes |
| --- | --- | --- |
| Availability and schedule system | Closed | Weekly recurring availability, specific-day adjustments, and current/future exceptions form the booking base. |
| Instant Booking | Closed with one deferred external check | Phases 1-4 and 6-6C are closed; Phase 5 is implemented, but Paymob sandbox QA still returns `403 Forbidden` here. |
| Payments | Closed for internal flows | Session, package, and training payment returns are documented; provider-side Paymob QA stays deferred. |
| Mobile parity | Closed | Patient and practitioner Expo flows mirror the core booking and payment surfaces. |
| Known external blockers | Deferred | Paymob sandbox/provider checkout QA. |
| Known technical blockers | None product-critical in this docs set | Any remaining repo-local issues should be tracked separately from the product docs. |

## Feature status matrix

| Area | Feature | Status | Web | Mobile | Backend | Notes / blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Availability | Weekly schedule | Closed | Closed | Closed | Closed | Recurring schedule repeats weekly. |
| Availability | Specific-day adjustments | Closed | Closed | Closed | Closed | Exceptions stay separate from the weekly schedule. |
| Availability | Exceptions table | Closed | Closed | Closed | Closed | Global current/future exception visibility exists. |
| Booking | Scheduled booking | Closed | Closed | Closed | Closed | Normal booking depends on availability and payment. |
| Booking | Instant Booking | Closed | Closed | Closed | Closed | Phase 5 remains externally blocked by Paymob QA. |
| Sessions | Session join / joinAvailability | Closed | Closed | Closed | Closed | No join before backend confirmation. |
| Sessions | Session chat | Closed | Closed | Closed | Closed | Read-only/disabled states are documented. |
| Finance | Payments | Closed | Closed | Closed | Closed | Session, package, and training payments documented. |
| Finance | Wallet / refunds / settlements | Closed | Closed | Closed | Closed | Backend remains the source of truth. |
| Practitioner | Onboarding / profile | Closed | Closed | Closed | Closed | Includes application, review, and pricing contract. |
| Admin | Operations | Closed | Closed | Closed | Closed | Finance, moderation, support, and reporting are documented. |
| Mobile | Patient and practitioner parity | Closed | Closed | Closed | Closed | Mirror surfaces exist for the main care flows. |
| External | Paymob provider QA | Deferred | Deferred | Deferred | Deferred | Sandbox/provider checkout still returns `403 Forbidden` in this environment. |
| Platform | Notifications / push | Planned | Planned | Planned | Planned | Important related area; not the core closure focus of this docs set. |

## How to read this set

1. Start with [Platform overview](platform-overview.md).
2. Read [Architecture and developer guide](architecture-and-developer-guide.md) next for the repo and route map.
3. Use [Users and journeys](users-and-journeys.md) to understand the experience by audience.
4. Use [Booking, sessions, and availability](booking-sessions-and-availability.md) for the care flow core.
5. Use [Payments, wallet, and finance](payments-wallet-and-finance.md) for money flows.
6. Use [Operations and support](operations-and-support.md) for admin and support workflows.
7. Use [Security, roles, and permissions](security-roles-and-permissions.md) for access rules.
8. Use [Design, content, and i18n](design-content-and-i18n.md) for tone and visual guidance.
9. Keep [Glossary](glossary.md) open for shared terms.
10. Review [Deferred work and risks](deferred-work-and-risks.md) for external blockers and follow-ups.

## Core docs

- [Platform overview](platform-overview.md)
- [Architecture and developer guide](architecture-and-developer-guide.md)
- [Users and journeys](users-and-journeys.md)
- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Operations and support](operations-and-support.md)
- [Security, roles, and permissions](security-roles-and-permissions.md)
- [Design, content, and i18n](design-content-and-i18n.md)
- [Glossary](glossary.md)
- [Deferred work and risks](deferred-work-and-risks.md)

## Appendix

- [Competitor study: Shezlong and Esaal](fayed_competitor_study_shezlong_esaal.md)

## Source of truth

When a doc and the code disagree, the code wins.

Update this handbook whenever the product changes in a way users can feel:

- a new route is added
- a role or permission changes
- a payment or refund flow changes
- a patient journey screen changes
- a chat state or cancellation policy changes
