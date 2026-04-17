# DB Schema v1 — Sessions / Availability / Presence / Instant Booking

## الهدف من هذا الموديول
هذا الموديول مسؤول عن إدارة:
- جدول ومواعيد المعالج
- الاستثناءات والإجازات
- حالة التواجد الحالية للمعالج
- الجلسات المجدولة
- الجلسات الفورية
- دورة حياة الجلسة
- الربط المستقبلي مع الفيديو (Daily)
- الأساس المطلوب للحجوزات 30 و60 دقيقة

هذا الموديول **لا** يشمل بعد:
- المدفوعات والتسويات
- العمولات
- الكوبونات
- المحادثات
- المراجعات
- المحتوى والتدريب

---

## المبادئ المعمارية

### 1) فصل الجدول عن حالة التواجد
- **Availability** = ما هي الفترات التي يسمح فيها المعالج بالحجز
- **Presence** = هل المعالج متصل الآن / مشغول / بعيد / غير متصل

وجود المعالج أونلاين لا يعني بالضرورة أنه متاح للحجز.
ووجود Slots في الجدول لا يعني أنه متصل الآن.

---

### 2) تخزين الوقت
جميع التواريخ والأوقات تخزن في قاعدة البيانات على أساس **UTC**.  
ويتم تحويلها في الواجهة حسب timezone المستخدم أو المعالج.

---

### 3) الجلسة هي الكيان الأساسي
حتى مع وجود Daily كـ video provider، تظل الجلسة داخل منصتنا هي الأصل:
- الجلسة تنشأ في النظام أولًا
- ثم لاحقًا يتم إنشاء room / token من Daily
- لا نعكس التصميم بحيث يصبح provider هو الأصل

---

### 4) الحجز الفوري امتداد للجلسات وليس نظامًا منفصلًا
الحجز الفوري ليس موديولًا مختلفًا بالكامل، بل هو:
- نوع flow مختلف
- له قواعد وصلاحيات إضافية
- لكنه ينتهي إلى نفس كيان `Session`

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **Availability**
   - الجدول الأسبوعي
   - تفعيل أو تعطيل slot
   - تحديد نوع الخدمة
   - جلسات 30 / 60 دقيقة
   - إن كان slot يدعم الحجز الفوري

2. **Availability Exceptions**
   - إجازات
   - حظر فترات معينة
   - استثناء ليوم محدد

3. **Presence**
   - Online / Offline / Busy / Away
   - last heartbeat
   - هل المعالج متاح للحجز الفوري الآن

4. **Sessions**
   - إنشاء الجلسة
   - scheduled vs instant
   - 30 / 60
   - الحالة العامة للجلسة
   - الربط بالعميل والمعالج
   - التواريخ الأساسية

5. **Session Events**
   - سجل انتقالات الحالة
   - أحداث مهمة مثل الإلغاء أو الانضمام أو انتهاء المهلة

6. **Instant Booking Requests**
   - طلب الحجز الفوري
   - مدة صلاحيته
   - قبوله / رفضه / انتهاءه

---

## الكيانات الرئيسية

## 1. AvailabilitySlot
يمثل slot أو قاعدة تكرار أسبوعية للمعالج.

### المسؤوليات
- اليوم الأسبوعي
- وقت البداية والنهاية
- هل الحجز مسموح
- هل الحجز الفوري مسموح
- مدة الجلسة المسموحة
- نوع الاستخدام

### ملاحظات
- الأفضل مبدئيًا دعم durations موحدة: 30 أو 60
- لا نسمح بslot يبدأ وينتهي في أيام مختلفة في v1
- لو احتجنا لاحقًا recurring rules أكثر تعقيدًا يمكن إضافة layer أعلى

### أهم الحقول
- practitioner_id
- weekday
- start_minute
- end_minute
- session_duration_minutes
- slot_type
- is_enabled
- instant_booking_enabled

### لماذا start_minute / end_minute؟
بدل تخزين time فقط، استخدام minute-of-day يجعل التعامل مع validation أسهل:
- 09:00 = 540
- 17:30 = 1050

