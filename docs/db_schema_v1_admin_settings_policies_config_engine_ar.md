# DB Schema v1 — Admin Settings / Policies / Config Engine

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- تخزين الإعدادات العامة للمنصة
- تخزين السياسات التشغيلية والمالية بشكل مركزي
- دعم إعدادات قابلة للتعديل بدون deploy
- دعم defaults + overrides
- حفظ تاريخ التعديلات والمراجعات
- دعم branding واللغات والقنوات
- دعم إعدادات الحجوزات والجلسات والإلغاء والخصومات
- دعم feature flags البسيطة
- تكوين مصدر موحد تستخدمه باقي الموديولات

هذا الموديول **لا** يشمل بعد:
- rule engine معقد جدًا بشرط/تعبير حر
- version control كامل شبيه Git
- dynamic workflow builder
- remote config edge delivery
- policy simulation UI

---

## لماذا هذا الموديول مهم جدًا؟
لأننا اتفقنا من البداية إن المشروع فيه أشياء كثيرة **لا يجب أن تكون hardcoded** داخل الكود، مثل:
- نسب العمولة
- نوافذ الحجز
- سياسات الإلغاء
- مدد الجلسات
- حدود الخصومات
- تفعيل الحجز الفوري
- إعدادات الإشعارات
- branding والألوان
- اللغات
- قنوات الدفع
- بعض حدود الأمان والدعم

إذا وُضعت هذه القواعد داخل الكود فقط:
- كل تعديل يحتاج deploy
- يزيد coupling
- تصعب المراجعة
- يصعب تتبع التعديلات
- تتكرر القواعد في أكثر من service

---

## المبدأ المعماري الأساسي
يجب أن يكون عندنا:

### 1) Settings
قيم عامة بسيطة أو مركبة مثل:
- اسم المنصة
- اللغات المفعلة
- بوابات الدفع
- ألوان الهوية
- support channels

### 2) Policies
قواعد تشغيلية ذات أثر business logic مثل:
- cancellation windows
- reschedule rules
- instant booking timeout
- coupon max percent
- session join window

### 3) Overrides
استثناءات على مستوى scope معين مثل:
- global
- specialty
- country
- practitioner
- user role

### 4) Audit / Change Log
أي تعديل على الإعدادات أو السياسات يجب أن يكون له تاريخ واضح:
- من عدل؟
- ماذا كان؟
- ماذا أصبح؟
- متى؟
- لماذا؟

---

## المبادئ المعمارية

### 1) فصل الإعداد عن تطبيقه
هذا الموديول لا ينفذ policy بحد ذاته،  
بل يزوّد بقية services بالبيانات التي تنفذ بها السياسات.

### 2) مفتاح ثابت + قيمة ديناميكية
لكل setting/policy:
- key أو slug ثابت
- نوع بيانات واضح
- scope
- قيمة current
- default / fallback

### 3) دعم JSON بدون فوضى
بعض الإعدادات يمكن أن تكون:
- Boolean
- String
- Number
- JSON

لكن يجب حفظ metadata توضح النوع،  
ولا نستخدم JSON لكل شيء بلا ضوابط.

### 4) لا نستخدم جداول كثيرة بلا داع
بدل جدول منفصل لكل policy:
- نجمعها في engine موحد
- مع تصنيف ومفاتيح واضحة
- ومع catalog يشرح وظيفة كل key

### 5) الـ read patterns أهم من كثرة الجداول
هذا الموديول سيُقرأ كثيرًا أكثر مما سيُكتب،  
لذلك:
- indexes مهمة
- caching لاحقًا مهم
- slug/key uniqueness ضروري

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **ConfigKeyCatalog**
   - تعريف جميع المفاتيح المعروفة
   - النوع
   - الفئة
   - هل هي policy أم setting
   - هل هي سرية
   - هل تسمح بـ override

2. **ConfigValue**
   - القيمة الحالية الفعلية
   - scope
   - typed fields + json
   - active range

