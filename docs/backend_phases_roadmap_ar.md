# Backend Roadmap — Phases Plan

## الهدف
هذا الملف يحدد roadmap كاملة للـ backend على مراحل واضحة، بعد الانتهاء من:
- bootstrap
- full database schema
- migration الأولى
- Phase 1 implementation plan

> هذا الملف خطة تنفيذ عالية المستوى، وليس تنفيذ كود.

---

# المبادئ العامة للـ Backend
- Modular Monolith
- NestJS + Prisma + PostgreSQL
- Use-case based architecture
- Thin controllers
- Repositories per domain concern
- Policies / Guards منفصلة
- Config-driven business rules
- No giant service files

---

# Phase 1 — Access / Onboarding / Practitioner Setup

## الهدف
تشغيل المدخل الأساسي للمنصة:
- auth
- profiles
- specialties
- practitioner onboarding
- admin approval
- notifications baseline
- config baseline

## يشمل
### Auth
- patient auth baseline
- practitioner auth baseline
- admin auth baseline
- JWT + sessions
- Google login للعميل
- password + OTP للمعالج

### Profiles
- patient profile
- practitioner profile
- profile completion

### Specialties
- categories
- specialties
- practitioner specialty assignment

### Practitioner Onboarding
- application submit
- credentials metadata
- approval / rejection

### Notifications baseline
- OTP
- practitioner application lifecycle
- password reset

### Config baseline
- resolver
- minimum keys

## الناتج النهائي
- patient account flow شغال
- practitioner onboarding flow شغال
- admin approval flow شغال

---

# Phase 2 — Sessions / Availability / Presence / Instant Booking

## الهدف
تشغيل المنطق الأساسي للجلسات والحجوزات.

## يشمل
### Availability
- create/update availability slots
- exceptions
- timezone-aware schedule logic

### Presence
- online / offline / away / busy
- heartbeat strategy
- instant booking live status

### Sessions
- scheduled sessions
- 30 / 60 minute support
- join window calculation
- session lifecycle statuses
- session events

### Instant Booking
- request flow
- practitioner response flow
- timeout handling
- accept / reject / expire

### Daily integration baseline
- create room
- join token flow
- provider references inside session
- provider webhooks baseline

## الناتج النهائي
- المعالج يحدد جدوله
- العميل يقدر يطلب جلسة أو يحجز
- الحجز الفوري يشتغل
- Daily session linking جاهز

---

# Phase 3 — Payments / Financial Flow

## الهدف
ربط الجلسات بالدفع بشكل فعلي.

## يشمل
### Payment core
- Stripe integration
- Paymob integration
- checkout initiation
- payment webhooks
- payment status transitions

### Refunds
- full / partial refund baseline
- policy-driven refund logic

### Notifications
- payment success / failed
- booking confirmation reminders

### Session + payment orchestration
- no confirmed session without valid payment state
- payment expiry handling
- unpaid session expiration

## الناتج النهائي
- العميل يدفع
- الجلسة تتأكد
- payment webhooks شغالة
- refunds الأساسية موجودة

---

# Phase 4 — Ledger / Wallet / Settlement / Coupons / Commissions

## الهدف
تشغيل المنطق المالي الكامل للمنصة.

## يشمل
### Ledger
- posting ledger entries
- transaction-safe financial writes
- reversal flows

### Wallet
- practitioner visible balances
- available / pending / reserved

### Settlements
- monthly settlement generation
- settlement status flow
- payout tracking

### Commission rules
- rule resolution
- local vs cross-border scenarios
- config/policy integration

### Coupons
- coupon validation
- coupon approval flow
- practitioner/platform split handling
- coupon redemption tracking

## الناتج النهائي
- النظام المالي الداخلي شغال
- المعالج يشوف رصيده
- التسوية الشهرية قابلة للحساب
- الخصومات والعمولات شغالة

---

# Phase 5 — Articles / Editorial Workflow

## الهدف
تشغيل الموديول التحريري والمحتوى.

