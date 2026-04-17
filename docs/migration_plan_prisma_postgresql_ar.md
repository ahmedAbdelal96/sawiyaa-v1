# Migration Plan — Prisma / PostgreSQL

## الهدف
هذا الملف يحدد **الترتيب الصحيح لتنفيذ الـ migrations** الخاصة بقاعدة البيانات، بناءً على:
- الاعتماديات بين الجداول
- ترابط الموديولات
- تقليل التعقيد أثناء التطوير
- تقليل مخاطر كسر العلاقات أو إعادة بناء الـ schema لاحقًا

هذا ليس مجرد ترتيب جداول، بل **خطة تنفيذ عملية**.

---

# المبادئ الأساسية قبل البدء

## 1) لا تبنِ كل شيء في migration واحدة
القاعدة الصحيحة:
- كل مرحلة منطقية = migration أو مجموعة migrations صغيرة
- لا تجمع عشرات الجداول في migration واحدة ضخمة

## 2) ابدأ بالـ Core Domain
ابدأ بما تعتمد عليه بقية المنصة:
- users
- auth
- profiles
- reference tables

## 3) ابدأ بالـ source of truth قبل الـ derived tables
مثال:
- `SessionReview` قبل `PractitionerRatingSummary`
- `LedgerEntry` قبل `PractitionerWallet`

## 4) الجداول التشغيلية قبل جداول التحسين
مثال:
- Notifications قبل feed state
- Reviews قبل summary
- Ledger قبل wallet snapshots

## 5) المراحل الكبيرة تنقسم داخليًا
كل Phase قد تحتوي:
- migration schema
- migration indexes
- migration backfill/seed
- migration constraints لاحقة

---

# الترتيب المقترح النهائي

# Phase 0 — Foundation / Extensions / Conventions

## Migration 000_base_extensions_and_conventions
الهدف:
- تفعيل أي extensions مطلوبة في PostgreSQL إن احتجتها
- تثبيت conventions العامة
- التأكد من استخدام UUID strategy
- تجهيز timezone convention

### يشمل
- PostgreSQL extensions عند الحاجة
- ملاحظات تشغيلية فقط
- لا جداول domain كبيرة هنا

### ملاحظات
- لو كنت تستخدم `uuid()` من Prisma فقط، قد لا تحتاج extension معينة
- لو ستستخدم full text search لاحقًا أو citext أو trigram فهذه المرحلة مناسبة لها

---

# Phase 1 — Identity / Auth / Roles / Core User Access

## Migration 001_identity_core
### الجداول
- User
- UserEmail
- UserPhone
- AuthIdentity
- UserRole
- UserSession

## Migration 002_auth_security_and_otp
### الجداول
- OtpChallenge
- TwoFactorSetting

### السبب
هذه هي الطبقة التي تعتمد عليها:
- patient
- practitioner
- admin
- notifications
- moderation
- support
- settings logs

---

# Phase 2 — Reference Data / Locales / Geography / Classification

## Migration 003_reference_data_core
### الجداول
- Country
- Language

## Migration 004_specialties_and_professional_classification
### الجداول
- SpecialtyCategory
- Specialty
- SpecialtyTranslation
- PractitionerSpecialty

### السبب
التخصصات مطلوبة قبل:
- practitioner profiles الكاملة
- البحث
- commission rules المتقدمة
- المحتوى وربط الخبرة

---

# Phase 3 — Profiles / Onboarding / Practitioner Setup

## Migration 005_patient_and_practitioner_profiles
### الجداول
- PatientProfile
- PractitionerProfile

## Migration 006_practitioner_onboarding
### الجداول
- PractitionerApplication
- PractitionerCredential

## Migration 007_staff_optional_profiles_or_permissions_support
### حسب الملف النهائي
أي جداول داعمة للإدارة إن وجدت

### السبب
هذه المرحلة تقفل:
- من هم المستخدمون فعليًا
- من هو المعالج
- من هو العميل
- onboarding
- verification

---

# Phase 4 — Availability / Presence / Session Core

## Migration 008_availability_and_presence
### الجداول
- AvailabilitySlot
- AvailabilityException
- PractitionerPresence

## Migration 009_sessions_core
### الجداول
- Session
- SessionEvent
- InstantBookingRequest

### السبب
هذه المرحلة تقفل:
- الجدول
- المواعيد
- الحجز العادي
- الحجز الفوري
- دورة حياة الجلسة

### ملاحظات
- هنا لا ندخل payment logic بعد
- فقط session lifecycle