3. **ConfigChangeLog**
   - سجل كامل للتعديلات

4. **BrandThemeConfig**
   - طبقة مريحة لإعدادات الهوية والألوان
   - مع الربط بالمفاتيح العامة

5. **FeatureFlag**
   - تشغيل/إيقاف ميزات
   - بمرونة على مستوى scope

6. **PolicyResolutionNote** (اختياري/تشغيلي)
   - ليس مصدر الحقيقة
   - فقط لتسجيل debugging أو trace لاحقًا
   - يمكن تأجيله في التنفيذ

---

# الجزء الأول: Catalog Layer

## 1. ConfigKeyCatalog
هذا الجدول هو معجم المفاتيح الرسمية في النظام.

### أمثلة مفاتيح
- platform.name
- platform.default_locale
- platform.enabled_locales
- branding.primary_color
- branding.secondary_color
- session.allowed_durations
- session.join_window_minutes
- booking.instant.enabled
- booking.instant.request_timeout_minutes
- booking.schedule.min_hours_before
- cancellation.full_refund_before_hours
- cancellation.partial_refund_tiers
- coupon.max_discount_percent
- coupon.requires_review
- notifications.support.email_default
- payment.enabled_providers
- payout.settlement_cycle

### أهم الحقول
- key
- slug
- display_name
- description
- config_kind
- data_type
- category
- is_sensitive
- is_required
- supports_override
- default_value_json

### لماذا Catalog؟
لأنه:
- يمنع الفوضى
- يمنحك قائمة مفاتيح رسمية
- يفيد لوحة الإدارة
- يسهل validation
- يسهل التوثيق
- يمنع إدخال مفاتيح عشوائية

---

# الجزء الثاني: Values Layer

## 2. ConfigValue
يمثل القيمة الفعلية لمفتاح معيّن ضمن scope معيّن.

### الـ scopes المقترحة
- GLOBAL
- COUNTRY
- SPECIALTY
- PRACTITIONER
- ROLE
- CHANNEL
- ENVIRONMENT

### أمثلة
- `session.join_window_minutes` على مستوى GLOBAL = 10
- `booking.instant.enabled` على مستوى GLOBAL = true
- `booking.instant.enabled` على مستوى SPECIALTY معين = false
- `coupon.max_discount_percent` على مستوى PRACTITIONER معين = 15
- `notifications.support.email_default` على مستوى ROLE = support

### أهم الحقول
- config_key_id
- scope_type
- scope_ref_id
- value_string
- value_number
- value_boolean
- value_json
- is_active
- effective_from
- effective_to
- priority

### لماذا typed fields + json؟
لأن:
- بعض القيم بسيطة
- وبعضها مركب مثل tiers أو arrays
- وجود typed columns يسهل الاستعلامات الشائعة
- و JSON يبقى للحالات المركبة

---

# الجزء الثالث: Change Tracking

## 3. ConfigChangeLog
يسجل كل تعديل.

### أهم الحقول
- config_value_id
- config_key_id
- changed_by_user_id
- change_action
- old_value_snapshot
- new_value_snapshot
- reason
- changed_at

### أنواع التغيير
- CREATED
- UPDATED
- ACTIVATED
- DEACTIVATED
- DELETED
- OVERRIDE_ADDED
- OVERRIDE_REMOVED

### لماذا مهم؟
- audit
- rollback understanding
- debugging
- governance

---

# الجزء الرابع: Branding Layer

## 4. BrandThemeConfig
هذا ليس بديلًا عن ConfigValue،  
لكنه convenience layer مهمة لأن branding تُستخدم كثيرًا في:
- الويب
- الداشبورد
- الإيميلات
- الموبايل

### أمثلة
- brand_name
- logo_url
- logo_dark_url
- favicon_url
- primary_color
- secondary_color
- accent_color
- success_color
- warning_color
- error_color
- font_family
- border_radius_scale

