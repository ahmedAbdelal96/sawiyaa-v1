# Full Combined ERD Document — Mental Health Platform

## الهدف من الوثيقة
هذه الوثيقة تجمع **التصميم الكلي للعلاقات بين الجداول (ERD)** على مستوى المنصة كاملة، بعد تجميع جميع الموديولات التي تم تصميمها.

الوثيقة تهدف إلى:
- إعطاء صورة شاملة موحدة للـ database domains
- توضيح العلاقات بين الموديولات
- إظهار boundaries كل domain
- تسهيل التخطيط للتنفيذ
- تسهيل مراجعة الـ schema قبل البناء الفعلي
- تقليل احتمالات نسيان العلاقات المهمة

> هذه الوثيقة **تحليلية / معمارية** وليست بديلًا عن ملف Prisma النهائي، لكنها مرجع تنظيمي وذهني قوي جدًا.

---

# 1) النظرة العامة على الـ Domains

المنصة تنقسم إلى domains رئيسية كالتالي:

1. **Identity / Auth / Roles**
2. **Profiles / Practitioner Setup / Specialties**
3. **Sessions / Availability / Presence / Instant Booking**
4. **Payments / Ledger / Wallet / Settlements / Coupons / Commissions**
5. **Articles / Content / Categories / Review / Moderation**
6. **Chat / Support / Approval / Moderation**
7. **Notifications / Templates / Delivery / Devices**
8. **Admin Settings / Policies / Config Engine**
9. **Reviews / Ratings**
10. **Training / Courses / Enrollments**

---

# 2) ERD High-Level View

```text
User
 ├── UserEmail
 ├── UserPhone
 ├── AuthIdentity
 ├── UserRole
 ├── UserSession
 ├── OtpChallenge
 ├── TwoFactorSetting
 ├── PatientProfile
 └── PractitionerProfile
      ├── PractitionerApplication
      ├── PractitionerCredential
      ├── PractitionerSpecialty
      ├── AvailabilitySlot
      ├── AvailabilityException
      ├── PractitionerPresence
      ├── Session
      ├── LedgerEntry
      ├── PractitionerWallet
      ├── PractitionerSettlement
      ├── Coupon
      ├── SessionReview
      ├── PractitionerRatingSummary
      ├── Article
      ├── TrainingInstructor
      └── Conversation / Support / Care Chat relations
```

---

# 3) Domain 1 — Identity / Auth / Roles

## الجداول الأساسية
- User
- UserEmail
- UserPhone
- AuthIdentity
- UserRole
- UserSession
- OtpChallenge
- TwoFactorSetting

## العلاقات
```text
User 1 ─── N UserEmail
User 1 ─── N UserPhone
User 1 ─── N AuthIdentity
User 1 ─── N UserRole
User 1 ─── N UserSession
User 1 ─── N OtpChallenge
User 1 ─── 1 TwoFactorSetting (optional)
```

## الملاحظات
- هذا هو الـ **root domain** الذي تعتمد عليه المنصة كلها
- لا يوجد فصل users tables حسب النوع
- الفروق بين patient / practitioner / admin تظهر في:
  - roles
  - profiles
  - policies
  - flows

---

# 4) Domain 2 — Profiles / Specialties / Practitioner Setup

## الجداول
- PatientProfile
- PractitionerProfile
- PractitionerApplication
- PractitionerCredential
- SpecialtyCategory
- Specialty
- SpecialtyTranslation
- PractitionerSpecialty
- Country
- Language

## العلاقات
```text
User 1 ─── 0..1 PatientProfile
User 1 ─── 0..1 PractitionerProfile

PractitionerProfile 1 ─── N PractitionerApplication
PractitionerProfile 1 ─── N PractitionerCredential
PractitionerProfile N ─── M Specialty (via PractitionerSpecialty)

SpecialtyCategory 1 ─── N Specialty
Specialty 1 ─── N SpecialtyTranslation
```

