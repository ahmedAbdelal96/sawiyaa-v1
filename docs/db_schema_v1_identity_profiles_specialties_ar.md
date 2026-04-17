# DB Schema v1 — Identity/Auth + Profiles/Specialties

## 1) الهدف من هذه النسخة
هذه النسخة من قاعدة البيانات تغطي أول موديولين أساسيين في المنصة:

1. **Identity / Auth**
   - المستخدمين
   - الإيميلات والموبايلات
   - طرق تسجيل الدخول
   - الجلسات
   - OTP
   - إعدادات 2FA
   - الأدوار

2. **Profiles / Specialties**
   - بروفايل العميل / المريض
   - بروفايل المعالج
   - طلبات انضمام المعالجين
   - مستندات المعالجين
   - التخصصات الديناميكية
   - تصنيفات التخصصات
   - ربط المعالجين بالتخصصات

> هذه النسخة **لا تشمل** بعد: الجدول والمواعيد، الجلسات، الحجز الفوري، الدفع، المحفظة، المقالات، الشات، الكورسات.

---

## 2) القرارات المعمارية المقفولة في هذه النسخة

### قرار 1: User Core موحد
لا يوجد 3 جداول منفصلة لـ client / practitioner / admin.

بدلًا من ذلك:
- **جدول users موحد**
- **نظام auth موحد**
- **profiles منفصلة حسب نوع المستخدم**
- **flows مختلفة حسب الـ portal**

### قرار 2: المعالج والعميل والإدارة يشتركون في نفس engine
لكن تختلف:
- طريقة التسجيل
- طريقة الدخول
- مستويات الأمان
- البروفايل
- الصلاحيات

### قرار 3: التخصصات ديناميكية
لا نعتمد على enum ثابت للتخصصات.

الإدارة يمكنها لاحقًا:
- إنشاء تخصص جديد
- إيقاف تخصص
- ترجمة الاسم والوصف
- ربط المعالجين به

### قرار 4: دعم اللغتين من أول يوم
التخصصات والتصنيفات الديناميكية يجب أن تدعم:
- العربية
- الإنجليزية

### قرار 5: الـ Admin في هذه المرحلة ليس له public registration
أول Super Admin يفضل إنشاؤه عبر seed / manual creation.

---

## 3) لماذا هذا التصميم صحيح للمنصة؟
هذا التصميم مناسب لأن المنصة عندها 3 احتياجات أساسية:

1. **سهولة دخول العميل**
   - Google login
   - تجربة خفيفة وسريعة

2. **أمان أعلى للمعالج**
   - Email + Password
   - OTP كخطوة ثانية
   - اعتماد ومراجعة قبل التفعيل

3. **مرونة مستقبلية**
   - إضافة أدوار داخلية مثل support أو content reviewer
   - إضافة تخصصات جديدة مثل التغذية والتخسيس
   - إمكانية أن يكون لنفس user أكثر من role لاحقًا

---

## 4) نطاق الموديولات في هذه النسخة

### 4.1 Identity / Auth Module
يشمل الجداول التالية:
- `users`
- `user_emails`
- `user_phones`
- `auth_identities`
- `user_roles`
- `user_sessions`
- `otp_challenges`
- `two_factor_settings`

### 4.2 Profiles Module
يشمل:
- `patient_profiles`
- `practitioner_profiles`
- `practitioner_applications`
- `practitioner_credentials`

### 4.3 Specialties Module
يشمل:
- `specialty_categories`
- `specialty_category_translations`
- `specialties`
- `specialty_translations`
- `practitioner_specialties`

---

## 5) العلاقات العامة بين الجداول

### User Core
- User واحد يمكن أن يملك أكثر من Email
- User واحد يمكن أن يملك أكثر من Phone
- User واحد يمكن أن يملك أكثر من Auth Identity
- User واحد يمكن أن يملك أكثر من Role
- User واحد يمكن أن يملك أكثر من Session
- User واحد يمكن أن يملك أكثر من OTP Challenge
- User واحد يمكن أن يملك إعداد Two Factor واحد
- User واحد يمكن أن يكون له Patient Profile واحد
- User واحد يمكن أن يكون له Practitioner Profile واحد

