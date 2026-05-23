# Patient Journey

The patient experience is the most sensitive part of the platform.
It must feel clear, gentle, and reliable from first visit to follow-up.

## Main patient goals

- Find the right practitioner or service.
- Understand session availability and price before booking.
- Pay safely and see the result clearly.
- Join the session at the right time.
- Chat when allowed, without confusion.
- Review wallet, payments, and support history without technical noise.

## Typical flow

1. Discover practitioners or services.
2. Sign in or create an account.
3. Review a practitioner or session.
4. Book and pay.
5. Check the session detail page.
6. Join the session when it becomes available.
7. Continue in session chat or care chat where appropriate.
8. Review wallet and payments after the session.
9. Use support or help if anything needs clarification.

## Important patient surfaces

- `/[locale]/patient`
- `/[locale]/patient/sessions`
- `/[locale]/patient/sessions/[id]`
- `/[locale]/patient/sessions/[id]/chat`
- `/[locale]/patient/wallet`
- `/[locale]/patient/payments`
- `/[locale]/patient/profile`
- `/[locale]/patient/support`
- `/[locale]/patient/help`

## UX expectations

- The patient should know who the session is with.
- The patient should know when the session starts.
- The patient should know whether they can join now.
- The patient should know whether chat is available.
- The patient should know whether cancellation is allowed.
- The patient should know what happened with the money.

## Failure states

Patient-facing screens must handle blocked or unavailable states with supportive language:

- chat not opened yet
- session not eligible yet
- sending disabled
- read-only conversation
- cancellation not allowed
- payment pending or failed
- wallet empty

These states should explain the next safe action instead of showing raw technical details.