## ملاحظات مهمة
- `Specialty` خاص بالمعالجين والخدمات
- هذا domain منفصل تمامًا عن:
  - ArticleCategory
  - CourseCategory

---

# 5) Domain 3 — Sessions / Availability / Presence / Instant Booking

## الجداول
- AvailabilitySlot
- AvailabilityException
- PractitionerPresence
- Session
- SessionEvent
- InstantBookingRequest

## العلاقات
```text
PractitionerProfile 1 ─── N AvailabilitySlot
PractitionerProfile 1 ─── N AvailabilityException
PractitionerProfile 1 ─── 1 PractitionerPresence

PatientProfile 1 ─── N Session
PractitionerProfile 1 ─── N Session
Session 1 ─── N SessionEvent

PatientProfile 1 ─── N InstantBookingRequest
PractitionerProfile 1 ─── N InstantBookingRequest
InstantBookingRequest 0..1 ─── 1 Session
```

## الملاحظات
- `Availability` يختلف عن `Presence`
- `Session` هي الكيان التشغيلي المركزي
- `InstantBookingRequest` ليس بديلًا عن Session، بل request flow قبل إنشاء session

---

# 6) Domain 4 — Payments / Ledger / Wallet / Settlements / Coupons / Commissions

## الجداول
- Payment
- PaymentEvent
- Refund
- LedgerEntry
- PractitionerWallet
- SettlementBatch
- PractitionerSettlement
- CommissionRule
- Coupon
- CouponRedemption

## العلاقات
```text
Session 1 ─── N Payment
Payment 1 ─── N PaymentEvent
Payment 1 ─── N Refund

PractitionerProfile 1 ─── N LedgerEntry
Payment 1 ─── N LedgerEntry
Session 1 ─── N LedgerEntry
PractitionerSettlement 1 ─── N LedgerEntry

PractitionerProfile 1 ─── N PractitionerWallet
SettlementBatch 1 ─── N PractitionerSettlement
PractitionerProfile 1 ─── N PractitionerSettlement
PractitionerWallet 1 ─── N PractitionerSettlement

CommissionRule 1 ─── N Payment (snapshot/reference)

Coupon 1 ─── N CouponRedemption
Session 0..1 ─── N CouponRedemption
Payment 0..1 ─── N CouponRedemption
PatientProfile 1 ─── N CouponRedemption
PractitionerProfile 1 ─── N CouponRedemption
```

## المبادئ المهمة
- `LedgerEntry` = **source of truth**
- `PractitionerWallet` = طبقة عرض/تجميع
- `Settlement` = تحويل شهري فعلي
- `Coupon` و `CommissionRule` domains منطقية مستقلة لكنها مرتبطة ماليًا

---

# 7) Domain 5 — Articles / Content / Categories / Review / Moderation

## الجداول
- ArticleCategory
- ArticleCategoryTranslation
- Article
- ArticleTranslation
- ArticleCategoryAssignment
- ArticleReview
- ArticleModerationLog
- ArticleTag
- ArticleTagTranslation
- ArticleTagAssignment

## العلاقات
```text
ArticleCategory 1 ─── N ArticleCategoryTranslation
ArticleCategory 1 ─── N Article (primaryCategory)
Article N ─── M ArticleCategory (via ArticleCategoryAssignment)

Article 1 ─── N ArticleTranslation
Article 1 ─── N ArticleReview
Article 1 ─── N ArticleModerationLog

ArticleTag 1 ─── N ArticleTagTranslation
Article N ─── M ArticleTag (via ArticleTagAssignment)

User 1 ─── N Article (authorUserId)
PractitionerProfile 1 ─── N Article (authorPractitionerId optional)
```

## الملاحظات المهمة جدًا
- `ArticleCategory` منفصلة تمامًا عن `Specialty`
- `ArticleCategory` منفصلة تمامًا عن `CourseCategory`
- `ArticleReview` هنا خاصة بـ **مراجعة المحتوى** وليس التقييمات العلاجية

