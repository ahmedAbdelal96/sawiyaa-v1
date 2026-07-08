# Notifications and Alerting

This document records the current notification rules that matter to the platform.

## Operational notification service

- The platform uses an operational notification service for important product events.
- Arabic and English notification catalogs must stay in sync.
- Notifications should remain backend-driven and not depend on frontend guesswork.

## Availability reminders

- Availability reminder templates exist.
- Reminder notifications should use the correct audience and timing contract from the backend.
- Reminder notifications are operational messages, not marketing content.

## Admin feed policy

- Admin feed logic should exclude reminder notifications where the product rules say they should stay out of the feed.
- Do not surface every operational notification in the same list if the target audience does not need it.

## Care chat and support

- Care chat approval notifications are part of the support flow.
- Duplicate alerts should be suppressed.

## Related docs

- [Support and care chat](support-and-care-chat.md)
- [Platform overview](platform-overview.md)
- [Provider abstractions](provider-abstractions.md)
