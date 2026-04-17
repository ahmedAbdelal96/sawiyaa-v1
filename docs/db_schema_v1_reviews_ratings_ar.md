# DB Schema v1 — Reviews / Ratings

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- تقييم الجلسات
- تقييم المعالجين
- حفظ المراجعات النصية
- ضبط ظهور المراجعات للعامة
- دعم المراجعة الإدارية للمحتوى التقييمي
- دعم حساب متوسطات التقييم لاحقًا
- منع التكرار أو التلاعب قدر الإمكان

هذا الموديول **لا** يشمل بعد:
- تقييم الدورات التدريبية
- تقييم المقالات
- استطلاعات NPS المتقدمة
- reputation scoring المعقد
- تقييمات متعددة الأبعاد كثيرة جدًا

---

## المبدأ الأساسي
في منصتنا، التقييم يجب أن يكون **مرتبطًا بجلسة حقيقية**،  
وليس تقييمًا عشوائيًا غير مرتبط بخدمة فعلية.

لذلك:
- لا يُسمح بإنشاء review لمجرد وجود حساب
- review ترتبط بـ Session
- ومن خلالها يمكن ربطها بـ:
  - patient
  - practitioner

---

## المبادئ المعمارية

### 1) فصل Rating عن Review Text
يمكن للمستخدم:
- أن يعطي rating فقط
- أو rating + review text

لكن الأفضل إبقاء كل ذلك داخل كيان Review واحد مع حقول واضحة.

### 2) review ليست بالضرورة public مباشرة
لا يجب أن تظهر كل review للعامة تلقائيًا.
قد تمرّ review بحالات مثل:
- pending moderation
- published
- hidden
- rejected

### 3) session-linked review only
كل review يجب أن ترتبط بجلسة مكتملة أو منتهية بشكل يسمح بالتقييم.

### 4) snapshot مهم
عند حفظ review، من المفيد لاحقًا حفظ snapshot لبيانات العرض مثل:
- اسم المعالج وقت المراجعة
- تخصصه الظاهر وقتها
لكن في v1 يمكن تأجيل بعض الـ snapshots إذا كان الربط واضحًا.

### 5) التقييم شيء، والإحصاءات شيء آخر
الجدول الأساسي يحفظ الحقيقة.
أما:
- average rating
- total reviews
- rating distribution
فيمكن استخراجها أو cache لها لاحقًا في aggregate layer.

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **SessionReview**
   - التقييم الأساسي المرتبط بجلسة
   - stars
   - review text
   - status
   - visibility

2. **ReviewModeration**
   - مراجعة إدارية للمراجعة النصية
   - ملاحظات
   - سبب الإخفاء أو الرفض

3. **ReviewReaction** (اختياري للإدارة فقط أو لاحقًا)
   - ليس ضروريًا في v1

4. **PractitionerRatingSummary**
   - جدول summary اختياري لتحسين الأداء
   - أو يمكن حسابه لاحقًا عبر job

---

# الجزء الأول: الكيان الأساسي

## 1. SessionReview
هذا هو الكيان الرئيسي للتقييم.

### أهم الحقول
- session_id
- patient_id
- practitioner_id
- rating_value
- review_title
- review_text
- review_status
- is_anonymous
- is_featured
- submitted_at
- published_at
- hidden_at

### لماذا نربطه بالثلاثة؟
- `session_id` يربطه بالخدمة الفعلية
- `patient_id` يوضح صاحب التقييم
- `practitioner_id` يسهّل الاستعلامات والـ aggregates

### rating_value
في v1 أقترح:
- من 1 إلى 5
- integer فقط

### review_title
اختياري، يفيد الواجهة والـ SEO الداخلي للمراجعات المعروضة.

### review_text
اختياري، لأن بعض المستخدمين قد يريدون stars فقط.

---

# الجزء الثاني: حالات الـ Review

## ReviewStatus المقترحة
- DRAFT
- SUBMITTED
- PENDING_MODERATION
- PUBLISHED
- HIDDEN
- REJECTED
- ARCHIVED

### السيناريو المقترح
1. المستخدم يرسل review بعد الجلسة
2. تنتقل إلى:
   - `PENDING_MODERATION` إذا كان فيها نص
   - أو يمكن `PUBLISHED` مباشرة إذا كانت stars فقط، حسب سياستكم
3. الإدارة أو reviewer:
   - تنشر
   - أو تخفي
   - أو ترفض

### لماذا لا نستخدم Boolean؟
لأننا نحتاج:
- تاريخ الحالة
- قرار إداري
- مرونة مستقبلية

---

# الجزء الثالث: قواعد النزاهة

## قواعد مهمة جدًا
1. كل Session يمكن أن يكون لها **Review واحدة فقط لكل patient**
2. لا يسمح بمراجعة جلسة لم تكتمل أو لا يسمح policy بتقييمها
3. لا يسمح للمعالج بتقييم نفسه
4. لا يسمح بتعديل review المنشورة بلا ضوابط
5. إذا تم تعديل review بعد النشر:
   - يفضل إعادتها للمراجعة
   - أو تسجيل moderation log واضح

---

# الجزء الرابع: ReviewModeration

## 2. ReviewModeration
جدول لتتبع قرارات الإدارة على المراجعة.

