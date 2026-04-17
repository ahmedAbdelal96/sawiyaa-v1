# DB Schema v1 — Articles / Categories / Review Workflow / Admin Content Moderation

## ملاحظة مهمة جدًا قبل البدء
في هذا التصميم يوجد **فصل كامل وواضح** بين:

### 1) Specialties
وهي خاصة بـ:
- المعالجين
- الخدمات
- البحث والتصفية
- ربط التخصصات بملف المعالج
- عرض التخصصات العلاجية أو المهنية داخل المنصة

أمثلة:
- علاج نفسي
- طبيب نفسي
- تغذية
- تخسيس
- إرشاد أسري

### 2) Article Categories
وهي خاصة بـ:
- المقالات
- المحتوى
- تنظيم المدونة
- تصنيف المقالات للقراءة والتصفح والـ SEO

أمثلة:
- القلق
- العلاقات
- الصحة النفسية للأطفال
- التغذية الصحية
- النوم
- ضغوط الحياة

## لماذا الفصل مهم؟
لأن:
- **التخصص** يعبر عن نوع مقدم الخدمة أو مجال عمله
- **القسم** يعبر عن موضوع المحتوى

يعني قد يكون المعالج تخصصه:
- أخصائي نفسي

لكن يكتب مقالات في أقسام مثل:
- القلق
- العلاقات
- التربية
- الثقة بالنفس

لذلك:
- لا يجب استخدام جدول التخصصات كبديل لأقسام المقالات
- ولا يجب استخدام أقسام المقالات لتحديد تخصص المعالج

هذا الفصل مهم جدًا من ناحية:
- سلامة الداتا موديل
- وضوح لوحة الإدارة
- سهولة التوسع
- الـ SEO
- البحث والتصفية
- بناء URL نظيف وواضح

---

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- إدارة المقالات
- إدارة أقسام المقالات
- Workflow المراجعة والموافقة
- أرشفة ورفض المحتوى
- ربط الكتّاب بالمقالات
- إدارة المحتوى من لوحة الإدارة
- دعم النشر بالعربي والإنجليزي
- بناء Slugs مناسبة للـ SEO

هذا الموديول **لا** يشمل بعد:
- التعليقات على المقالات
- الإعجابات
- saved articles
- newsletter campaigns
- rich analytics التفصيلية للمحتوى

---

## المبادئ المعمارية

### 1) المقال ككيان محتوى مستقل
المقال يجب أن يكون كيانًا مستقلًا لا يعتمد على Session أو Payment أو Specialty مباشرة.

### 2) الكاتب يختلف عن الناشر والمراجع
قد يكون:
- الكاتب = معالج
- المراجع = أدمن أو Content Reviewer
- الناشر النهائي = النظام بعد الموافقة

### 3) الـ Workflow لا يعتمد على Boolean بسيط
لا نستخدم فقط:
- is_approved = true / false

بل نستخدم حالات واضحة مثل:
- DRAFT
- SUBMITTED
- IN_REVIEW
- CHANGES_REQUESTED
- APPROVED
- REJECTED
- PUBLISHED
- ARCHIVED

### 4) دعم الـ SEO من البداية
لكل مقال ولكل قسم:
- slug
- meta title
- meta description
- og title / description / image لاحقًا لو رغبت

### 5) الترجمة
بما أن المنصة عربي/إنجليزي، الأفضل فصل المحتوى النصي في جدول translations بدل تكرار أعمدة كثيرة داخل نفس الجدول.

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **ArticleCategory**
   - أقسام المقالات
   - ترتيبها
   - تفعيلها
   - slug
   - SEO metadata

2. **Article**
   - الكيان الأساسي للمقال
   - ربطه بالكاتب
   - حالته
   - معلومات النشر
   - cover image
   - visibility

3. **ArticleTranslation**
   - العنوان
   - الملخص
   - المحتوى
   - SEO meta fields
   - slug لكل لغة

4. **ArticleCategoryTranslation**
   - الاسم
   - الوصف
   - slug
   - meta fields

5. **ArticleReview**
   - دورة المراجعة
   - من راجع
   - القرار
   - التعليق
   - timestamps

6. **ArticleModerationLog**
   - سجل داخلي للأحداث الإدارية المتعلقة بالمقال

7. **ArticleTag** و **ArticleTagTranslation** (اختياري لكنه مفيد)
   - لإثراء البحث والتنظيم لاحقًا

8. **ArticleCategoryAssignment**
   - ربط المقال بأكثر من قسم عند الحاجة
   - مع إمكانية تعيين قسم رئيسي

---

# الجزء الأول: الكيانات الرئيسية

## 1. ArticleCategory
يمثل قسم المقالات.

### أمثلة
- الصحة النفسية
- العلاقات
- التغذية
- الأطفال
- التوتر والقلق

### أهم الحقول
- parent_id (للدعم المستقبلي للأقسام الفرعية)
- slug_root
- sort_order
- is_active
- is_featured
- created_by_user_id