### Practitioner Area
- Practitioner Profile واحد يمكن أن يملك أكثر من Application
- Practitioner Profile واحد يمكن أن يملك أكثر من Credential
- Practitioner Profile واحد يمكن أن يرتبط بأكثر من Specialty

### Specialties Area
- Specialty Category واحدة تحتوي أكثر من Specialty
- كل Category لها ترجمات متعددة
- كل Specialty لها ترجمات متعددة

---

## 6) الجداول بالتفصيل

## 6.1 جدول `users`
الهوية الأساسية لأي شخص داخل النظام.

### الغرض
يمثل أي مستخدم في المنصة مهما كان نوعه:
- عميل
- معالج
- أدمن
- دعم
- مراجع محتوى

### أعمدة مقترحة
- `id` UUID — المفتاح الأساسي
- `display_name` الاسم الظاهر
- `status` حالة الحساب
- `default_locale` اللغة الافتراضية
- `timezone` المنطقة الزمنية
- `created_at`
- `updated_at`

### ملاحظات
- لا نضع هنا بيانات المريض أو المعالج التفصيلية
- هذا الجدول هو أصل الهوية فقط

---

## 6.2 جدول `user_emails`
لتخزين الإيميلات وربطها بالمستخدم.

### أعمدة مقترحة
- `id`
- `user_id`
- `email`
- `normalized_email` نسخة lowercase/normalized للبحث والـ unique
- `is_primary`
- `is_verified`
- `verified_at`
- `created_at`
- `updated_at`

### ملاحظات مهمة
- يفضل أن يكون الإيميل الفعلي للبحث والـ login هو `normalized_email`
- يمكن للمستخدم أن يمتلك أكثر من email نظريًا
- أوليًا يمكن فرض primary واحد بالـ service layer أو بـ raw SQL migration لاحقًا

---

## 6.3 جدول `user_phones`
لتخزين أرقام الموبايل المرتبطة بالمستخدم.

### أعمدة مقترحة
- `id`
- `user_id`
- `phone`
- `e164`
- `is_primary`
- `is_verified`
- `verified_at`
- `created_at`
- `updated_at`

### ملاحظات
- يجب تخزين الرقم بصيغة E.164
- يستخدم في OTP للمعالج لاحقًا

---

## 6.4 جدول `auth_identities`
هذا الجدول هو قلب التنوع في طرق تسجيل الدخول.

### الغرض
كل طريقة دخول ترتبط بالمستخدم من خلال سطر مستقل.

### أمثلة
- Email/Password
- Google
- مستقبلًا Apple

### أعمدة مقترحة
- `id`
- `user_id`
- `provider`
- `provider_subject`
- `provider_email`
- `password_hash`
- `is_enabled`
- `last_used_at`
- `created_at`
- `updated_at`

### ملاحظات مهمة
- لو الـ provider = `PASSWORD` يكون `password_hash` مستخدمًا
- لو الـ provider = `GOOGLE` يكون `provider_subject` هو الـ sub القادم من Google
- يفضل unique على `(provider, provider_subject)`
- يفضل أيضًا unique على `(user_id, provider)`

---

## 6.5 جدول `user_roles`
الأدوار الفعلية للمستخدم.

### الغرض
يسمح للمستخدم بأن يملك role واحد أو أكثر.

### أدوار مقترحة الآن
- `PATIENT`
- `PRACTITIONER`
- `ADMIN`
- `SUPPORT`
- `CONTENT_REVIEWER`
- `SUPER_ADMIN`

### أعمدة مقترحة
- `user_id`
- `role`
- `assigned_at`

### ملاحظات
- يفضل أن يكون المفتاح المركب هو `(user_id, role)`
- هذا يكفي حاليًا دون جدول permissions منفصل في هذه المرحلة

---

## 6.6 جدول `user_sessions`
جلسات تسجيل الدخول الخاصة بالمستخدم.

### الغرض
- Refresh tokens
- تتبع الأجهزة
- تسجيل الخروج من جهاز معين
- revoke sessions

### أعمدة مقترحة
- `id`
- `user_id`
- `refresh_token_hash`
- `ip_address`
- `user_agent`
- `device_name`
- `last_activity_at`
- `expires_at`
- `revoked_at`
- `created_at`

