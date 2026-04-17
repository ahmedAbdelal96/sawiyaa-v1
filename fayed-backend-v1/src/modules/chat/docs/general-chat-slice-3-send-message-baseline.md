# General Chat Slice 3 — Send-Message Baseline

## Scope
- Adds real message persistence for owned General Chat conversations.
- Supports text content plus optional metadata-only attachment references.
- Updates conversation latest activity timestamp after send.

## Endpoint
- `POST /api/v1/chat/conversations/:id/messages`

## Send Rules
- Sender must be an active participant in the target conversation.
- Conversation must remain within General Chat boundary and in sendable status.
- Empty/whitespace-only content is rejected.

## Attachment Policy (V1)
- Metadata-only references (not file lifecycle management):
  - `fileId`
  - `fileUrl`
  - `mimeType`
  - optional `fileSize`, `originalName`
- Max 5 attachments per message.
- Narrow mime allow-list:
  - `image/*`
  - `application/pdf`
  - `text/*`

## Activity Semantics
- On successful send, conversation `updatedAt` is updated to message `sentAt`.
- Existing list/detail read surfaces consume this safely through latest activity + latest message projection.

## Error Contract Additions
- `GENERAL_CHAT_CONVERSATION_NOT_SENDABLE`
- `GENERAL_CHAT_MESSAGE_CONTENT_REQUIRED`
- `GENERAL_CHAT_ATTACHMENT_REF_INVALID`