### ملاحظات
- الأفضل دعم شجرة categories من البداية
- لكن يمكن الاكتفاء بمستوى واحد فعليًا في V1

---

## 2. ArticleCategoryTranslation
النصوص الخاصة بالقسم حسب اللغة.

### أهم الحقول
- article_category_id
- locale
- title
- description
- slug
- meta_title
- meta_description

### لماذا جدول منفصل؟
- العربية والإنجليزية قد تختلفان في:
  - title
  - slug
  - meta SEO
- وهذا أنظف من وضع `title_ar` و `title_en` في نفس الجدول

---

## 3. Article
الكيان الأساسي للمقال.

### أهم الحقول
- author_user_id
- author_practitioner_id (اختياري لو الكاتب معالج)
- primary_category_id
- status
- cover_image_url
- featured_image_alt
- visibility
- published_at
- scheduled_publish_at
- last_submitted_at
- approved_at
- rejected_at
- archived_at
- current_revision_number

### ملاحظات
- وجود `author_user_id` مهم لو الإدارة أو فريق المحتوى كتب مقال
- وجود `author_practitioner_id` مهم لو أردت عرض المقال على صفحة المعالج

---

## 4. ArticleTranslation
المحتوى النصي للمقال حسب اللغة.

### أهم الحقول
- article_id
- locale
- title
- excerpt
- content_markdown أو content_json
- slug
- meta_title
- meta_description
- reading_time_minutes

### ملاحظات
- يفضل اختيار صيغة موحدة للمحتوى:
  - Markdown
  - أو structured JSON editor
- لا تجمع الاثنين في v1 إلا لو مضطر

---

## 5. ArticleCategoryAssignment
لربط المقال بأكثر من قسم إذا لزم.

### لماذا؟
لأن:
- primary_category_id في Article مفيد للعرض الأساسي
- لكن أحيانًا المقال الواحد يناسب أكثر من قسم

### أمثلة
مقال عن:
- القلق عند المراهقين  
قد ينتمي إلى:
- القلق
- الأطفال والمراهقين

---

## 6. ArticleReview
يمثل مراجعة واحدة داخل Workflow.

### أهم الحقول
- article_id
- reviewer_user_id
- review_status
- review_note
- internal_note
- created_at

### الاستخدام
- تاريخ المراجعات
- طلب تعديلات
- رفض
- موافقة

---

## 7. ArticleModerationLog
يسجل الأحداث الإدارية المهمة.

### أمثلة
- submitted_for_review
- moved_to_in_review
- changes_requested
- approved
- rejected
- published
- archived
- category_changed
- slug_changed

---

## 8. ArticleTag
اختياري لكنه مفيد من البداية.

### فائدته
- تحسين البحث
- تحسين related articles
- مرونة في المحتوى
- دعم SEO

---

## 9. ArticleTagTranslation
ترجمة التاج حسب اللغة.

---

# الجزء الثاني: الـ Enums المقترحة

## ArticleStatus
- DRAFT
- SUBMITTED
- IN_REVIEW
- CHANGES_REQUESTED
- APPROVED
- REJECTED
- PUBLISHED
- ARCHIVED

## ArticleVisibility
- PUBLIC
- UNLISTED
- PRIVATE

## ReviewStatus
- SUBMITTED
- IN_REVIEW
- CHANGES_REQUESTED
- APPROVED
- REJECTED

## ContentLocale
- ar
- en

---

# الجزء الثالث: العلاقات الأساسية

- User 1—N Articles (author)
- PractitionerProfile 1—N Articles (اختياري ككاتب معالج)
- ArticleCategory 1—N ArticleCategoryTranslations
- Article 1—N ArticleTranslations
- Article 1—N ArticleReviews
- Article 1—N ArticleModerationLogs
- Article N—M ArticleCategory عبر ArticleCategoryAssignment
- Article N—M ArticleTag عبر pivot table
- ArticleTag 1—N ArticleTagTranslations

---

# الجزء الرابع: Business Rules

## Category Rules
1. أقسام المقالات منفصلة تمامًا عن تخصصات المعالجين
2. لكل قسم slug خاص به
3. لا يجوز تكرار slug لنفس اللغة
4. يمكن إيقاف القسم دون حذف المقالات

## Article Rules
1. المقال لا ينشر مباشرة من الكاتب
2. أي مقال من معالج أو إدارة يمر بمراجعة قبل النشر
3. يجب وجود ترجمة واحدة على الأقل قبل النشر
4. slug يجب أن يكون unique لكل لغة
5. المقال المنشور يجب أن يكون له primary category
6. لا يجوز تعديل نسخة منشورة مباشرة بدون تسجيل مراجعة جديدة أو revision logic

## Review Rules
1. submit → in review → approved/rejected/changes requested
2. المراجع يجب أن يكون Admin أو Content Reviewer
3. الموافقة تسجل من قام بها ومتى
4. الرفض أو طلب التعديل يجب أن يحتوي reason أو note