### ملاحظات
- لا تخزن refresh token الخام
- خزن hash فقط

---

## 6.7 جدول `otp_challenges`
إدارة أكواد التحقق.

### الاستخدامات
- OTP للمعالج عند login
- verify email
- verify phone
- reset password

### أعمدة مقترحة
- `id`
- `user_id`
- `purpose`
- `channel`
- `target`
- `code_hash`
- `attempts_count`
- `max_attempts`
- `expires_at`
- `consumed_at`
- `created_at`

### ملاحظات
- لا يتم حفظ الكود نفسه بصيغته الخام
- الهدف `target` مهم لتتبع القناة المرسل إليها الكود

---

## 6.8 جدول `two_factor_settings`
إعدادات المصادقة الثنائية للمستخدم.

### الغرض
يحدد هل الـ 2FA مفعلة أو مطلوبة أو اختيارية.

### أعمدة مقترحة
- `user_id`
- `mode`
- `preferred_channel`
- `fallback_channel`
- `otp_ttl_seconds`
- `enabled_at`
- `updated_at`

### ملاحظات
- للمعالج: تكون Required
- للعميل: غالبًا Off أو Optional في V1
- للإدارة: Required

---

## 6.9 جدول `patient_profiles`
بيانات العميل / المريض.

### أعمدة مقترحة
- `user_id`
- `first_name`
- `last_name`
- `date_of_birth`
- `gender`
- `country_code`
- `city`
- `avatar_url`
- `marketing_consent`
- `onboarding_completed_at`
- `created_at`
- `updated_at`

### ملاحظات
- هذا الجدول يبقى خفيفًا في البداية
- لا نضع فيه التاريخ العلاجي أو البيانات الحساسة الآن
- البيانات الطبية التفصيلية يمكن تأجيلها إلى Module لاحق

---

## 6.10 جدول `practitioner_profiles`
الملف العام للمعالج.

### الغرض
يمثل المعلومات العامة التي يحتاجها النظام والإدارة والواجهة العامة لاحقًا.

### أعمدة مقترحة
- `user_id`
- `public_slug`
- `headline`
- `bio`
- `years_of_experience`
- `country_code`
- `city`
- `approval_status`
- `is_listed`
- `accepting_new_clients`
- `created_at`
- `updated_at`

### ملاحظات
- `approval_status` مهم جدًا لعزل مراحل المعالج:
  - Draft
  - Submitted
  - Under Review
  - Approved
  - Rejected
  - Suspended
- `is_listed` يحدد هل يظهر للجمهور أم لا

---

## 6.11 جدول `practitioner_applications`
يحفظ دورة تقديم المعالج ومراجعتها.

### لماذا نحتاجه إذا كان عندنا `approval_status`؟
لأننا نريد history لعمليات التقديم والمراجعة، وليس مجرد status نهائي واحد.

### أعمدة مقترحة
- `id`
- `practitioner_id`
- `status`
- `submitted_at`
- `reviewed_at`
- `reviewer_user_id`
- `review_notes`
- `created_at`
- `updated_at`

### ملاحظات
- يسمح بتتبع إعادة التقديم لاحقًا
- يسهل على الإدارة مراجعة تاريخ الاعتماد

---

## 6.12 جدول `practitioner_credentials`
المستندات والشهادات الخاصة بالمعالج.

### أمثلة
- شهادة جامعية
- ترخيص مزاولة
- بطاقة هوية
- شهادة تخصص

### أعمدة مقترحة
- `id`
- `practitioner_id`
- `type`
- `title`
- `issuer`
- `license_number`
- `country_code`
- `file_url`
- `status`
- `expires_at`
- `reviewed_at`
- `reviewer_user_id`
- `review_notes`
- `created_at`
- `updated_at`

### ملاحظات
- لا نربط الآن بملف asset manager مستقل في هذه النسخة
- لاحقًا يمكن استبدال `file_url` بـ `file_asset_id`

---

## 6.13 جدول `specialty_categories`
التصنيفات العليا للتخصصات.

### أمثلة
- Mental Health
- Nutrition
- Weight Management

### أعمدة مقترحة
- `id`
- `code`
- `is_active`
- `sort_order`
- `created_at`
- `updated_at`