## يشمل
- article categories
- article tags
- article creation
- translation support
- review workflow
- moderation logs
- publishing workflow
- article SEO fields support

## الناتج النهائي
- الإدارة والمعالجون يقدروا يكتبوا
- المحتوى يمر بمراجعة
- المقالات المنشورة تظهر بشكل صحيح

---

# Phase 6 — Chat / Support / Care Chat Approval

## الهدف
تشغيل التواصل النصي داخل المنصة.

## يشمل
### Support
- conversations
- support ticket flow
- internal notes
- assignment to support agents
- support tags

### Care chat
- approval request
- approved conversation creation
- expiry / revoke logic

### Message system
- text messages
- attachments baseline
- read state
- moderation flags

## الناتج النهائي
- دعم العملاء شغال
- care chat بالموافقة شغال
- admin controls موجودة

---

# Phase 7 — Chat Moderation / Safety / Operational Controls

## الهدف
تشغيل الحوكمة والمراقبة على المحادثات.

## يشمل
- report flow
- moderation review flow
- moderation actions
- hide / suspend / revoke approval
- operational audit trail

## الناتج النهائي
- يمكن مراقبة الشات
- يمكن إيقاف المحادثات
- يمكن التعامل مع البلاغات

---

# Phase 8 — Reviews / Ratings

## الهدف
تشغيل تقييمات الجلسات والمعالجين.

## يشمل
- session-linked reviews
- moderation of text reviews
- practitioner rating summary
- public visibility rules

## الناتج النهائي
- المريض يقيم الجلسة
- التقييمات النصية تخضع للمراجعة
- متوسط تقييم المعالج محسوب

---

# Phase 9 — Training / Courses / Enrollments

## الهدف
تشغيل التدريب owner-only في V1.

## يشمل
- training instructors baseline
- course categories
- courses
- translations
- course schedules
- course sessions
- enrollments
- attendance tracking
- payment linking for enrollment
- external live room linking (Zoom)

## الناتج النهائي
- الكورسات الحية قابلة للنشر
- المستخدم يشتري وينضم
- الحضور يمكن تتبعه

---

# Phase 10 — Notifications Expansion

## الهدف
توسيع نظام الإشعارات بعد استقرار الـ core.

## يشمل
- richer template usage
- push notifications actual rollout
- notification preferences full usage
- scheduled notification jobs
- in-app feed improvements

## الناتج النهائي
- إشعارات أقوى وأكثر اكتمالًا
- email / sms / push / in-app مترابطة

---

# Phase 11 — Admin Operations Expansion

## الهدف
توسيع أدوات الإدارة والتشغيل.

## يشمل
- admin dashboards
- analytics endpoints
- operational reports
- financial admin tools
- content admin tools
- review moderation admin tools
- training admin tools

## الناتج النهائي
- الإدارة تقدر تدير النظام بالكامل من الباك اند

---

# Phase 12 — Hardening / Performance / Search / Observability

## الهدف
تحسين الأداء والاستقرار.

## يشمل
- advanced indexes
- pagination audit
- search optimization
- rate limiting
- structured logging
- monitoring / tracing baseline
- caching where needed
- raw SQL constraints where necessary

## الناتج النهائي
- النظام جاهز للنمو
- الأداء أفضل
- الرصد التشغيلي أقوى

---

# أولويات التنفيذ الفعلية
إذا كنت تعمل solo، فالترتيب الأمثل:
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 6
6. Phase 5
7. Phase 8
8. Phase 9
9. Phase 10
10. Phase 11
11. Phase 12

> قد تضع Phase 5 قبل Phase 6 لو كان المحتوى مهمًا تسويقيًا في الإطلاق.

---

# ملاحظات مهمة
- لا تبدأ Phase 2 قبل استقرار auth + practitioner onboarding
- لا تبدأ wallet قبل payment core
- لا تبدأ admin dashboards الموسعة قبل استقرار business flows
- لا تجعل performance optimization تعطل بناء الـ core