---

# Phase 5 — Payments / Financial Core

## Migration 010_payments_core
### الجداول
- Payment
- PaymentEvent
- Refund

## Migration 011_financial_rules
### الجداول
- CommissionRule
- Coupon
- CouponRedemption

## Migration 012_ledger_wallet_settlement
### الجداول
- LedgerEntry
- PractitionerWallet
- SettlementBatch
- PractitionerSettlement

### السبب
هذا الترتيب مهم جدًا:
1. Payments أولًا
2. business financial rules بعده
3. ledger/wallet/settlements بعد ذلك

### ملاحظات
- `LedgerEntry` هو مصدر الحقيقة
- `PractitionerWallet` طبقة performance/convenience
- لا تعكس هذا الترتيب

---

# Phase 6 — Content / Articles / Editorial Workflow

## Migration 013_article_categories_and_tags
### الجداول
- ArticleCategory
- ArticleCategoryTranslation
- ArticleTag
- ArticleTagTranslation

## Migration 014_articles_core
### الجداول
- Article
- ArticleTranslation
- ArticleCategoryAssignment
- ArticleTagAssignment

## Migration 015_article_moderation
### الجداول
- ArticleReview
- ArticleModerationLog

### السبب
افصل taxonomy عن المقالات عن الـ moderation
لكي يكون التطوير أوضح وأسهل

---

# Phase 7 — Chat / Support / Care Chat Approval / Moderation

## Migration 016_conversations_and_messages
### الجداول
- Conversation
- ConversationParticipant
- Message
- MessageAttachment

## Migration 017_support_layer
### الجداول
- SupportTicket
- SupportTicketTag
- SupportTicketTagAssignment
- InternalConversationNote

## Migration 018_chat_approval_and_moderation
### الجداول
- ChatApprovalRequest
- ChatModerationReport
- ChatModerationAction

### السبب
ابدأ بالمحادثة نفسها، ثم التشغيل، ثم الحوكمة/الموافقة

---

# Phase 8 — Notifications / Delivery / Preferences

## Migration 019_notification_catalog_and_templates
### الجداول
- NotificationType
- NotificationTemplate
- NotificationTemplateTranslation

## Migration 020_notification_runtime
### الجداول
- NotificationPreference
- Notification
- NotificationDeliveryAttempt
- NotificationDevice
- InAppNotificationFeedState

### السبب
ابدأ بالقوالب والأنواع أولًا ثم runtime data

---

# Phase 9 — Settings / Policies / Config Engine

## Migration 021_config_catalog_and_values
### الجداول
- ConfigKeyCatalog
- ConfigValue

## Migration 022_config_audit_and_flags
### الجداول
- ConfigChangeLog
- BrandThemeConfig
- FeatureFlag

### السبب
بعض keys قد تحتاجها بقية الموديولات أثناء التشغيل،  
لكن schema نفسها لا تعتمد عليها بشكل صارم، لذلك تأتي بعد core modules.

> عمليًا: يمكنك تقديم هذا phase أبكر إذا أردت إدارة القواعد من DB من أول يوم.

---

# Phase 10 — Reviews / Ratings

## Migration 023_reviews_and_moderation
### الجداول
- SessionReview
- ReviewModeration

## Migration 024_rating_summary
### الجداول
- PractitionerRatingSummary

### السبب
summary تأتي بعد source table

---

# Phase 11 — Training / Courses / Enrollments

## Migration 025_training_catalog
### الجداول
- TrainingInstructor
- CourseCategory
- CourseCategoryTranslation

## Migration 026_courses_and_translations
### الجداول
- Course
- CourseTranslation
- CourseApproval

## Migration 027_course_schedules_and_enrollments
### الجداول
- CourseSchedule
- CourseSession
- Enrollment
- EnrollmentAttendance

### السبب
ابدأ بالمدرب والتصنيف، ثم الكورس، ثم التشغيل والاشتراك

---

# Phase 12 — Performance / Extra Indexes / Search / Constraints

## Migration 028_extra_indexes_and_query_optimization
### يشمل
- indexes إضافية بعد مراقبة الاستخدام
- partial indexes إذا احتجتها عبر raw SQL
- composite indexes محسنة

## Migration 029_search_and_text_extensions
### يشمل
- full text search
- trigram indexes
- أي تحسينات خاصة بالمقالات أو البحث عن المعالجين