### أهم الحقول
- session_review_id
- reviewer_user_id
- moderation_action
- moderation_note
- internal_reason
- created_at

### أمثلة actions
- APPROVED
- HIDDEN
- REJECTED
- RESTORED
- ARCHIVED

### لماذا منفصل؟
لأننا نحتاج:
- audit trail
- مراجعات متكررة
- trace واضح للقرارات

---

# الجزء الخامس: Summary Layer

## 3. PractitionerRatingSummary
هذا جدول convenience لتحسين الأداء.

### أهم الحقول
- practitioner_id
- total_reviews
- published_reviews_count
- average_rating
- rating_1_count
- rating_2_count
- rating_3_count
- rating_4_count
- rating_5_count
- last_review_at
- updated_at

### لماذا نحتاجه؟
لأن صفحة المعالج غالبًا ستعرض:
- average rating
- total reviews

ولو حسبته من الـ raw table كل مرة، قد يصبح مكلفًا مع التوسع.

### هل هو مصدر الحقيقة؟
لا.
مصدر الحقيقة هو SessionReview.
أما هذا فهو derived summary.

---

# الجزء السادس: هل التقييم public أم لا؟
يفضل الفصل بين:
- التقييم نفسه
- وهل يظهر للجمهور أم لا

يمكن استخدام:
- `review_status`
- مع حقل إضافي مثل `is_publicly_visible`

لكن في v1 يكفي:
- `review_status = PUBLISHED` معناها ظاهر
- `HIDDEN` أو `REJECTED` معناها غير ظاهر

---

# الجزء السابع: الـ Enums المقترحة

## ReviewStatus
- DRAFT
- SUBMITTED
- PENDING_MODERATION
- PUBLISHED
- HIDDEN
- REJECTED
- ARCHIVED

## ReviewModerationAction
- APPROVED
- HIDDEN
- REJECTED
- RESTORED
- ARCHIVED

---

# الجزء الثامن: العلاقات الأساسية

- Session 1—0..1 SessionReview
- PatientProfile 1—N SessionReviews
- PractitionerProfile 1—N SessionReviews
- SessionReview 1—N ReviewModerations
- PractitionerProfile 1—1 PractitionerRatingSummary

---

# الجزء التاسع: Business Rules

## Review Creation Rules
1. review تنشأ فقط من patient
2. review ترتبط بجلسة واحدة
3. review تنشأ فقط بعد session status يسمح بذلك (مثل COMPLETED)
4. review واحدة فقط لكل session / patient

## Moderation Rules
1. review التي تحتوي نصًا يمكن أن تمر بالمراجعة
2. كل action إداري يجب أن يسجل
3. المراجعة المخفية لا تُحسب في public display
4. المراجعات المرفوضة لا تظهر للعامة

## Summary Rules
1. summary يحدث من reviews المنشورة فقط
2. إذا تم إخفاء review بعد نشرها، يعاد حساب summary
3. counts وaverage يجب أن تكون derived من المصدر الحقيقي

---

# الجزء العاشر: الـ SEO والـ Slugs
هذا الموديول ليس module أساسي للـ SEO العام مثل:
- articles
- categories
- practitioner public pages

لذلك:
- لا نحتاج slug لكل review في v1

لكن يمكن لاحقًا دعم:
- public review snippet IDs
- أو featured review anchors

### الخلاصة
- لا slug أساسي هنا
- نركز على correctness وmoderation والربط الصحيح

---

# الجزء الحادي عشر: الـ Indexes المهمة

## SessionReview
- unique index على `(sessionId)`
- index على `(patientId, submittedAt)`
- index على `(practitionerId, reviewStatus, submittedAt)`
- index على `(ratingValue, reviewStatus)`
- index على `(publishedAt)`
- index على `(hiddenAt)`

## ReviewModeration
- index على `(sessionReviewId, createdAt)`
- index على `(reviewerUserId, createdAt)`
- index على `(moderationAction, createdAt)`

## PractitionerRatingSummary
- unique index على `(practitionerId)`
- index على `(averageRating, publishedReviewsCount)`

---

# الجزء الثاني عشر: Flows مختصرة

## A) تقييم جلسة
1. الجلسة تكتمل
2. العميل يرى prompt للتقييم
3. يختار rating
4. optionally يكتب title/text
5. تنشأ SessionReview
6. حسب السياسة:
   - stars only → قد تنشر مباشرة
   - text review → pending moderation

## B) مراجعة إدارية
1. reviewer يفتح review pending
2. يراجع النص
3. يقرر:
   - approve
   - hide
   - reject
4. يسجل ReviewModeration
5. إذا published → يدخل في summary

## C) تحديث summary
1. عند publish / hide / reject / restore
2. يتم تحديث PractitionerRatingSummary
3. صفحة المعالج تقرأ من summary + latest published reviews

---

# الجزء الثالث عشر: القرار المعماري النهائي
- review مرتبطة بجلسة حقيقية
- review واحدة لكل session
- moderation منفصلة عن review نفسها
- summary منفصل عن source of truth
- لا حاجة لـ SEO slugs في v1
- الـ public display يعتمد على reviews المنشورة فقط

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، المنطقي جدًا أن ننتقل إلى:

1. **Training / Courses / Enrollments**
2. **Admin RBAC / Permissions Matrix**
3. **Full Combined ERD / Migration Plan**
