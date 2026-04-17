# نطاق Mobile MVP (تطبيق المستفيد)

آخر تحديث: 2026-04-09

## 1) الهدف العملي للـ MVP
إطلاق تطبيق مستفيد يحقق مسارًا مكتملًا وقابلًا للقياس:
`Sign in -> اختيار مختص مناسب -> حجز -> دفع -> دخول جلسة -> متابعة الرحلة/الدعم`

## 2) In Scope (MVP)
1. Auth & Session bootstrap
2. Profile baseline (`/patients/me`)
3. Guided entry + patient journey summary
4. Discovery + practitioner profile + availability windows
5. Guided matching (create/get matching session)
6. Session booking (30/60 دقيقة)
7. Session payment (initiate + return handling + state refresh)
8. Session list/detail + runtime prepare/join
9. Support tickets baseline
10. Care chat baseline النصي (بدون attachments)
11. Arabic-first UX + English readiness

## 3) Out of Scope (Deferred)
1. تطبيق مختص أو Admin على الموبايل
2. Advanced notifications center داخل التطبيق
3. Attachments in support/care-chat
4. General chat full product lane
5. Training/LMS full lanes
6. تعقيدات growth المتقدمة (gamification/advanced segmentation)

## 4) Critical Assumptions
1. العقود الحالية في backend (`/api/v1`) ستبقى مستقرة خلال MVP.
2. Product سيعتمد terminology UX الجديدة بدون طلب refactor تقني فوري.
3. payment provider flow يدعم mobile deep-link return باتفاق واضح.
4. المطور الواحد يلتزم scope freeze ولا يفتح lanes جانبية.

## 5) API Dependency Map (MVP)
| Feature | APIs |
|---|---|
| Auth | `/auth/patient/*`, `/auth/me`, `/users/me*` |
| Journey | `/patients/me/journey` |
| Discovery | `/specialties`, `/public/practitioners`, `/public/practitioners/:slug` |
| Matching | `/matching/sessions`, `/matching/sessions/:id` |
| Availability | `/public/practitioners/:slug/availability/windows` |
| Booking | `/patients/me/sessions` |
| Payment | `/patients/me/sessions/:id/payments/initiate`, `/patients/me/payments*`, `/patients/me/sessions/:id/financial-breakdown` |
| Session runtime | `/patients/me/sessions/:id/runtime/prepare`, `/patients/me/sessions/:id/runtime/join` |
| Support | `/patients/me/support/tickets*` |
| Care Chat | `/patients/me/care-chat/*` |

## 6) Risks
1. غموض contract الدفع على الموبايل (redirect/deeplink/fallback).
2. عدم وجود push/device API واضح قد يؤجل تنبيهات مهمة.
3. drift لغوي بين مصطلحات backend وواجهة المستخدم.
4. توسعة scope أثناء التنفيذ (خصوصًا training/reviews/content) ترفع المخاطر.
5. المطور الواحد قد يتعطل إذا لم تُحسم dependencies مبكرًا.

## 7) Backend Dependencies Needed Early
1. توثيق رسمي لـ payment mobile return contract.
2. endpoint/device contract للتنبيهات push (حتى لو V1.5).
3. confirmation على سياسة join-window ورسائل blocked reasons للموبايل UX.

## 8) Acceptance Criteria by Feature
### Auth
- المستخدم يسجل/يدخل ويستعيد الجلسة بعد إغلاق التطبيق.
- refresh يعمل تلقائيًا بدون logout عشوائي.

### Discovery + Matching
- المستخدم يصل إلى shortlist مفهومة مع rationale بسيط.

### Booking + Payment
- المستخدم يكمل حجزًا مدفوعًا من الموبايل end-to-end.
- حالات الفشل/الإلغاء واضحة ويمكن التعافي منها.

### Session Runtime
- قبل وقت الجلسة يمكن `prepare`.
- وقت الجلسة يمكن `join` مع handling للحالات الممنوعة.

### Support
- إنشاء تذكرة + متابعة الردود داخل التطبيق.

### Care Chat
- إنشاء request + عرض conversation + إرسال رسائل نصية.

## 9) قرار النطاق النهائي
هذا النطاق صالح لبدء التنفيذ مباشرة، بشرط حسم 2 بنود قبل sprint coding:
1. payment return/deeplink contract
2. product language sign-off

