# DB Schema v1 — Notifications / Templates / Email / SMS / Push / In-app

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- الإشعارات داخل المنصة (In-app)
- الإشعارات عبر البريد الإلكتروني
- الإشعارات عبر SMS
- Push notifications لاحقًا للموبايل
- قوالب الرسائل متعددة اللغات
- تتبع الإرسال والحالة والفشل وإعادة المحاولة
- ربط الإشعارات بأحداث النظام الأساسية
- دعم التفضيلات المختلفة لكل مستخدم

هذا الموديول **لا** يشمل بعد:
- marketing campaigns الواسعة
- newsletters
- A/B testing للقوالب
- advanced analytics للحملات
- notification digests المجمعة
- in-app real-time delivery infrastructure نفسها

---

## المبدأ الأساسي
نظام الإشعارات عندنا يجب أن يكون **Event-driven friendly**:
- النظام يولد event أو intent
- notification service تقرر:
  - هل نرسل أم لا
  - بأي قناة
  - بأي قالب
  - لأي لغة
- ثم نحفظ سجل المحاولة والنتيجة

---

## المبادئ المعمارية

### 1) فصل القالب عن الإشعار المرسل
- **Template** = الشكل العام والقواعد
- **Notification** = instance فعلية لمستخدم معين
- **Delivery Attempt** = محاولة إرسال على قناة معينة

---

### 2) دعم متعدد القنوات
القنوات الأساسية:
- EMAIL
- SMS
- PUSH
- IN_APP

لكن ليس كل حدث يجب أن يرسل عبر كل القنوات.

مثال:
- OTP → Email أو SMS
- Reminder للجلسة → Email + In-app + Push لاحقًا
- Payment failed → Email + In-app
- Article approved → In-app
- Support reply → In-app + Email

---

### 3) الترجمة من خلال Templates منفصلة حسب اللغة
لا نكرر `subject_ar`, `subject_en` في نفس الجدول إذا استطعنا تفادي ذلك.
الأفضل:
- Template
- TemplateTranslation

---

### 4) التفضيلات User Preferences منفصلة
حتى لو عندك default behavior، لازم يبقى عندك layer لتفضيلات المستخدم:
- هل يريد email؟
- هل يريد push؟
- هل يريد in-app؟
- هل أوقف نوعًا معينًا من الإشعارات؟

---

### 5) لا نحذف السجل
سجل الإرسال مهم جدًا من أجل:
- debugging
- retry
- support
- audit
- provider reconciliation

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **NotificationTemplate**
   - تعريف القالب
   - event key
   - القناة
   - الحالة

2. **NotificationTemplateTranslation**
   - العنوان / الموضوع
   - body
   - locale
   - slug إداري

3. **NotificationPreference**
   - تفضيلات المستخدم حسب النوع والقناة

4. **Notification**
   - الإشعار الفعلي المرتبط بمستخدم
   - event key
   - القناة
   - الحالة
   - payload snapshot

5. **NotificationDeliveryAttempt**
   - كل محاولة إرسال
   - provider
   - status
   - response payload
   - retries

6. **NotificationDevice**
   - push tokens
   - الأجهزة
   - المنصة
   - التفعيل والإبطال

7. **NotificationType**
   - catalog للأنواع الرئيسية
   - مع slug واضح وإعدادات افتراضية

8. **InAppNotificationFeedState**
   - حالة القراءة أو الأرشفة للإشعارات داخل التطبيق

---

# الجزء الأول: القوالب

## 1. NotificationType
يمثل نوع الإشعار المنطقي داخل المنصة.

### أمثلة
- otp_code
- session_confirmed
- session_reminder
- instant_booking_request
- instant_booking_accepted
- payment_succeeded
- payment_failed
- article_approved
- support_reply
- care_chat_approved

### لماذا نحتاجه؟
لأن type يساعد في:
- preferences
- reporting
- template mapping
- feature toggles
- admin config

### أهم الحقول
- slug
- display_name
- description
- category
- default_enabled
- supports_email
- supports_sms
- supports_push
- supports_in_app

---

## 2. NotificationTemplate
القالب الرئيسي المرتبط بنوع وقناة.

### أهم الحقول
- notification_type_id
- channel
- slug
- is_active
- is_system_template
- version
- provider_hint

### أمثلة
- session-reminder-email-v1
- session-reminder-inapp-v1
- otp-sms-v1

