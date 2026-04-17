# DB Schema v1 — Training / Courses / Enrollments

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- إدارة التدريب والكورسات داخل المنصة
- دعم الكورسات المباشرة (Live) في V1
- دعم الاشتراك المدفوع في الكورسات
- إدارة جداول ومواعيد التدريب
- تتبع تسجيل المشتركين وحالتهم
- حفظ روابط Zoom أو Video Room الخارجية
- دعم الحضور والمتابعة الأساسية
- تجهيز البنية التي تسمح مستقبلًا بتعدد المدربين

هذا الموديول **لا** يشمل بعد:
- استضافة الفيديوهات المسجلة داخل المنصة
- LMS كامل
- quizzes / exams
- certificates generation المتقدم
- drip content
- progress tracking المعقد
- community discussions الخاصة بكل كورس

---

## القرار الأساسي في V1
كما اتفقنا:
- **التدريب في V1 خاص بصاحب المنصة فقط**
- الكورسات **ليست محمّلة على المنصة**
- الحضور يتم عبر:
  - Zoom
  - أو أي Video Room خارجي
- النظام المطلوب هنا هو:
  - عرض الكورس
  - الاشتراك فيه
  - ربطه بالمواعيد
  - إدارة الحضور
  - إدارة حالة الاشتراك

لكن التصميم يجب أن يبقى **قابلًا للتوسع لاحقًا** بحيث:
- يمكن السماح لمعالجين آخرين بإنشاء كورسات
- يمكن دعم أكثر من مدرب
- يمكن دعم sessions متعددة داخل الكورس

---

## المبدأ المعماري الأساسي
يجب الفصل بين:

### 1) Course
المنتج التدريبي نفسه

### 2) CourseSchedule
موعد أو دفعة أو cohort زمنية لهذا الكورس

### 3) Enrollment
اشتراك المستخدم في Schedule محدد

### 4) Attendance
سجل الحضور الفعلي داخل الجلسات التدريبية

### 5) CourseSession
الجلسة الحية داخل الكورس
> مهم خصوصًا لو الكورس يتكون من أكثر من لقاء

---

## لماذا هذا الفصل مهم؟
لأن:
- نفس الكورس قد يتكرر أكثر من مرة
- نفس الكورس قد يكون له أكثر من schedule
- schedule واحدة قد تحتوي أكثر من جلسة
- الاشتراك يكون غالبًا في schedule وليس في abstract course فقط

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **TrainingInstructor**
   - تمثيل المدرب
   - في V1 غالبًا owner فقط
   - لكن قابل للتوسع

2. **CourseCategory**
   - أقسام التدريب والكورسات
   - منفصلة عن specialties والمقالات

3. **Course**
   - الكيان الأساسي للكورس
   - الوصف
   - التسعير
   - الحالة
   - صورة الغلاف
   - visibility
   - SEO slug

4. **CourseTranslation**
   - المحتوى العربي/الإنجليزي
   - slug لكل لغة
   - meta title / description

5. **CourseSchedule**
   - دفعة أو cohort أو فترة تسجيل/تشغيل

6. **CourseSession**
   - اللقاءات الفعلية الحية داخل schedule

7. **Enrollment**
   - اشتراك المستخدم

8. **EnrollmentAttendance**
   - سجل الحضور

9. **CourseModeration / Approval**
   - optional governance لو أردت لاحقًا فتح الكورسات لغير صاحب المنصة

---

# الجزء الأول: الفصل بين الكيانات

## 1) CourseCategory
هذا الجدول خاص فقط بتصنيف الكورسات.

### أمثلة
- تدريب للأسر
- تدريب للمعالجين
- مهارات نفسية
- ورش عمل
- تدريب جماعي
- تدريب متخصص

### مهم جدًا
هذا الجدول **ليس**:
- Specialty
- ArticleCategory

بل هو classification خاص بالكورسات فقط.

---

## 2) TrainingInstructor
يمثل المدرب.

### في V1
يمكن أن يكون:
- owner / platform instructor فقط

### لكن لاحقًا
يمكن أن يرتبط بـ:
- practitioner
- أو user داخلي
- أو external instructor record