### ملاحظات
- يمكن أيضًا الاكتفاء بـ ConfigValue فقط
- لكن وجود جدول مركزي للثيم يجعل التطوير أسهل
- ويمكن ربطه لاحقًا بملف export للواجهة

---

# الجزء الخامس: Feature Flags

## 5. FeatureFlag
لتشغيل وإيقاف مزايا محددة.

### أمثلة
- feature.instant_booking
- feature.care_chat
- feature.training
- feature.article_tags
- feature.push_notifications
- feature.multi_language_content
- feature.practitioner_coupons

### أهم الحقول
- slug
- display_name
- description
- is_enabled
- scope_type
- scope_ref_id
- rollout_percent
- effective_from
- effective_to

### لماذا مهم؟
لأنه يسمح لك:
- بتجربة feature
- بإيقافها سريعًا
- بعمل rollout جزئي
- بفتحها لتخصص أو دولة أو معالج فقط

---

# الجزء السادس: أنواع البيانات المقترحة

## ConfigKind
- SETTING
- POLICY
- LIMIT
- THRESHOLD
- FEATURE_DEFAULT
- BRANDING

## ConfigDataType
- STRING
- NUMBER
- BOOLEAN
- JSON
- STRING_ARRAY
- NUMBER_ARRAY

## ConfigCategory
- PLATFORM
- BRANDING
- LOCALE
- SESSION
- BOOKING
- CANCELLATION
- PAYMENT
- PAYOUT
- COUPON
- CHAT
- SUPPORT
- NOTIFICATION
- SECURITY
- TRAINING
- SYSTEM

## ConfigScopeType
- GLOBAL
- COUNTRY
- SPECIALTY
- PRACTITIONER
- ROLE
- CHANNEL
- ENVIRONMENT

## ConfigChangeAction
- CREATED
- UPDATED
- ACTIVATED
- DEACTIVATED
- DELETED
- OVERRIDE_ADDED
- OVERRIDE_REMOVED

---

# الجزء السابع: العلاقات الأساسية

- ConfigKeyCatalog 1—N ConfigValues
- ConfigKeyCatalog 1—N ConfigChangeLogs
- ConfigValue 1—N ConfigChangeLogs
- User 1—N ConfigChangeLogs (changed_by)
- BrandThemeConfig مستقل ويمكن ربطه بالمفاتيح أو اعتباره snapshot convenience
- FeatureFlag مستقل لكنه يتبع نفس فكرة scope

---

# الجزء الثامن: Business Rules

## Catalog Rules
1. كل key يجب أن يكون unique
2. كل key يجب أن يكون له data type واضح
3. المفاتيح الحساسة لا تظهر لكل الأدمنز حسب الصلاحيات
4. لا يتم حذف catalog key بسهولة بعد استخدامها

## Value Rules
1. لا يوجد أكثر من value فعالة لنفس:
   - config_key
   - scope_type
   - scope_ref_id
   - effective range متداخل
2. resolution logic:
   - ابحث عن الأكثر specificity
   - ثم الأعلى priority
   - ثم GLOBAL fallback
3. إذا لم توجد قيمة، استخدم default من catalog
4. القيم غير الفعالة لا تدخل في runtime resolution

## ChangeLog Rules
1. أي تعديل يجب أن يكتب log
2. old/new snapshots تحفظ كما هي
3. change reason يفضل أن يكون مطلوبًا للتغييرات الحساسة

## Feature Flag Rules
1. إذا وُجد flag على scope أكثر specificity، يعلو على global
2. rollout_percent اختياري
3. feature يمكن تعطيله بالكامل حتى لو كانت البيانات موجودة

---

# الجزء التاسع: أمثلة عملية من مشروعنا

## 1) مدة فتح زر الانضمام للجلسة
- key: `session.join_window_minutes`
- kind: POLICY
- type: NUMBER
- global value: 10

## 2) تفعيل الحجز الفوري
- key: `booking.instant.enabled`
- kind: FEATURE_DEFAULT
- type: BOOLEAN
- global value: true