---

## 2. AvailabilityException
يمثل استثناء على الجدول:
- يوم إجازة كامل
- حظر فترة معينة
- تعديل مؤقت

### أمثلة
- المعالج في إجازة يوم الجمعة كاملًا
- المعالج غير متاح من 2pm إلى 5pm في يوم محدد
- إغلاق الجدول خلال مؤتمر أو ظرف خاص

### أهم الحقول
- practitioner_id
- exception_date
- start_at_utc
- end_at_utc
- exception_type
- reason
- is_blocking

---

## 3. PractitionerPresence
الحالة اللحظية للمعالج.

### الحالات
- OFFLINE
- ONLINE
- AWAY
- BUSY

### الاستخدام
- إظهار العلامة الخضراء
- معرفة هل الحجز الفوري متاح فعليًا الآن
- منع قبول جلسة فورية أثناء جلسة قائمة

### أهم الحقول
- practitioner_id
- presence_status
- last_seen_at
- heartbeat_at
- manual_status_enabled
- instant_booking_live_enabled

### ملاحظة مهمة
وجود `instant_booking_live_enabled = true` لا يكفي وحده،  
بل يجب أيضًا أن:
- يكون المعالج approved
- ليس داخل جلسة نشطة
- لديه قناة استقبال فوري مفعلة
- لا توجد exception تمنعه
- ضمن ساعات عمل مناسبة إذا قررت فرض ذلك

---

## 4. Session
يمثل الجلسة نفسها.

### أنواع الجلسات
- SCHEDULED
- INSTANT

### طرق الجلسة
- VIDEO
- AUDIO
- CHAT (محجوز للمستقبل أو للحالات الخاصة)
> في v1 يفضل استخدام VIDEO / AUDIO فقط

### مدد الجلسة
- 30
- 60

### الحالات المقترحة
- DRAFT
- PENDING_PAYMENT
- PENDING_PRACTITIONER_RESPONSE
- CONFIRMED
- UPCOMING
- READY_TO_JOIN
- IN_PROGRESS
- COMPLETED
- CANCELLED
- NO_SHOW
- EXPIRED
- REFUND_PENDING
- REFUNDED

### أهم الحقول
- patient_id
- practitioner_id
- flow_type
- session_mode
- duration_minutes
- requested_start_at
- scheduled_start_at
- scheduled_end_at
- join_open_at
- expires_at
- status
- timezone_snapshot
- provider
- provider_room_id
- provider_session_ref
- notes_internal

### لماذا requested_start_at و scheduled_start_at؟
في الحجز الفوري أو طلبات إعادة الترتيب قد تحتاج معرفة:
- متى طلب العميل الجلسة
- متى تم اعتماد الموعد النهائي فعليًا

---

## 5. SessionEvent
سجل زمني للأحداث المهمة المرتبطة بكل Session.

### أمثلة
- session_created
- payment_pending
- payment_confirmed
- practitioner_accepted
- practitioner_rejected
- session_confirmed
- patient_joined
- practitioner_joined
- session_started
- session_completed
- cancelled_by_patient
- cancelled_by_practitioner
- expired_unpaid
- no_show_patient
- no_show_practitioner

### الهدف
- auditability
- تقارير
- debugging
- تغذية الـ notifications

---

## 6. InstantBookingRequest
كيان متخصص لتتبع طلب الحجز الفوري قبل أن يستقر على Session مؤكدة.

### لماذا نحتاجه؟
لأن flow الحجز الفوري فيه حالات إضافية:
- تم الطلب
- ينتظر رد المعالج
- انتهت المهلة
- تم القبول
- تم الرفض
- تم الإلغاء
- تم تحويله لجلسة

### أهم الحقول
- patient_id
- practitioner_id
- requested_duration_minutes
- preferred_mode
- requested_at
- expires_at
- responded_at
- status
- linked_session_id