### أهم الحقول
- user_id
- practitioner_id (اختياري)
- instructor_type
- status
- bio
- is_owner_default

---

## 3) Course
الكيان الأساسي للكورس.

### أهم الحقول
- primary_category_id
- primary_instructor_id
- course_type
- delivery_mode
- status
- visibility
- cover_image_url
- thumbnail_url
- price_amount
- currency_code
- capacity_mode
- max_enrollments
- is_featured
- slug_root
- published_at

### أمثلة لأنواع الكورس
- LIVE_COURSE
- LIVE_WORKSHOP
- LIVE_SERIES

### delivery_mode
- EXTERNAL_LIVE_ROOM
> في V1 هذا هو الوضع الأساسي

### ملاحظات
- السعر على مستوى Course ممكن، لكن الجدولة قد تحتاج override لاحقًا
- في v1 نسمح بأن السعر الأساسي على مستوى Course
- ويمكن schedule-level override اختياريًا

---

## 4) CourseTranslation
يحفظ:
- title
- short description
- full description
- slug
- meta title
- meta description

بشكل منفصل لكل لغة.

---

# الجزء الثاني: Scheduling Layer

## 5) CourseSchedule
يمثل دفعة أو cohort.

### لماذا نحتاجه؟
لأن الكورس يمكن أن:
- يتكرر
- يتاح التسجيل له في فترات مختلفة
- تكون له مواعيد مختلفة كل مرة

### أهم الحقول
- course_id
- schedule_code
- status
- enrollment_open_at
- enrollment_close_at
- starts_at
- ends_at
- timezone
- max_enrollments_override
- price_override_amount
- currency_code_override
- external_room_provider
- external_room_join_url
- external_room_host_url
- waitlist_enabled

### الحالات المقترحة
- DRAFT
- OPEN_FOR_ENROLLMENT
- FULL
- STARTED
- COMPLETED
- CANCELLED
- ARCHIVED

### ملاحظة
حتى لو الكورس live واحد فقط، وجود Schedule مهم جدًا.

---

## 6) CourseSession
يمثل جلسة واحدة داخل schedule.

### لماذا؟
لأن الكورس قد يحتوي:
- لقاء واحد
- أو سلسلة لقاءات

### أهم الحقول
- course_schedule_id
- session_title
- session_order
- starts_at
- ends_at
- external_room_provider
- external_room_join_url
- external_room_host_url
- attendance_tracking_enabled
- is_mandatory

### أمثلة
- الجلسة الأولى
- جلسة الأسئلة والأجوبة
- الورشة التطبيقية

---

# الجزء الثالث: Enrollment Layer

## 7) Enrollment
يمثل اشتراك المستخدم في دفعة معينة.

### أهم الحقول
- course_id
- course_schedule_id
- user_id
- patient_id (اختياري لو استخدمت patient profile)
- enrollment_status
- payment_status
- payment_id
- enrolled_at
- cancelled_at
- refunded_at
- attendance_status
- notes_internal

### الحالات المقترحة
#### EnrollmentStatus
- PENDING_PAYMENT
- ACTIVE
- CANCELLED
- REFUNDED
- COMPLETED
- NO_SHOW

#### AttendanceStatus
- NOT_STARTED
- PARTIALLY_ATTENDED
- ATTENDED
- MISSED

### لماذا نربط بـ course و schedule معًا؟
- schedule هو الأساس التشغيلي
- course يسهل الاستعلامات العامة والتحليلات

---

## 8) EnrollmentAttendance
سجل الحضور على مستوى كل CourseSession.

### أهم الحقول
- enrollment_id
- course_session_id
- check_in_at
- check_out_at
- attendance_status
- attended_minutes
- marked_by_user_id
- attendance_source

### أنواع attendance_source
- MANUAL
- PROVIDER_IMPORT
- AUTO_ESTIMATED

### الحالات
- PRESENT
- ABSENT
- LATE
- LEFT_EARLY

---

# الجزء الرابع: الحوكمة والموافقة

## 9) CourseApproval / Moderation
في V1 قد لا يكون ضروريًا إذا كان owner فقط هو الذي ينشر الكورسات.  
لكن من الأفضل تصميمه من الآن أو على الأقل تصور مكانه.

