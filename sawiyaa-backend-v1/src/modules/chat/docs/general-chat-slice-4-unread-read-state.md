# General Chat Slice 4 - Unread / Read State

## Scope
- Adds participant-scoped read cursor state using existing `ConversationParticipant.lastReadMessageId` and `lastReadAt`.
- Adds idempotent mark-read endpoint for owned conversations.
- Extends list/detail contracts with deterministic unread/read fields.

## Endpoint
- `POST /api/v1/chat/conversations/:id/read`

## Read-State Rules
- Only active participants can mark/read conversation state.
- Mark-read advances cursor to latest visible message in the conversation.
- Repeated mark-read calls without newer messages are idempotent.

## Unread Count Semantics
- Unread count includes only visible (`NORMAL`) and non-deleted messages.
- Messages sent by the viewer are excluded from unread count.
- If no read cursor exists, unread count is computed from all eligible messages.

## Contract Additions
- Conversation list/detail items now include:
  - `unreadCount`
  - `hasUnread`
  - `lastReadMessageId`
  - `lastReadAt`
- Mark-read response returns the same read-state block for immediate frontend sync.