### ملاحظة
يمكن لنفس النوع أن يكون له أكثر من قالب حسب القناة.

---

## 3. NotificationTemplateTranslation
النص المترجم الخاص بالقالب.

### أهم الحقول
- notification_template_id
- locale
- subject_template
- title_template
- body_template
- cta_label
- cta_url_template

### الاستخدام
- Email: subject + body
- SMS: body
- Push: title + body
- In-app: title + body + CTA

### placeholders
سيتم استخدام placeholders مثل:
- {{user_name}}
- {{session_date}}
- {{session_time}}
- {{practitioner_name}}
- {{otp_code}}

---

# الجزء الثاني: التفضيلات

## 4. NotificationPreference
تفضيلات المستخدم حسب النوع والقناة.

### لماذا؟
لأن المستخدم قد يريد:
- إيقاف email للمقالات
- لكنه يريد push للجلسات
- ويريد in-app دائمًا

### أهم الحقول
- user_id
- notification_type_id
- channel
- is_enabled

### ملاحظات
- يمكن fallback إلى defaults من NotificationType
- بعض الأنواع تكون mandatory مثل OTP أو security alerts

---

# الجزء الثالث: الإشعارات الفعلية

## 5. Notification
يمثل intent أو instance فعلية لإشعار معين لمستخدم معين.

### أهم الحقول
- user_id
- notification_type_id
- template_id
- channel
- status
- locale
- payload_json
- title_snapshot
- subject_snapshot
- body_snapshot
- related_entity_type
- related_entity_id
- scheduled_for
- sent_at
- delivered_at
- read_at
- failed_at

### الحالات المقترحة
- PENDING
- QUEUED
- SENT
- DELIVERED
- READ
- FAILED
- CANCELLED
- SUPPRESSED

### لماذا snapshots؟
حتى لو تغيّر القالب لاحقًا، يبقى محفوظًا ما تم إرساله فعليًا.

---

## 6. NotificationDeliveryAttempt
كل محاولة إرسال على قناة معينة.

### أهم الحقول
- notification_id
- provider
- attempt_number
- status
- provider_message_ref
- request_payload
- response_payload
- error_code
- error_message
- attempted_at

### الفائدة
- retries
- debugging
- provider support
- reconciliation

---

# الجزء الرابع: Push / Devices

## 7. NotificationDevice
يمثل جهازًا مسجلاً لاستقبال Push.

### أهم الحقول
- user_id
- device_token
- platform
- device_id
- app_version
- is_active
- last_seen_at
- revoked_at

### المنصات
- IOS
- ANDROID
- WEB

### ملاحظات
- token قد يتغير
- يجب دعم إبطال token
- يمكن أن يكون للمستخدم أكثر من جهاز

---

# الجزء الخامس: In-app Feed

## 8. InAppNotificationFeedState
طبقة إضافية لو أحببت فصل feed behavior عن Notification نفسها.

### لماذا؟
لأن in-app feed قد يحتاج:
- archive
- pin
- dismissed
- hidden
- grouped behavior لاحقًا

في v1 يمكن الاكتفاء بـ `read_at` داخل Notification،  
لكن وجود هذا الجدول يعطي مرونة مستقبلية.

### أهم الحقول
- notification_id
- user_id
- is_archived
- is_dismissed
- archived_at
- dismissed_at

---

# الجزء السادس: الـ Enums المقترحة

## NotificationChannel
- EMAIL
- SMS
- PUSH
- IN_APP

## NotificationCategory
- SECURITY
- SESSION
- PAYMENT
- CONTENT
- SUPPORT
- CHAT
- SYSTEM
- TRAINING
- MARKETING

## NotificationStatus
- PENDING
- QUEUED
- SENT
- DELIVERED
- READ
- FAILED
- CANCELLED
- SUPPRESSED

## DeliveryAttemptStatus
- PENDING
- SENT
- DELIVERED
- FAILED

## DevicePlatform
- IOS
- ANDROID
- WEB

---

# الجزء السابع: العلاقات الأساسية

- NotificationType 1—N NotificationTemplates
- NotificationTemplate 1—N NotificationTemplateTranslations
- User 1—N NotificationPreferences
- User 1—N Notifications
- Notification 1—N NotificationDeliveryAttempts
- User 1—N NotificationDevices
- Notification 0..1 — 1 InAppNotificationFeedState

---

# الجزء الثامن: Business Rules