### ملاحظات
- لا نخزن الاسم النصي هنا لأن الترجمة ستكون في جدول منفصل

---

## 6.14 جدول `specialty_category_translations`
ترجمة أسماء ووصف التصنيفات.

### أعمدة مقترحة
- `id`
- `category_id`
- `locale`
- `name`
- `description`

### ملاحظات
- unique على `(category_id, locale)`

---

## 6.15 جدول `specialties`
التخصصات نفسها.

### أمثلة
- Psychiatrist
- Psychologist
- Family Counseling
- Nutritionist
- Weight Loss Specialist

### أعمدة مقترحة
- `id`
- `category_id`
- `code`
- `is_active`
- `is_selectable`
- `sort_order`
- `created_at`
- `updated_at`

### ملاحظات
- `code` مهم للربط الداخلي
- `is_selectable` يسمح للإدارة بإخفاء تخصص مؤقتًا دون حذفه

---

## 6.16 جدول `specialty_translations`
ترجمات اسم ووصف التخصص.

### أعمدة مقترحة
- `id`
- `specialty_id`
- `locale`
- `name`
- `description`

### ملاحظات
- unique على `(specialty_id, locale)`

---

## 6.17 جدول `practitioner_specialties`
ربط المعالج بتخصص أو أكثر.

### أعمدة مقترحة
- `practitioner_id`
- `specialty_id`
- `is_primary`
- `sort_order`
- `years_of_experience`
- `created_at`

### ملاحظات
- المفتاح الأساسي المركب: `(practitioner_id, specialty_id)`
- لو أردت فرض primary واحد فقط لكل practitioner، يمكن تأجيله للـ service layer أو raw SQL partial index لاحقًا

---

## 7) الـ Enums المقترحة

### `Locale`
- `AR`
- `EN`

### `UserStatus`
- `PENDING`
- `ACTIVE`
- `SUSPENDED`
- `DEACTIVATED`

### `AuthProvider`
- `PASSWORD`
- `GOOGLE`

### `RoleCode`
- `PATIENT`
- `PRACTITIONER`
- `ADMIN`
- `SUPPORT`
- `CONTENT_REVIEWER`
- `SUPER_ADMIN`

### `OtpPurpose`
- `LOGIN`
- `VERIFY_EMAIL`
- `VERIFY_PHONE`
- `RESET_PASSWORD`

### `OtpChannel`
- `EMAIL`
- `SMS`

### `TwoFactorMode`
- `OFF`
- `OPTIONAL`
- `REQUIRED`

### `ApplicationStatus`
- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

### `CredentialType`
- `LICENSE`
- `DEGREE`
- `CERTIFICATION`
- `NATIONAL_ID`
- `OTHER`

### `CredentialStatus`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `EXPIRED`

### `Gender`
- `MALE`
- `FEMALE`
- `NON_BINARY`
- `PREFER_NOT_TO_SAY`

---

## 8) الـ Flow المتوقع بناء على هذا الـ Schema

## 8.1 تسجيل العميل
1. المستخدم يسجل عبر Google
2. ينشأ `user`
3. ينشأ `auth_identity` نوعه `GOOGLE`
4. ينشأ `user_email` موثق غالبًا
5. ينشأ `user_role = PATIENT`
6. ينشأ `patient_profile`

## 8.2 تسجيل المعالج
1. المعالج يدخل الإيميل والباسورد
2. ينشأ `user`
3. ينشأ `auth_identity` نوعه `PASSWORD`
4. ينشأ `user_email`
5. ينشأ `user_role = PRACTITIONER`
6. ينشأ `practitioner_profile` بحالة Draft
7. ينشأ `practitioner_application`
8. يرفع مستنداته في `practitioner_credentials`
9. بعد المراجعة تغير الإدارة حالة `approval_status`
10. يتم تفعيل 2FA عبر `two_factor_settings`

## 8.3 دخول المعالج
1. Email + Password
2. التحقق من صحة الهوية من `auth_identities`
3. قراءة `two_factor_settings`
4. إنشاء `otp_challenge`
5. بعد نجاح OTP يتم إنشاء `user_session`

## 8.4 إنشاء Admin
في هذه المرحلة:
- يفضل seed لأول super admin
- أو creation داخلي يدوي
- لا يوجد public register