### متى يصبح مهمًا؟
عندما تسمح لاحقًا:
- لمعالجين آخرين بإنشاء كورسات
- أو لفريق محتوى أو تدريب متعدد الأطراف

### الحقول المقترحة
- course_id
- reviewed_by_user_id
- decision
- review_note
- created_at

### الحالات
- APPROVED
- REJECTED
- CHANGES_REQUESTED

في هذا الإصدار سأضيفه كجدول خفيف اختياري قابل للتفعيل لاحقًا.

---

# الجزء الخامس: الـ Enums المقترحة

## InstructorType
- OWNER
- PRACTITIONER
- INTERNAL_STAFF
- EXTERNAL

## InstructorStatus
- ACTIVE
- INACTIVE
- PENDING_APPROVAL

## CourseType
- LIVE_COURSE
- LIVE_WORKSHOP
- LIVE_SERIES

## CourseDeliveryMode
- EXTERNAL_LIVE_ROOM

## CourseStatus
- DRAFT
- PUBLISHED
- ARCHIVED
- DISABLED

## CourseVisibility
- PUBLIC
- UNLISTED
- PRIVATE

## CourseScheduleStatus
- DRAFT
- OPEN_FOR_ENROLLMENT
- FULL
- STARTED
- COMPLETED
- CANCELLED
- ARCHIVED

## EnrollmentStatus
- PENDING_PAYMENT
- ACTIVE
- CANCELLED
- REFUNDED
- COMPLETED
- NO_SHOW

## EnrollmentAttendanceStatus
- NOT_STARTED
- PARTIALLY_ATTENDED
- ATTENDED
- MISSED

## AttendanceStatus
- PRESENT
- ABSENT
- LATE
- LEFT_EARLY

## AttendanceSource
- MANUAL
- PROVIDER_IMPORT
- AUTO_ESTIMATED

## CourseReviewDecision
- APPROVED
- REJECTED
- CHANGES_REQUESTED

---

# الجزء السادس: العلاقات الأساسية

- TrainingInstructor 1—N Courses
- CourseCategory 1—N Courses
- Course 1—N CourseTranslations
- Course 1—N CourseSchedules
- CourseSchedule 1—N CourseSessions
- CourseSchedule 1—N Enrollments
- Enrollment 1—N EnrollmentAttendances
- CourseSession 1—N EnrollmentAttendances
- Course 1—N CourseApprovals

---

# الجزء السابع: Business Rules

## Course Rules
1. الكورس في V1 ينشأ من owner / admin فقط
2. الكورس لا يظهر للعامة إلا إذا كان:
   - status = PUBLISHED
   - visibility يسمح
   - وله ترجمة مناسبة
3. slug يجب أن يكون unique لكل لغة

## Schedule Rules
1. التسجيل يتم على schedule محددة
2. لا يمكن enrollment بعد enrollment_close_at إلا باستثناء إداري
3. إذا امتلأت schedule:
   - تتحول إلى FULL
   - أو يدخل المستخدم waitlist إذا enabled
4. schedule يمكن أن تملك override للسعر والسعة

## Session Rules
1. كل CourseSession يجب أن تتبع schedule
2. الترتيب داخل schedule مهم (`session_order`)
3. الحضور يحسب على مستوى session وليس course فقط

## Enrollment Rules
1. enrollment واحدة لكل user لكل schedule
2. payment الناجح يفعّل enrollment
3. refund يمكن أن يعدّل enrollment status
4. completion أو no-show يحددان بعد انتهاء schedule

## Attendance Rules
1. attendance يمكن أن تسجل يدويًا في V1
2. attendance source يجب أن يوضح المصدر
3. summary attendance على مستوى enrollment يمكن اشتقاقها من attendance rows

---

# الجزء الثامن: الفصل عن بقية الجداول
مهم جدًا:
- CourseCategory منفصلة عن Specialties
- CourseCategory منفصلة عن ArticleCategory
- Enrollment منفصلة عن Session booking
- TrainingInstructor منفصل عن PractitionerProfile، لكن يمكن ربطهما

هذا يضمن:
- وضوح الـ domain
- عدم خلط الخدمات العلاجية بالتدريب
- سهولة التوسع لاحقًا

