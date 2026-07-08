# Provider Abstractions

This document explains the backend rule for external vendors.

## Core rule

- Business logic should not be tightly coupled to one vendor SDK.
- External providers must stay behind internal abstractions.
- Swapping providers should not require rewriting product rules.

## Provider areas

- Email provider
- Payment provider
- Session or video provider
- Any future notification or identity provider that enters the platform

## Current guidance

- Brevo is currently used for OTP and email delivery.
- Paymob is currently used for relevant payment flows.
- Stripe may be used where international support allows it.
- Session or video providers must remain swappable behind an internal contract.

## OTP and environment flags

- OTP behavior can be controlled through environment flags.
- OTP copy should keep the `Sawiyaa | سويّة` brand treatment used by the product.
- Deliverability, DNS, and provider configuration should be tracked operationally, not hidden in product docs.

## Related docs

- [Payments, wallet, and finance](payments-wallet-and-finance.md)
- [Notifications and alerting](notifications-and-alerting.md)
- [Production rollout](production-rollout.md)