---

# 8) Domain 6 — Chat / Support / Care Chat Approval / Moderation

## الجداول
- Conversation
- ConversationParticipant
- Message
- MessageAttachment
- SupportTicket
- SupportTicketTag
- SupportTicketTagAssignment
- InternalConversationNote
- ChatApprovalRequest
- ChatModerationReport
- ChatModerationAction

## العلاقات
```text
Conversation 1 ─── N ConversationParticipant
Conversation 1 ─── N Message
Message 1 ─── N MessageAttachment

Conversation 0..1 ─── 1 SupportTicket
SupportTicket N ─── M SupportTicketTag (via SupportTicketTagAssignment)

Conversation 0..1 ─── 1 ChatApprovalRequest
ChatApprovalRequest 0..1 ─── 1 linked Conversation
Session 0..1 ─── N ChatApprovalRequest

Conversation 1 ─── N InternalConversationNote
Conversation 1 ─── N ChatModerationReport
Message 0..1 ─── N ChatModerationReport
ChatModerationReport 1 ─── N ChatModerationAction
```

## الفصل المهم
يوجد نوعان رئيسيان:
- **Support Conversations**
- **Care Conversations (approved only)**

---

# 9) Domain 7 — Notifications / Templates / Delivery / Devices

## الجداول
- NotificationType
- NotificationTemplate
- NotificationTemplateTranslation
- NotificationPreference
- Notification
- NotificationDeliveryAttempt
- NotificationDevice
- InAppNotificationFeedState

## العلاقات
```text
NotificationType 1 ─── N NotificationTemplate
NotificationTemplate 1 ─── N NotificationTemplateTranslation

User 1 ─── N NotificationPreference
User 1 ─── N Notification
NotificationType 1 ─── N Notification
NotificationTemplate 0..1 ─── N Notification

Notification 1 ─── N NotificationDeliveryAttempt
User 1 ─── N NotificationDevice
Notification 0..1 ─── 1 InAppNotificationFeedState
```

## الملاحظات
- القوالب منفصلة عن notifications الفعلية
- attempts منفصلة عن notification instance
- devices منفصلة عن channels runtime

---

# 10) Domain 8 — Admin Settings / Policies / Config Engine

## الجداول
- ConfigKeyCatalog
- ConfigValue
- ConfigChangeLog
- BrandThemeConfig
- FeatureFlag

## العلاقات
```text
ConfigKeyCatalog 1 ─── N ConfigValue
ConfigKeyCatalog 1 ─── N ConfigChangeLog
ConfigValue 1 ─── N ConfigChangeLog
User 0..1 ─── N ConfigChangeLog (changedByUserId)
```

## الملاحظات
- هذا domain لا ينتمي لمستخدم واحد بعينه
- هو المصدر المركزي للقيم والسياسات المتغيرة
- يستخدمه runtime resolver في كل المنصة

---

# 11) Domain 9 — Reviews / Ratings

## الجداول
- SessionReview
- ReviewModeration
- PractitionerRatingSummary

## العلاقات
```text
Session 1 ─── 0..1 SessionReview
PatientProfile 1 ─── N SessionReview
PractitionerProfile 1 ─── N SessionReview
SessionReview 1 ─── N ReviewModeration
PractitionerProfile 1 ─── 1 PractitionerRatingSummary
```

## الملاحظات
- `SessionReview` = تقييم علاج/جلسة فعلية
- `ReviewModeration` = مراجعة التقييم النصي
- `PractitionerRatingSummary` = derived summary

> لا تخلط هذا مع `ArticleReview`

---

# 12) Domain 10 — Training / Courses / Enrollments

## الجداول
- TrainingInstructor
- CourseCategory
- CourseCategoryTranslation
- Course
- CourseTranslation
- CourseSchedule
- CourseSession
- Enrollment
- EnrollmentAttendance
- CourseApproval

