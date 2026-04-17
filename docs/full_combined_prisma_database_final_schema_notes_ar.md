# Full Combined Prisma Database Final Schema — Notes

هذا الملف هو **النسخة المجمعة الموحدة** لكل الموديولات التي بنيناها، ويجمع في Schema واحدة:

- Identity / Auth / Roles / Profiles
- Countries / Languages / Specialties
- Sessions / Availability / Presence / Instant Booking
- Payments / Refunds / Ledger / Wallet / Settlements / Commissions / Coupons
- Articles / Content / Categories / Moderation
- Chat / Support / Chat Approval / Moderation
- Notifications / Templates / Delivery / Preferences
- Admin Settings / Policies / Config Engine
- Reviews / Ratings
- Training / Courses / Enrollments

## ملاحظات مهمة قبل التنفيذ
1. هذه نسخة **Foundation قوية جدًا** وليست وعدًا بأن كل قيد متقدم يمكن تمثيله داخل Prisma فقط.
2. توجد أشياء أنصح بإضافتها عبر **raw SQL migrations** بعد Prisma migration الأساسية، مثل:
   - منع تداخل availability slots
   - partial unique indexes
   - full-text search للمقالات
   - بعض قيود uniqueness حسب الحالات الفعالة
3. يوجد فصل واضح بين:
   - Specialties
   - Article Categories
   - Course Categories
4. الـ slug مستخدم فقط في الكيانات التي تستفيد منه:
   - public pages
   - content
   - categories
   - config catalogs
   - feature flags
   وليس في الكيانات التشغيلية الحساسة مثل ledger وpayments وmessages.

## أهم قرارات التوحيد أثناء الدمج
- توحيد User/Auth في نظام واحد
- الإبقاء على Profiles منفصلة: PatientProfile و PractitionerProfile
- تغيير اسم enum الخاص بحالة تقييم الجلسة إلى `SessionReviewStatus` لتفادي التضارب مع `ReviewStatus` الخاص بمراجعة المقالات
- تغيير اسم جدول مراجعة تقييمات الجلسات إلى `ReviewModerationEntry` لتفادي اللبس مع `ArticleReview`
- ربط `Notification`, `NotificationPreference`, `NotificationDevice` مباشرة بـ `User`
- إضافة `User` relation لبعض الجداول التي كانت تعتمد ضمنيًا على user ids فقط مثل:
  - Notification*
  - Enrollment
  - TrainingInstructor
  - ConfigChangeLog

## الخطوة التالية المقترحة
الخطوة الأقوى بعد هذا الملف هي:
1. **Migration Plan مفصل بالترتيب**
2. أو **تقسيم هذا الملف إلى ملفات Prisma domain modules** للاستخدام العملي داخل المشروع
3. أو **ERD مجمع** يوضح العلاقات بصريًا
