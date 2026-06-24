# General Chat Slice 5 - Moderation / Report Hooks

## Scope
- Adds participant-scoped report hooks for General Chat conversations and messages.
- Reuses existing moderation intake/report pipeline (no new moderation platform).
- Preserves strict General Chat boundary checks before intake submission.

## Endpoints
- `POST /api/v1/chat/conversations/:id/report`
- `POST /api/v1/chat/conversations/:id/messages/:messageId/report`

## Access Rules
- Reporter must be an active participant for the conversation/message scope.
- Non-participants are rejected explicitly.
- Message reporting is bound to both `conversationId` and `messageId`.

## Moderation Integration
- Uses existing moderation report intake use-case.
- Introduces General Chat target types:
  - `GENERAL_CHAT_CONVERSATION`
  - `GENERAL_CHAT_MESSAGE`
- Creates standard moderation report + audit trail through current foundations.

## Contract Notes
- Chat-facing report response remains narrow and safe:
  - `reportId`
  - `targetType`
  - `targetId`
  - `reason`
  - `status`
  - `createdAt`
- No moderation internals are leaked in chat contracts.