## Template Rules
1. لكل channel قالب مناسب منفصل
2. يجب وجود ترجمة واحدة على الأقل للقالب الفعّال
3. القالب غير النشط لا يستخدم في توليد إشعارات جديدة

## Preference Rules
1. بعض الأنواع mandatory ولا يمكن تعطيلها من المستخدم
2. إذا لم توجد preference صريحة، يتم fallback إلى default
3. preferences تطبق على user + type + channel

## Notification Rules
1. notification قد تنشأ حتى لو تم suppression، بشرط توثيق السبب
2. in-app notifications تحفظ داخل النظام حتى لو فشل email أو sms
3. snapshots تحفظ وقت الإنشاء

## Delivery Rules
1. كل retry = attempt جديدة
2. provider refs تحفظ دائمًا عند النجاح أو الإرسال
3. الفشل لا يحذف notification نفسها

## Device Rules
1. إذا provider أعاد invalid token → يعطل الجهاز
2. يمكن أن يكون للمستخدم عدة devices فعالة
3. last_seen_at مهم لتنظيف الأجهزة القديمة

---

# الجزء التاسع: أمثلة Flows

## A) OTP
1. النظام يطلب OTP
2. ينشأ Notification type = otp_code
3. channel = EMAIL أو SMS
4. template يحدد حسب locale
5. notification ترسل
6. delivery attempt تسجل

## B) Session Reminder
1. job قبل موعد الجلسة
2. ينشأ:
   - In-app notification
   - Email notification
   - Push لاحقًا إن توفر device token
3. تسجل محاولات الإرسال لكل قناة

## C) Support Reply
1. agent يرد على ticket
2. ينشأ in-app notification
3. optional email إذا preference تسمح
4. المستخدم يرى notification ويرى المحادثة

## D) Article Approved
1. reviewer يوافق على المقال
2. الكاتب يتلقى in-app notification
3. optional email

---

# الجزء العاشر: الـ SEO والـ Slugs
هذا الموديول ليس Public SEO module،  
لكن يمكن استخدام slug إداري في:
- NotificationType.slug
- NotificationTemplate.slug

### لماذا؟
- يسهل الإدارة
- يسهل الربط في الكود
- يسهل البحث والفلترة
- يعطي naming واضح

### لا نستخدم slug SEO في:
- Notification
- DeliveryAttempt
- Devices
- Preferences

---

# الجزء الحادي عشر: الـ Indexes المهمة

## NotificationType
- unique index على `slug`
- index على `(category, default_enabled)`

## NotificationTemplate
- unique index على `slug`
- index على `(notificationTypeId, channel, isActive)`
- index على `(isSystemTemplate, isActive)`

## NotificationTemplateTranslation
- unique index على `(notificationTemplateId, locale)`
- index على `(locale)`

## NotificationPreference
- unique index على `(userId, notificationTypeId, channel)`
- index على `(userId, channel)`
- index على `(notificationTypeId, channel, isEnabled)`

## Notification
- index على `(userId, status, createdAt)`
- index على `(userId, channel, createdAt)`
- index على `(notificationTypeId, channel, createdAt)`
- index على `(scheduledFor, status)`
- index على `(relatedEntityType, relatedEntityId)`
- index على `(readAt)`
- index على `(failedAt)`

## NotificationDeliveryAttempt
- index على `(notificationId, attemptNumber)`
- index على `(provider, status, attemptedAt)`
- index على `(providerMessageRef)`

## NotificationDevice
- unique index على `(deviceToken)`
- index على `(userId, isActive)`
- index على `(platform, isActive)`
- index على `(lastSeenAt)`

## InAppNotificationFeedState
- unique index على `(notificationId, userId)`
- index على `(userId, isArchived, isDismissed)`

---

# الجزء الثاني عشر: القرار المعماري النهائي
- templates منفصلة عن notifications الفعلية
- preferences منفصلة عن defaults
- attempts منفصلة عن notifications
- device registry منفصل للـ push
- in-app جزء أصيل من النظام
- slug يستخدم إداريًا في type/template فقط
- snapshots تحفظ لحماية consistency

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، المنطقي جدًا أن ننتقل إلى:

**Admin Settings / Policies / Config Engine**

لأنه سيجمع:
- العمولات الافتراضية
- سياسات الحجز والإلغاء
- حدود الكوبونات
- مهل الحجز الفوري
- إعدادات القنوات والـ notifications defaults
- إعدادات branding واللغات