### الحالات المقترحة
- PENDING
- ACCEPTED
- REJECTED
- EXPIRED
- CANCELLED
- CONVERTED_TO_SESSION

---

## 7. SessionParticipant (اختياري لكن مفيد)
في v1 يمكن الاكتفاء بـ patient_id و practitioner_id داخل Session.  
لكن لو أردت مرونة أعلى مستقبلاً (مثل جلسات ثنائية أو جماعية)، يمكن إضافة:
- session_id
- user_id
- role_in_session

في هذا الإصدار سنؤجل الجدول نفسه، ونكتفي داخل Session بالعميل والمعالج.

---

## العلاقات الأساسية

- PractitionerProfile 1—N AvailabilitySlot
- PractitionerProfile 1—N AvailabilityException
- PractitionerProfile 1—1 PractitionerPresence
- PractitionerProfile 1—N Sessions
- PatientProfile 1—N Sessions
- Session 1—N SessionEvents
- PractitionerProfile 1—N InstantBookingRequests
- PatientProfile 1—N InstantBookingRequests
- InstantBookingRequest 0..1 — 1 Session

---

## القواعد الأساسية (Business Rules)

## Availability Rules
1. لا يسمح بوجود slot حيث `start_minute >= end_minute`
2. يسمح فقط بـ durations: 30 أو 60 في v1
3. لا يسمح بتداخل slots الفعالة لنفس المعالج ونفس نوع الجلسة بنفس الوقت
4. يمكن للمعالج تعطيل slot دون حذفه

---

## Presence Rules
1. اللون الأخضر يظهر عندما:
   - presence_status = ONLINE
   - heartbeat حديث
   - المعالج approved ونشط
2. إذا دخل المعالج جلسة، يمكن تحويل الحالة إلى BUSY تلقائيًا
3. يمكن السماح للمعالج أن يكون ONLINE لكن `instant_booking_live_enabled = false`

---

## Session Rules
1. كل Session مرتبطة بعميل واحد ومعالج واحد في v1
2. الجلسة يجب أن تكون 30 أو 60 دقيقة فقط
3. الجلسة المجدولة تحتاج slot صالح أو استثناء يسمح بذلك
4. الجلسة الفورية تمر غالبًا بحالة `PENDING_PRACTITIONER_RESPONSE`
5. `join_open_at` عادة = `scheduled_start_at - 10 minutes`
6. لا يجوز إنشاء جلستين نشطتين متقاطعتين لنفس المعالج
7. لا يجوز للمعالج قبول جلسة فورية وهو داخل جلسة نشطة

---

## Instant Booking Rules
1. الحجز الفوري قابل للتعطيل لكل معالج
2. لا يقبل الطلب إذا كان المعالج:
   - غير approved
   - offline / away (حسب السياسة)
   - busy
   - instant booking disabled
3. لكل طلب مهلة صلاحية
4. عند القبول يمكن:
   - إنشاء Session مباشرة
   - أو نقل الطلب إلى Session مؤكدة
5. الطلب المنتهي لا يعاد استخدامه

---

## ربط هذا الموديول بالفيديو لاحقًا
في مرحلة التكامل مع Daily، سيتم استخدام الحقول التالية في Session:
- provider = DAILY
- provider_room_id
- provider_session_ref

وفي SessionEvent يمكن تسجيل:
- provider_room_created
- patient_joined_room
- practitioner_joined_room
- provider_room_ended

---

## تصميم الـ Enums المقترحة

### AvailabilityWeekday
- SUNDAY
- MONDAY
- TUESDAY
- WEDNESDAY
- THURSDAY
- FRIDAY
- SATURDAY

### SlotType
- REGULAR
- FOLLOW_UP
- BREAK
> في v1 يمكن استخدام REGULAR فقط فعليًا

### AvailabilityExceptionType
- FULL_DAY_BLOCK
- PARTIAL_BLOCK
- MANUAL_OVERRIDE

### PresenceStatus
- OFFLINE
- ONLINE
- AWAY
- BUSY

### SessionFlowType
- SCHEDULED
- INSTANT

