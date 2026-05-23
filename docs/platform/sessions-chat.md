# Sessions and Chat

Sessions and chat are the heart of the care journey.

The user should always know:

- what session this is
- who it is with
- when it starts
- whether they can enter now
- whether they can send a message
- what happens if the session is cancelled or closed

## Session lifecycle

The exact states depend on the backend session model, but the UX usually needs to cover:

- upcoming
- available to join
- in progress
- expired
- cancelled
- closed
- read-only

## Chat surfaces

Fayed uses two distinct chat experiences:

1. **Session chat** - tied to one booked session.
2. **Care chat** - broader support or ongoing care conversation.

They should not be visually or linguistically confused.

## Session detail page

The session detail page is the decision screen for the patient.
It should answer quickly:

- Can I enter?
- Can I chat?
- Can I cancel?
- What is the price and refund outcome?
- What happens next?

## Session chat page

The chat page should handle:

- not opened yet
- read-only conversation
- sending disabled
- practitioner or admin moderation
- attachment access
- loading errors
- forbidden or not found states

When chat is not available, the user should see a calm explanation and a clear return action.
It should never expose a raw route or technical enum as the main message.

## Cancellation and refunds

Cancellation should be treated as a policy-driven flow:

- show the policy result before confirmation
- show whether cancellation is allowed
- show the refund outcome clearly
- show the policy link if one exists

## Related files

- patient session detail components
- session chat components
- session translations
- cancel modal copy and policy text

