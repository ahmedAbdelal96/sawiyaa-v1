# جاهزية API لتطبيق الموبايل

آخر تحديث: 2026-04-09

## 1) نطاق التحقق
- Backend controllers: `fayed-backend-v1/src/modules/**/controllers/*.controller.ts`
- Frontend API usage: `fayed-frontend-v1/src/features/**/api/*.ts`

## 2) Mobile-Relevant Endpoint Map
## 2.1 Auth / Bootstrap
- `POST /auth/patient/register`
- `POST /auth/patient/login`
- `POST /auth/patient/google`
- `POST /auth/patient/refresh`
- `POST /auth/patient/logout`
- `GET /auth/me`
- `GET /users/me`
- `GET /users/me/roles`
- `GET /users/me/security-state`

الحالة: جاهز.

## 2.2 Profile / Settings
- `GET /patients/me`
- `PATCH /patients/me`
- `GET /settings/me`
- `PATCH /settings/me/preferences`
- `GET /settings/me/notification-preferences`
- `PUT /settings/me/notification-preferences`

الحالة: جاهز (مع ملاحظة أن settings lane في frontend الحالي جزئي product-wise).

## 2.3 Discovery / Matching / Journey / Assessments
- `GET /specialties`
- `GET /specialties/:slug`
- `GET /public/practitioners`
- `GET /public/practitioners/:slug`
- `POST /matching/sessions`
- `GET /matching/sessions/:id`
- `GET /patients/me/journey`
- `GET /assessments`
- `GET /assessments/:slug`
- `POST /assessments/:slug/submissions`
- `GET /patients/me/assessments`
- `GET /patients/me/assessments/:submissionId`

الحالة: جاهز جدًا لـ MVP guided-care.

## 2.4 Booking / Session Runtime
- `POST /patients/me/sessions` (duration `30 | 60` من DTO)
- `GET /patients/me/sessions`
- `GET /patients/me/sessions/:id`
- `POST /patients/me/sessions/:id/cancel`
- `POST /patients/me/sessions/:id/runtime/prepare`
- `GET /patients/me/sessions/:id/runtime/join`
- Public availability windows:
  - `GET /public/practitioners/:slug/availability`
  - `GET /public/practitioners/:slug/availability/windows`

الحالة: جاهز.

## 2.5 Payments
- `POST /patients/me/sessions/:id/payments/initiate`
- `GET /patients/me/payments`
- `GET /patients/me/payments/:id`
- `POST /patients/me/sessions/:id/coupons/validate`
- `POST /patients/me/sessions/:id/financial-breakdown`

الحالة: جاهز وظيفيًا، لكن mobile return/deeplink contract يحتاج تثبيت صريح قبل التنفيذ.

## 2.6 Support / Care Chat
- Support:
  - `POST /patients/me/support/tickets`
  - `GET /patients/me/support/tickets`
  - `GET /patients/me/support/tickets/:id`
  - `POST /patients/me/support/tickets/:id/messages`
- Care Chat:
  - `POST /patients/me/care-chat/requests`
  - `GET /patients/me/care-chat/requests`
  - `GET /patients/me/care-chat/requests/:id`
  - `GET /patients/me/care-chat/conversations/:id`
  - `POST /patients/me/care-chat/conversations/:id/messages`

الحالة: جاهز baseline نصي.  
ملاحظة: attachments غير ظاهرة في support/care-chat DTOs (على عكس general chat).

## 2.7 Reviews / Content / Training
- Reviews:
  - `POST /patients/me/sessions/:id/review`
  - `GET /patients/me/reviews`
  - `GET /patients/me/reviews/:id`
- Articles:
  - `GET /articles`
  - `GET /articles/:slug`
- Training:
  - `GET /trainings`
  - `GET /trainings/:slug`
  - `POST /patients/me/training/schedules/:scheduleId/enrollments`
  - `GET /patients/me/training/enrollments`
  - `GET /patients/me/training/enrollments/:id`
  - `GET /patients/me/training/enrollments/:id/join-access`

الحالة: جاهز، لكن training ليس ضمن MVP الأساسي المقترح.

## 3) Auth/Session Handling Notes (من الواقع الحالي)
- JWT access + refresh موجودين.
- refresh/logout role-scoped (`patient/practitioner/admin`).
- frontend الحالي يستخدم cookies + refresh route، بينما الموبايل يحتاج token storage وrefresh interceptor native.

## 4) Contract Notes مهمة للموبايل
1. API prefix ثابت: `/api/v1` من `main.ts`.
2. envelopes: `success/data` pattern متكرر.
3. language headers: `Accept-Language` + دعم `x-lang`.
4. session join contract واضح (`canJoin`, `blockedReason`, `joinToken`).
5. payment initiate قد يعيد `checkoutUrl` أو `clientSecret`.

## 5) Known Gaps قبل موبايل
1. لا يوجد end-user notifications feed endpoint واضح للمستفيد.
2. لا يوجد device registration endpoint واضح لـ push (رغم وجود model `NotificationDevice` في schema).
3. لا يوجد وثيقة عقد رسمية للـ deep links بين payment provider وmobile app.
4. terminology في بعض endpoints/keys patient-centric تقنيًا (مقبول داخليًا، يحتاج UX mapping فقط).

## 6) Backend Updates مطلوبة قبل/مع Sprint 1
1. توثيق أو endpoint صريح لـ `mobile payment return` + deep link payload.
2. إضافة/تثبيت endpoint لـ push token registration + disable/revoke.
3. تحديد رسمي لعقد user notification feed (list/read/mark-read) إن كان ضمن V1/V1.5.
4. توحيد contract doc قصير يحدد status/error codes الحرجة لمسارات:
   - auth refresh failures
   - booking conflicts
   - payment state transitions
   - join blocked reasons

## 7) Verdict
الـ APIs الأساسية لموبايل MVP جاهزة بنسبة عملية عالية.  
الـ blockers ليست في core business APIs، بل في mobile-specific operational contracts (push, deep-link payments, notification feed).

