# API Contract Freeze Reference (Frontend)

## 1) Success Envelope Policy

All successful API responses are normalized as:

```json
{
  "success": true,
  "data": { }
}
```

Notes:
- Global response interceptor owns this behavior.
- If a controller already returns `{ success, data }`, it is passed through (not double-wrapped).

## 2) Error Response Shape

All error responses are normalized as:

```json
{
  "success": false,
  "errorCode": "MACHINE_READABLE_CODE",
  "messageKey": "i18n.message.key",
  "message": "Localized/fallback message",
  "errors": [],
  "timestamp": "ISO-8601",
  "path": "/api/v1/...",
  "locale": "ar|en|...",
  "requestId": "optional-request-id"
}
```

## 3) Pagination / List Conventions

Standard list envelope:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 1
  }
}
```

Conventions:
- `page` is 1-based.
- deterministic ordering is defined per endpoint module docs.
- filters/sorts are optional and validated by DTOs.

## 4) Core Enum/Status Families (Frontend-Critical)

- Sessions: `SessionStatus`, `SessionMode`, join blocked reasons
- Payments/Refunds: `PaymentStatus`, `PaymentProvider`, `RefundStatus`, `RefundType`
- Training: `CourseStatus`, `CourseScheduleStatus`, `EnrollmentStatus`, join blocked reasons, enrollment availability reasons
- Reviews: public moderation-safe visibility states reflected through filtered outputs
- Notifications ops: `NotificationStatus`, `NotificationChannel`, `NotificationCategory`, `DeliveryAttemptStatus`
- Support/Care chat: ticket status/priority/type + care-chat approval/conversation statuses

## 5) Route Access Matrix (High-Level)

- Public:
  - `/public/practitioners/*`
  - `/articles*`
  - `/trainings*`
  - `/reviews` public practitioner endpoints
- Patient:
  - `/patients/me/*` (sessions, payments, training, support, journey, reviews)
  - `/matching/sessions/*`
- Practitioner:
  - `/practitioner/*` + practitioner support/care-chat/availability/presence ops
- Admin / Support:
  - `/admin/*` (moderation, notification ops, reviews moderation, financial ops, training authoring)

## 6) Frontend Freeze Priorities

1. Auth + `/users/me` bootstrap contracts
2. Public practitioner + trust/reviews/articles contracts
3. Sessions runtime/join + payments/refunds
4. Training enrollment/join + matching + patient journey
5. Support/care-chat role-specific read/write contracts

## 7) Contract Stability Rule

For frozen routes:
- no renaming/removal of existing response fields without versioning
- only additive optional fields are allowed
- enum value changes require explicit frontend coordination
