# General Chat Slice 2 — Conversation List / Detail Read Surfaces

## Scope
- Adds participant-scoped read endpoints for General Chat conversations.
- Keeps strict boundary separation from Support and Care-Chat.
- Does not add send-message, unread/read, moderation report hooks, or attachment workflows.

## Endpoints
- `GET /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations/:id`

## Ownership / Visibility Rules
- Only conversations in General Chat boundary are readable:
  - `conversationType = SYSTEM`
  - `supportTicketId = null`
  - `chatApprovalRequestId = null`
- List is participant-scoped at query level.
- Detail requires active participant membership; cross-user access is forbidden.

## List Contract Behavior
- Deterministic ordering: `updatedAt desc`, `id asc`.
- Pagination with `page`, `limit`, `totalItems`, `totalPages`.
- Includes:
  - conversation identity/ref/status
  - participant summary
  - optional linked session id
  - latest activity timestamp
  - optional latest message summary projection (nullable)

## Detail Contract Behavior
- Returns one participant-scoped conversation item.
- Includes same summary fields plus `hasMessages`.
- Safe empty state when no message exists:
  - `latestMessage = null`
  - `hasMessages = false`

## Error Contract Additions
- `GENERAL_CHAT_CONVERSATION_NOT_FOUND`
- `GENERAL_CHAT_CONVERSATION_ACCESS_DENIED`