## العلاقات
```text
TrainingInstructor 1 ─── N Course
CourseCategory 1 ─── N CourseCategoryTranslation
CourseCategory 1 ─── N Course

Course 1 ─── N CourseTranslation
Course 1 ─── N CourseSchedule
Course 1 ─── N CourseApproval

CourseSchedule 1 ─── N CourseSession
CourseSchedule 1 ─── N Enrollment
Course 1 ─── N Enrollment

Enrollment 1 ─── N EnrollmentAttendance
CourseSession 1 ─── N EnrollmentAttendance
Payment 0..1 ─── N Enrollment
```

## الفصل المهم
- `CourseCategory` منفصلة عن `Specialty`
- `CourseCategory` منفصلة عن `ArticleCategory`

---

# 13) Cross-Domain Relationship Map

## User-Centered Map
```text
User
 ├── PatientProfile
 │    ├── Session
 │    │    ├── Payment
 │    │    ├── SessionReview
 │    │    ├── ChatApprovalRequest
 │    │    └── Conversation (indirect)
 │    ├── CouponRedemption
 │    └── Notifications
 │
 └── PractitionerProfile
      ├── Specialties
      ├── Availability
      ├── Presence
      ├── Sessions
      ├── Ledger / Wallet / Settlements
      ├── Coupons
      ├── Articles
      ├── RatingSummary
      ├── Conversations / Support
      └── TrainingInstructor (optional relation)
```

---

# 14) Categories Separation Map

```text
Specialty
  -> For practitioners and services only

ArticleCategory
  -> For articles/content only

CourseCategory
  -> For training/courses only
```

## هذه واحدة من أهم قواعد المشروع
أي خلط هنا سيسبب مشاكل في:
- SEO
- الإدارة
- البحث
- الفلاتر
- الـ analytics
- الـ URLs

---

# 15) Financial ERD Summary

```text
Session
 └── Payment
      ├── PaymentEvent
      ├── Refund
      ├── CouponRedemption
      └── LedgerEntry

PractitionerProfile
 ├── LedgerEntry
 ├── PractitionerWallet
 └── PractitionerSettlement
      └── SettlementBatch

CommissionRule
 └── Payment (resolved/snapshotted)

Coupon
 └── CouponRedemption
```

## المبدأ المالي النهائي
- `LedgerEntry` هو المصدر الحقيقي
- `Wallet` مجمّع
- `Settlement` مخرجات شهرية
- `Payment` و `Refund` طبقة بوابات التحصيل
- `Coupon` و `Commission` يؤثران في ledger logic

---

# 16) Moderation ERD Summary

```text
Article
 ├── ArticleReview
 └── ArticleModerationLog

SessionReview
 └── ReviewModeration

Conversation
 ├── ChatModerationReport
 └── ChatModerationAction

Message
 └── ChatModerationReport
```

## الاستنتاج
المشروع يحتوي **ثلاثة domains moderation مختلفة**:
1. Content moderation
2. Review moderation
3. Chat moderation

ويجب عدم دمجهم في جدول واحد عام.

---

# 17) Notifications Integration Map

```text
Session events
Payment events
Support replies
Chat approvals
Article approvals
Course enrollments
Security events
   ↓
NotificationType / Template / Notification / DeliveryAttempt
```

## المبدأ
الإشعارات layer أفقية cross-cutting
وليست domain مستقلة عن بقية النظام.

---

# 18) Config Engine Integration Map

```text
ConfigKeyCatalog
 ├── Booking policies
 ├── Session policies
 ├── Cancellation rules
 ├── Coupon limits
 ├── Notification defaults
 ├── Payment enabled providers
 ├── Branding tokens
 └── Feature flags
```

## المبدأ
أي business rule متغيرة قدر الإمكان يجب أن تأتي من:
- ConfigValue
- أو FeatureFlag
- أو Rule table متخصص مثل CommissionRule

---

# 19) Recommended Read Order of the ERD

لو ستراجع المشروع بسرعة، راجع بهذا الترتيب:

