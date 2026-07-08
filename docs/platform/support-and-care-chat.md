# Support and Care Chat

This document covers support ownership and the separate care-chat approval flow.

## Support ownership

- The first public staff reply on an unassigned ticket claims ownership.
- Only the assigned owner can send public replies.
- Non-owner support or admin users must be blocked from public replies.
- Internal notes do not claim ownership and do not change assignment.
- Ownership transfer stays available through the admin assignment flow.
- The structured error code `SUPPORT_TICKET_ASSIGNED_TO_ANOTHER_AGENT` should remain intact.

## Care chat approval

- Care chat approval notifications are part of the operational flow.
- The copy should make it clear that review happens before the conversation opens.
- Duplicate notifications should be suppressed.

## Expiry sweeper

- A passive sweeper expires pending approvals after the configured window.
- The sweeper starts after bootstrap.
- The sweeper runs daily.
- The sweeper should not create duplicate notifications or reopen expired approvals.

## UI rules

- Non-owners should see the composer disabled with friendly copy.
- Support and care chat must stay visually distinct from session chat.
- User-facing copy should explain what happens next without technical noise.

## Related docs

- [Operations and support](operations-and-support.md)
- [Notifications and alerting](notifications-and-alerting.md)
