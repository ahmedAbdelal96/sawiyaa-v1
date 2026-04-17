# Care Chat Approval Module API

## Scope
- Approval-based patient-practitioner care chat only.
- Fully separate from support ticket/support chat.
- No public endpoints.
- Text-only messaging for V1.

## Core Rules
- No patient-practitioner care messaging without approved request.
- Exactly one patient + one practitioner per care chat conversation in V1.
- Sending messages requires active conversation state.
- Expired/revoked/closed conversations are read-only.
- Historical messages remain readable for authorized actors.

## Request Lifecycle
- `PENDING` -> `APPROVED` or `REJECTED`
- `APPROVED` -> `REVOKED`
- `PENDING` can become `EXPIRED` when past `expiresAt`

## Conversation Lifecycle
- Conversation is created only on approval.
- Conversation type is `CARE_APPROVED`.
- Activity state is resolved from:
  - conversation status
  - approval status
  - expiry timestamp

## Endpoints

### Patient
- `POST /api/v1/patients/me/care-chat/requests`
- `GET /api/v1/patients/me/care-chat/requests`
- `GET /api/v1/patients/me/care-chat/requests/:id`
- `GET /api/v1/patients/me/care-chat/conversations/:id`
- `POST /api/v1/patients/me/care-chat/conversations/:id/messages`

### Practitioner
- `GET /api/v1/practitioners/me/care-chat/requests`
- `GET /api/v1/practitioners/me/care-chat/requests/:id`
- `GET /api/v1/practitioners/me/care-chat/conversations/:id`
- `POST /api/v1/practitioners/me/care-chat/conversations/:id/messages`

### Admin/Support
- `GET /api/v1/admin/care-chat/requests`
- `GET /api/v1/admin/care-chat/requests/:id`
- `PATCH /api/v1/admin/care-chat/requests/:id/decision`
- `PATCH /api/v1/admin/care-chat/requests/:id/revoke`
- `GET /api/v1/admin/care-chat/conversations/:id`

## Deferred (Explicit)
- Practitioner-initiated request creation.
- Attachments.
- Realtime transport/websocket fanout.
- Full moderation console/report workflows.
