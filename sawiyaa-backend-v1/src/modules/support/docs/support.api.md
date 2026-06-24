# Support API

## Purpose
Support module handles operational help flows for booking/payment/account/session/matching issues.
It is separate from therapist-patient care chat.

## V1 Scope
- Patient ticket creation/list/read/message
- Practitioner ticket creation/list/read/message
- Admin/support list/read/message/internal-note/status/assignment
- Ownership restrictions and internal-note visibility rules
- Optional related-entity linking with ownership validation

## Explicit Out Of Scope (V1)
- Attachments are deferred and not supported in support endpoints yet.
- Therapist-patient care chat is a separate capability and not part of this module.
- Current support scope is ticketing + threaded support operations only.

## Endpoints
- `POST /api/v1/patients/me/support/tickets`
- `GET /api/v1/patients/me/support/tickets`
- `GET /api/v1/patients/me/support/tickets/:id`
- `POST /api/v1/patients/me/support/tickets/:id/messages`
- `POST /api/v1/practitioners/me/support/tickets`
- `GET /api/v1/practitioners/me/support/tickets`
- `GET /api/v1/practitioners/me/support/tickets/:id`
- `POST /api/v1/practitioners/me/support/tickets/:id/messages`
- `GET /api/v1/admin/support/tickets`
- `GET /api/v1/admin/support/tickets/:id`
- `POST /api/v1/admin/support/tickets/:id/messages`
- `POST /api/v1/admin/support/tickets/:id/internal-notes`
- `PATCH /api/v1/admin/support/tickets/:id/status`
- `PATCH /api/v1/admin/support/tickets/:id/assign`