1. Identity / User / Roles
2. Profiles / Specialties
3. Sessions / Availability / Presence
4. Payments / Ledger / Wallet
5. Notifications
6. Settings / Policies
7. Chat / Support
8. Articles / Content
9. Reviews
10. Training

---

# 20) Source of Truth vs Derived Tables

## Source of Truth
- User
- PractitionerProfile
- Session
- Payment
- LedgerEntry
- SessionReview
- Article
- Message
- Enrollment
- ConfigValue

## Derived / Convenience / Performance
- PractitionerWallet
- PractitionerRatingSummary
- InAppNotificationFeedState
- BrandThemeConfig (partially convenience)
- بعض snapshots داخل Payment / Notification

---

# 21) أهم التحذيرات المعمارية

## 1) لا تخلط أنواع الـ categories
- Specialty ≠ ArticleCategory ≠ CourseCategory

## 2) لا تجعل Wallet مصدر الحقيقة
- LedgerEntry هو المصدر

## 3) لا تجعل Summary tables مصدر الحقيقة
- سواء rating summary أو wallets

## 4) لا تربط الرسائل مباشرة بالـ support فقط
- conversation/message model يجب أن يبقى عامًا

## 5) لا تجعل Config Engine مجرد key-value بدون catalog
- وإلا ستدخل في chaos

## 6) لا تجعل review بلا session
- review يجب أن تكون session-linked

## 7) لا تجعل course enrollment = session booking
- domain مختلف

---

# 22) Suggested Combined ERD Layers

## Layer A — Identity Layer
- User
- Auth
- Roles
- Contacts
- Sessions auth

## Layer B — Profile Layer
- Patient
- Practitioner
- Specialties
- Verification

## Layer C — Service Delivery Layer
- Availability
- Presence
- Session
- Instant booking

## Layer D — Financial Layer
- Payment
- Refund
- Ledger
- Wallet
- Settlement
- Coupon
- Commission

## Layer E — Communication Layer
- Conversations
- Support
- Approval
- Moderation
- Notifications

## Layer F — Content Layer
- Articles
- Tags
- Categories
- Moderation

## Layer G — Reputation Layer
- Reviews
- Rating summary

## Layer H — Training Layer
- Courses
- Schedules
- Sessions
- Enrollments
- Attendance

## Layer I — Control Layer
- Config
- Policies
- Branding
- Feature flags

---

# 23) Final Combined ERD Narrative

يمكن وصف المنصة معماريًا كالتالي:

- **User system موحد** يخدم كل الأطراف
- فوقه **profiles متخصصة** للمرضى والمعالجين
- المعالجون يمتلكون:
  - specialties
  - schedules
  - presence
  - sessions
  - ratings
  - earnings
  - coupons
  - محتوى
- المرضى يمتلكون:
  - bookings
  - payments
  - reviews
  - enrollments
  - support interactions
- **Session** هي مركز domain العلاجي
- **Payment + Ledger** هي مركز domain المالي
- **Conversation** هي مركز domain التفاعل النصي
- **Article** هي مركز domain المحتوى
- **CourseSchedule + Enrollment** هما مركز domain التدريب
- **Config Engine** هو مركز domain السياسات المتغيرة
- **Notification system** يربط كل هذه domains أفقيًا

---

# 24) What This ERD Enables

هذا التصميم يمكنه دعم:
- منصة علاجية متعددة التخصصات
- Web + mobile later
- scheduled + instant sessions
- local + international payments
- internal wallet + monthly settlements
- content publishing with moderation
- monitored support and care chat
- multilingual system
- live training/cohorts
- scalable configuration management

---

# 25) الخطوة التالية المقترحة
بعد هذه الوثيقة، أقوى خطوتين عمليًا هما:

1. **Seed Strategy مفصلة بالقيم الأولية**
2. **Phase 1 Implementation Plan (NestJS Modules + Prisma Migrations + API order)**