## 3) مهلة رد المعالج على الحجز الفوري
- key: `booking.instant.request_timeout_minutes`
- type: NUMBER
- value: 15

## 4) سياسات الإلغاء
- key: `cancellation.partial_refund_tiers`
- type: JSON
- value:
  [
    {"from_hours": 12, "to_hours": 6, "refund_percent": 75},
    {"from_hours": 6, "to_hours": 3, "refund_percent": 50}
  ]

## 5) الحدود القصوى للخصومات
- key: `coupon.max_discount_percent`
- type: NUMBER
- global value: 20
- practitioner override value: 15 لبعض الحالات

## 6) بوابات الدفع المفعلة
- key: `payment.enabled_providers`
- type: JSON أو STRING_ARRAY
- value: ["STRIPE", "PAYMOB"]

## 7) دورة التسوية
- key: `payout.settlement_cycle`
- type: STRING
- value: "MONTHLY"

## 8) branding
- key: `branding.primary_color`
- type: STRING
- value: "#0F766E"

---

# الجزء العاشر: الـ Indexes المهمة

## ConfigKeyCatalog
- unique index على `key`
- unique index على `slug`
- index على `(configKind, category)`
- index على `(isRequired, isSensitive)`
- index على `(supportsOverride, category)`

## ConfigValue
- index على `(configKeyId, scopeType, scopeRefId, isActive)`
- index على `(scopeType, scopeRefId, priority)`
- index على `(effectiveFrom, effectiveTo)`
- index على `(isActive, priority)`
- index على `(valueBoolean)` للـ boolean-heavy lookups
- index على `(valueNumber)` لبعض الاستعلامات الإدارية إن لزم

## ConfigChangeLog
- index على `(configKeyId, changedAt)`
- index على `(configValueId, changedAt)`
- index على `(changedByUserId, changedAt)`
- index على `(changeAction, changedAt)`

## BrandThemeConfig
- unique index على `slug`
- index على `(isActive)`

## FeatureFlag
- unique index على `(slug, scopeType, scopeRefId)`
- index على `(isEnabled, effectiveFrom, effectiveTo)`
- index على `(scopeType, scopeRefId)`

---

# الجزء الحادي عشر: الـ SEO والـ Slugs
هذا الموديول ليس Public SEO module،  
لكن استخدام slug هنا **مهم جدًا إداريًا وتشغيليًا**.

### أين نستخدم slug؟
- ConfigKeyCatalog.slug
- BrandThemeConfig.slug
- FeatureFlag.slug

### لماذا؟
- readability
- admin usability
- clean references in code/docs
- سهولة الربط بين الواجهة والباك اند

### لا نستخدم slug SEO public URLs هنا
لأن هذا موديول داخلي.

---

# الجزء الثاني عشر: Resolution Strategy المقترحة
عندما يطلب أي service قيمة config أو policy:

1. ابحث عن key في catalog
2. اجلب القيم الفعالة
3. رتّب حسب specificity:
   - PRACTITIONER
   - SPECIALTY
   - COUNTRY
   - ROLE
   - CHANNEL
   - GLOBAL
4. ثم حسب priority
5. ثم effective date
6. إذا لا توجد قيمة → fallback إلى default من catalog

> يفضل تنفيذ هذه الاستراتيجية في service موحد:
`ConfigResolverService`

---

# الجزء الثالث عشر: القرار المعماري النهائي
- مصدر القواعد المتغيرة هو DB وليس الكود
- catalog + values + changelog = backbone
- branding وfeature flags layers مساعدة
- slug/key واضحان من البداية
- overrides مدعومة
- runtime resolution مركزي
- caching لاحقًا مهم جدًا

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، الخطوات الطبيعية التالية قد تكون:

1. **Reviews / Ratings**
2. **Training / Courses / Enrollments**
3. **Admin RBAC / Permissions Matrix** إذا أردت تفصيل الإدارة أكثر
4. **Full Combined ERD / Migration Plan** يجمع كل الموديولات التي بنيناها