---

## 9) الفهارس والقيود المهمة

### Unique مهم
- `user_emails.normalized_email`
- `user_phones.e164`
- `(auth_identities.provider, auth_identities.provider_subject)`
- `(auth_identities.user_id, auth_identities.provider)`
- `(user_roles.user_id, user_roles.role)`
- `practitioner_profiles.public_slug`
- `specialty_categories.code`
- `specialties.code`
- `(specialty_category_translations.category_id, locale)`
- `(specialty_translations.specialty_id, locale)`
- `(practitioner_specialties.practitioner_id, specialty_id)`

### Indexes مهمة
- `users.status`
- `otp_challenges.user_id`
- `otp_challenges.expires_at`
- `user_sessions.user_id`
- `practitioner_profiles.approval_status`
- `practitioner_profiles.is_listed`
- `specialties.category_id`
- `practitioner_specialties.specialty_id`

### قيود لاحقة يمكن تنفيذها بـ raw SQL migration
- primary email واحد فقط لكل user
- primary phone واحد فقط لكل user
- primary specialty واحد فقط لكل practitioner

---

## 10) ترتيب الـ Migrations المقترح

### Migration 001 — identity_core
- users
- user_emails
- user_phones
- auth_identities
- user_roles

### Migration 002 — auth_security
- user_sessions
- otp_challenges
- two_factor_settings

### Migration 003 — profiles_core
- patient_profiles
- practitioner_profiles
- practitioner_applications
- practitioner_credentials

### Migration 004 — specialties_catalog
- specialty_categories
- specialty_category_translations
- specialties
- specialty_translations
- practitioner_specialties

### Migration 005 — seed_initial_data
- أول super admin
- specialty categories الأساسية
- specialties الأساسية
- مثال على role assignments

---

## 11) Seed مبدئي مقترح

### Specialty Categories
- `mental_health`
- `nutrition`
- `weight_management`

### Specialties مبدئية
- `psychiatrist`
- `psychologist`
- `family_counseling`
- `nutritionist`
- `weight_loss_specialist`

### ملاحظات
- لا تكثر seed data في البداية
- فقط ما يكفي لتشغيل onboarding والاختبار

---

## 12) ما تم تأجيله عمداً من هذه النسخة
تم تأجيل هذه العناصر لموديولات لاحقة حتى لا يتضخم schema مبكرًا:

- Availability / Schedule
- Presence / Online status
- Sessions / Instant booking
- Payments / Wallet / Commission
- Discount coupons
- Articles / Categories / Approval flow
- Support chat / Approved chat
- Courses / Training / Enrollments
- Notifications / Audit logs

---

## 13) توصيات تنفيذية مهمة

### 13.1 استخدم UUIDs
لكل الجداول الأساسية.

### 13.2 كل التوقيتات UTC
وتعرض حسب timezone المستخدم في التطبيق.

### 13.3 استخدم normalized fields للبحث
خصوصًا:
- normalized email
- E.164 phone

### 13.4 لا تضع business rules المتغيرة داخل schema
مثل:
- نسب العمولة
- سياسات الإلغاء
- الحجز الفوري

هذه ستأتي لاحقًا في settings / policies module.

### 13.5 لا تخلط بين approval status و user status
- `user.status` = حالة الحساب عامة
- `practitioner_profiles.approval_status` = حالة اعتماد المعالج مهنيًا وتشغيليًا

---

## 14) القرار النهائي لهذه المرحلة
المنصة تبدأ بـ:
- **User/Auth Core موحّد**
- **Profiles منفصلة**
- **تخصصات ديناميكية مترجمة**
- **2FA للمعالج والإدارة**
- **Google للعميل**
- **Admin via seed/invite**

هذا التصميم مناسب جدًا للمرحلة الحالية، وقابل للتوسع بدون إعادة بناء لاحقًا.

---

## 15) الخطوة التالية بعد اعتماد هذا الـ Schema
بعد اعتماد هذه النسخة، ننتقل إلى:

### DB Schema v1 — Sessions / Availability
ويشمل:
- availability slots
- availability exceptions
- presence status
- sessions
- session participants
- session lifecycle
- instant booking hooks

