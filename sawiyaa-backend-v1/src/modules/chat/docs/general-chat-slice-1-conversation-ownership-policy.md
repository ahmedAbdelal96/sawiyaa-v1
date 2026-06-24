# General Chat Slice 1 — Conversation Ownership + Participant Policy

## Scope
- Establishes bounded General Chat ownership for 2-party participant-scoped conversations.
- Enforces strict role-pair policy and boundary separation from Support/Care-Chat.
- Provides deterministic create-or-get conversation baseline.

## Domain Boundaries
- General Chat conversations are stored as `ConversationType.SYSTEM` with:
  - `supportTicketId = null`
  - `chatApprovalRequestId = null`
- Support remains owned by `ConversationType.SUPPORT`.
- Care-Chat remains owned by `ConversationType.CARE_APPROVED`.

## Allowed Pair Matrix (V1)
- `PATIENT -> PRACTITIONER`: allowed
- `PRACTITIONER -> PATIENT`: allowed
- any other pair: forbidden

## Endpoint
- `POST /api/v1/chat/conversations`
  - deterministic create-or-get by generated `conversationRef`
  - optional `linkedSessionId` accepted only when the session belongs to the same patient-practitioner pair

## Determinism / Duplicate Prevention
- `conversationRef` is a deterministic hash from:
  - patient profile id
  - practitioner profile id
  - scope (`global` or `session:<id>`)
- Existing conversation by ref is returned instead of creating duplicates.

## Machine-Readable Error Codes
- `GENERAL_CHAT_PARTICIPANT_ROLE_FORBIDDEN`
- `GENERAL_CHAT_PARTICIPANT_PAIR_FORBIDDEN`
- `GENERAL_CHAT_PARTICIPANT_NOT_FOUND`
- `GENERAL_CHAT_SELF_CONVERSATION_FORBIDDEN`
- `GENERAL_CHAT_LINKED_SESSION_FORBIDDEN`
- `GENERAL_CHAT_CONVERSATION_BOUNDARY_VIOLATION`