## Migration 030_advanced_constraints_and_data_integrity
### يشمل
- constraints إضافية عبر raw SQL
- exclusion constraints لبعض التداخلات الزمنية
- uniqueness business rules المعقدة

### أمثلة
- منع تداخل availability slots بشكل أذكى
- منع overlapping active config values لنفس key/scope
- قيود data integrity المعقدة التي يصعب تمثيلها في Prisma فقط

---

# Phase 13 — Seed / Initial Catalog / Defaults

## Seed 001_core_roles_and_admin
### يشمل
- roles الأساسية
- admin أولي
- support roles

## Seed 002_reference_data
### يشمل
- countries
- languages
- specialties الأساسية

## Seed 003_notification_types_and_templates
### يشمل
- notification catalog
- templates الأساسية

## Seed 004_config_catalog_defaults
### يشمل
- config keys
- default policies
- feature flags الأساسية
- branding defaults

## Seed 005_support_tags_and_content_categories
### يشمل
- support tags
- article categories الأساسية
- training categories الأساسية

---

# الترتيب العملي الأنسب أثناء التطوير الفعلي

لو هتشتغل solo ومحتاج أسرع مسار مع أقل مخاطرة، فالترتيب العملي يكون:

## Sprint 1
- Phase 1
- Phase 2
- Phase 3

## Sprint 2
- Phase 4
- جزء من Phase 5 (Payments core فقط)

## Sprint 3
- استكمال Phase 5
- Phase 8
- Phase 9

## Sprint 4
- Phase 7
- Phase 10

## Sprint 5
- Phase 6
- Phase 11

## Sprint 6
- Phase 12
- تحسينات الأداء
- backfills
- cleanup

---

# أهم نقاط الحذر

## 1) لا تؤخر User/Auth
أي تأخير في Phase 1 سيكسر بقية الخطة.

## 2) لا تبنِ Wallet قبل Ledger
ده من أكبر الأخطاء الشائعة.

## 3) لا تبنِ Rating Summary قبل Reviews
summary ليست مصدر الحقيقة.

## 4) لا تخلط ArticleCategory مع Specialty أو CourseCategory
هذه domains مختلفة.

## 5) لا تضع Config Engine متأخرًا جدًا لو أنت ستستخدمه مبكرًا
يمكنك عمليًا تنفيذ Phase 9 مباشرة بعد Phase 3 لو احتجت.

## 6) لا تبنِ search optimization من أول يوم
ابنِ core schema أولًا، ثم حسّن بعد قياس فعلي.

---

# ماذا تنفذ أولًا فعلًا؟
لو هدفك البدء العملي السريع على المنتج:

## الترتيب المقترح الآن
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 8
7. Phase 9

هذا يكفي لتشغيل:
- users
- practitioners
- specialties
- sessions
- instant booking
- payments
- notifications
- policies

وده core المنصة الحقيقي.

---

# ملف تسمية migrations المقترح
استخدم naming واضح مثل:

- `001_identity_core`
- `002_auth_security_and_otp`
- `003_reference_data_core`
- `004_specialties_and_professional_classification`
- `005_patient_and_practitioner_profiles`
- `006_practitioner_onboarding`
- `008_availability_and_presence`
- `009_sessions_core`
- `010_payments_core`
- `011_financial_rules`
- `012_ledger_wallet_settlement`
- `013_article_categories_and_tags`
- `014_articles_core`
- `015_article_moderation`
- `016_conversations_and_messages`
- `017_support_layer`
- `018_chat_approval_and_moderation`
- `019_notification_catalog_and_templates`
- `020_notification_runtime`
- `021_config_catalog_and_values`
- `022_config_audit_and_flags`
- `023_reviews_and_moderation`
- `024_rating_summary`
- `025_training_catalog`
- `026_courses_and_translations`
- `027_course_schedules_and_enrollments`
- `028_extra_indexes_and_query_optimization`
- `029_search_and_text_extensions`
- `030_advanced_constraints_and_data_integrity`

---

# القرار النهائي
هذا هو الترتيب الصحيح والمنطقي للمشروع:
- من الـ core identity
- إلى التشغيل
- إلى المال
- إلى المحتوى
- إلى الدعم
- إلى الإشعارات
- إلى السياسات
- إلى التقييمات
- إلى التدريب
- ثم التحسينات المتقدمة

---

# الخطوة التالية المقترحة
بعد هذا الملف، أقوى خطوتين محتملتين:

1. **Full Combined ERD Document**
2. **Seed Strategy مفصلة جدًا بالقيم الأولية المقترحة**