## SEO Rules
1. لكل مقال slug مستقل حسب اللغة
2. لكل قسم slug مستقل حسب اللغة
3. meta_title و meta_description اختيارية لكن يفضل ملؤها
4. slug لا يعتمد على UUID في الـ public URL
5. إذا تغير slug بعد النشر:
   - يفضل لاحقًا دعم redirects
   - في v1 يمكن على الأقل تسجيل التغيير في moderation log

---

# الجزء الخامس: الـ SEO و الـ Slugs

## ماذا يأخذ slug؟
### نعم:
- ArticleCategoryTranslation.slug
- ArticleTranslation.slug
- ArticleTagTranslation.slug

### لا:
- ArticleReview
- ArticleModerationLog
- الجداول الداخلية للمراجعة والإدارة

## لماذا؟
لأن slug مهم للكيانات المعروضة للجمهور فقط.

### أمثلة URLs:
- `/articles/anxiety-management-tips`
- `/ar/articles/tips-for-better-sleep`
- `/categories/mental-health`
- `/ar/categories/relationships`

---

# الجزء السادس: الـ Indexes المهمة

## ArticleCategory
- unique index على `slug_root`
- index على `(is_active, sort_order)`
- index على `(parent_id, sort_order)`

## ArticleCategoryTranslation
- unique index على `(locale, slug)`
- unique index على `(article_category_id, locale)`
- index على `(locale, title)`

## Article
- index على `(status, published_at)`
- index على `(primary_category_id, status, published_at)`
- index على `(author_user_id, status)`
- index على `(author_practitioner_id, status)`
- index على `(visibility, status, published_at)`
- index على `(scheduled_publish_at)`
- index على `(approved_at)`

## ArticleTranslation
- unique index على `(locale, slug)`
- unique index على `(article_id, locale)`
- index على `(locale, title)`
- full-text search يضاف لاحقًا عبر raw SQL / Postgres search

## ArticleCategoryAssignment
- unique index على `(article_id, article_category_id)`
- index على `(article_category_id, article_id)`

## ArticleReview
- index على `(article_id, created_at)`
- index على `(reviewer_user_id, created_at)`
- index على `(review_status, created_at)`

## ArticleModerationLog
- index على `(article_id, created_at)`
- index على `(actor_user_id, created_at)`
- index على `(event_type, created_at)`

## ArticleTag
- index على `(is_active, sort_order)`

## ArticleTagTranslation
- unique index على `(locale, slug)`
- unique index على `(article_tag_id, locale)`
- index على `(locale, title)`

---

# الجزء السابع: Workflow المقترح

## السيناريو الطبيعي
1. الكاتب ينشئ المقال → `DRAFT`
2. يرسله للمراجعة → `SUBMITTED`
3. الإدارة أو reviewer يفتحه → `IN_REVIEW`
4. النتيجة:
   - `CHANGES_REQUESTED`
   - أو `APPROVED`
   - أو `REJECTED`
5. إذا Approved:
   - ينشر مباشرة → `PUBLISHED`
   - أو يجدول → `scheduled_publish_at`

## عند طلب تعديلات
- يرجع المقال إلى الكاتب
- يتم تعديل المحتوى
- ثم submit مرة أخرى
- مع الاحتفاظ بتاريخ المراجعات السابقة

---

# الجزء الثامن: من يكتب ومن يراجع؟

## الكاتب
قد يكون:
- معالج
- إدارة
- كاتب محتوى داخلي

## المراجع
- Content Reviewer
- Admin
- Super Admin

## النشر
- يتم فقط بعد الموافقة

---

# الجزء التاسع: الربط مع صفحة المعالج
بما أن عندكم المعالج يكتب مقالات،  
فالمقال يمكن ربطه بـ:
- `author_practitioner_id`

وبالتالي تستطيع لاحقًا:
- عرض مقالات المعالج في صفحته العامة
- بناء trust
- تحسين SEO الداخلي
- إظهار expertise بدون خلطها مع specialties

لاحظ:
- **المقال يعبر عن المحتوى**
- **التخصص يعبر عن الخدمة والمجال**
- **ليسوا نفس الشيء**

---

# الجزء العاشر: قرار معماري نهائي
- Specialties منفصلة بالكامل عن Article Categories
- Articles لها workflow مستقل
- SEO مبني على translation slugs
- review logs منفصلة عن المقال نفسه
- categories وtags منفصلان عن specialties
- المراجعة لا تعتمد على boolean بسيط

---

# الجزء الحادي عشر: الخطوة التالية
بعد اعتماد هذا الموديول، الخطوة المنطقية التالية هي:

**Chat / Support / Chat Approval / Moderation**

لأنها ستكمل:
- شات الدعم
- شات العميل/المعالج بالموافقة
- المراقبة
- الـ moderation tools