---

# الجزء التاسع: الـ SEO والـ Slugs

## أين نستخدم slug؟
### نعم:
- Course.slug_root
- CourseTranslation.slug
- CourseCategory.slug_root
- CourseCategoryTranslation.slug

### لا:
- CourseSchedule
- CourseSession
- Enrollment
- Attendance

### لماذا؟
لأن:
- الـ SEO مهم للكورس وصفحة القسم
- أما schedule/enrollment كيانات تشغيلية

### أمثلة URLs
- `/training/family-guidance-basics`
- `/ar/training/mental-health-workshop`
- `/training/categories/family-support`

---

# الجزء العاشر: الـ Indexes المهمة

## TrainingInstructor
- index على `(status, instructorType)`
- index على `(userId)`
- index على `(practitionerId)`

## CourseCategory
- unique index على `slugRoot`
- index على `(isActive, sortOrder)`

## CourseCategoryTranslation
- unique index على `(courseCategoryId, locale)`
- unique index على `(locale, slug)`
- index على `(locale, title)`

## Course
- unique index على `slugRoot`
- index على `(primaryCategoryId, status, visibility, publishedAt)`
- index على `(primaryInstructorId, status)`
- index على `(isFeatured, status, publishedAt)`
- index على `(priceAmount, currencyCode)`

## CourseTranslation
- unique index على `(courseId, locale)`
- unique index على `(locale, slug)`
- index على `(locale, title)`

## CourseSchedule
- unique index على `scheduleCode`
- index على `(courseId, status, startsAt)`
- index على `(enrollmentOpenAt, enrollmentCloseAt, status)`
- index على `(startsAt, endsAt)`
- index على `(waitlistEnabled, status)`

## CourseSession
- unique index على `(courseScheduleId, sessionOrder)`
- index على `(courseScheduleId, startsAt)`
- index على `(startsAt, endsAt)`

## Enrollment
- unique index على `(courseScheduleId, userId)`
- index على `(courseId, enrollmentStatus, enrolledAt)`
- index على `(courseScheduleId, enrollmentStatus)`
- index على `(paymentStatus)`
- index على `(userId, enrollmentStatus)`

## EnrollmentAttendance
- unique index على `(enrollmentId, courseSessionId)`
- index على `(courseSessionId, attendanceStatus)`
- index على `(enrollmentId, attendanceStatus)`
- index على `(markedByUserId, checkInAt)`

## CourseApproval
- index على `(courseId, createdAt)`
- index على `(reviewedByUserId, createdAt)`
- index على `(decision, createdAt)`

---

# الجزء الحادي عشر: Flows مختصرة

## A) إنشاء كورس
1. owner/admin ينشئ Course
2. يضيف الترجمات
3. يربط category
4. ينشره
5. يظهر على الموقع

## B) فتح دفعة جديدة
1. إنشاء CourseSchedule
2. ضبط نافذة التسجيل
3. ضبط السعر أو السعة إذا لزم
4. إضافة CourseSessions
5. فتح التسجيل

## C) اشتراك مستخدم
1. المستخدم يختار schedule
2. يبدأ الدفع
3. عند نجاح الدفع:
   - Enrollment = ACTIVE
4. تصله الإشعارات
5. يحصل على بيانات الانضمام

## D) الحضور
1. تبدأ الجلسة
2. يسجل الحضور يدويًا أو نصف آلي
3. تحفظ EnrollmentAttendance
4. في نهاية schedule يحسب status النهائي للاشتراك

---

# الجزء الثاني عشر: القرار المعماري النهائي
- التدريب domain منفصل عن الجلسات العلاجية
- owner-only في V1 لكن قابل للتوسع
- schedule/session/enrollment layers مفصولة بوضوح
- external live rooms فقط في V1
- SEO على course/category فقط
- attendance منفصلة عن enrollment summary
- لا خلط بين CourseCategory وSpecialty وArticleCategory

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، أقوى خطوة تالية ستكون واحدة من:

1. **Full Combined ERD / Migration Plan**
2. **Admin RBAC / Permissions Matrix**
3. **Seed Strategy / Initial Catalog Data**