### SessionMode
- VIDEO
- AUDIO
- CHAT

### SessionStatus
- DRAFT
- PENDING_PAYMENT
- PENDING_PRACTITIONER_RESPONSE
- CONFIRMED
- UPCOMING
- READY_TO_JOIN
- IN_PROGRESS
- COMPLETED
- CANCELLED
- NO_SHOW
- EXPIRED
- REFUND_PENDING
- REFUNDED

### SessionProvider
- NONE
- DAILY
- ZOOM
> ZOOM موجود تحضيرًا للتدريب لكن لن يستخدم في جلسات الاستشارات الآن

### InstantBookingRequestStatus
- PENDING
- ACCEPTED
- REJECTED
- EXPIRED
- CANCELLED
- CONVERTED_TO_SESSION

---

## ترتيب الـ Migrations المقترح

### Migration 003_sessions_availability_presence
يتضمن:
- AvailabilitySlot
- AvailabilityException
- PractitionerPresence
- Session
- SessionEvent
- InstantBookingRequest
- الـ enums اللازمة

---

## الملاحظات التنفيذية المهمة

### 1) منع التداخل
Prisma لا يوفر وحده أفضل أدوات منع التداخل الزمني المعقد،  
لذلك منع التداخل يكون عبر:
- service validation
- وربما raw SQL / DB constraint advanced لاحقًا

---

### 2) presence ليس مصدر الحقيقة الوحيد
الحقيقة النهائية لتوفر المعالج الفوري يجب أن تأتي من:
- presence
- approved status
- schedule
- existing active sessions
- instant booking flags
- optional policy rules

---

### 3) join_open_at لا يحسب في كل مرة في الواجهة
احفظه في قاعدة البيانات عند تأكيد الجلسة لتوحيد المنطق.

---

### 4) snapshot fields مهمة
يستحسن حفظ بعض القيم snapshot داخل Session حتى لو تغيرت لاحقًا:
- practitioner_display_name_snapshot
- patient_display_name_snapshot
- duration_minutes
- session_mode
- timezone_snapshot

في هذا الإصدار أبقينا الـ schema أخف، ويمكن إضافتها عند بناء المدفوعات أو الفواتير.

---

### 5) لا تربط availability مباشرة بالأسعار
السعر والعمولات والمدفوعات يجب أن تكون في موديول مالي مستقل.
هذا الموديول مسؤول فقط عن:
- الوقت
- الحجز
- الحالة
- دورة الحياة

---

## أمثلة Flows

## A) جلسة مجدولة
1. العميل يختار معالج
2. يختار slot مناسب
3. يتم إنشاء Session بحالة `PENDING_PAYMENT`
4. بعد الدفع → `CONFIRMED`
5. قبل الموعد → `UPCOMING`
6. قبل 10 دقائق → `READY_TO_JOIN`
7. عند دخول الطرفين → `IN_PROGRESS`
8. عند الانتهاء → `COMPLETED`

---

## B) جلسة فورية
1. العميل يرسل InstantBookingRequest
2. يتم فحص availability + presence + policy
3. يرسل للمعالج
4. إذا وافق خلال المهلة:
   - يتم إنشاء Session
   - إما `PENDING_PAYMENT` أو `CONFIRMED` حسب flow الدفع
5. إذا انتهت المهلة → `EXPIRED`
6. إذا رفض المعالج → `REJECTED`

---

## القرار المعماري النهائي لهذا الموديول
- Availability منفصل
- Presence منفصل
- Sessions ككيان محوري
- Instant booking ككيان طلب مستقل
- Daily integration لاحقًا عبر provider fields داخل Session
- كل شيء يبنى بحيث يدعم Web أولًا ثم Mobile لاحقًا

---

## الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، الموديول التالي المنطقي هو:

**Payments / Wallet / Ledger / Commission / Coupons**

لأنه سيكمل:
- الدفع عبر Stripe / Paymob
- عمولة المنصة
- أرباح المعالج
- الخصومات
- التسويات الشهرية
