# Prompt Template for Creating Any Backend Module

استخدم هذا الـ prompt عند طلب إنشاء أي Module جديدة داخل المشروع.

---

أريد منك الآن إنشاء **Module جديدة** داخل مشروع الباك اند، لكن يجب الالتزام بالكامل بملف المعيار الرسمي التالي:

- `module_creation_standard_fayed_backend_v2.md`

## مهم جدًا
قبل أن تبدأ:
1. اقرأ ملف `module_creation_standard_fayed_backend_v2.md`
2. التزم به بالكامل
3. ابنِ الموديول بنفس النظام ونفس الهيكل ونفس أسلوب الكتابة
4. لا تخرج عن الـ scope المطلوب
5. لا تكتب giant service
6. لا تضع business logic داخل controller
7. استخدم use-case based structure
8. اكتب comments مفيدة ومرجعية
9. أنشئ docs folder خاصة بالموديول
10. أضف Swagger decorators لكل API داخل controller

---

# اسم الموديول
`<MODULE_NAME>`

# هدف الموديول
اكتب هنا الهدف الواضح للموديول.

# Scope المطلوب الآن
اكتب هنا ما الذي يدخل في هذه النسخة من الموديول.

# Out of Scope
اكتب هنا ما الذي لا يدخل الآن.

# المطلوب تنفيذه
حدد:
- use cases المطلوبة
- repositories المطلوبة
- DTOs المطلوبة
- guards/policies المطلوبة
- APIs المطلوبة
- docs المطلوبة

# Swagger / Docs Requirements
- أنشئ folder: `docs/`
- أنشئ ملف API docs خاص بالموديول
- استخدم Swagger decorators في كل endpoint

# Commenting Requirements
- اكتب comments مرجعية مفيدة في:
  - الملفات المهمة
  - use cases
  - guards/policies
  - methods الحساسة
  - الخطوات المعقدة
- لا تكتب comments شكلية

# المطلوب في النهاية
بعد التنفيذ، أريد منك تقرير منظم يوضح:
- الملفات التي أُنشئت
- use cases التي تم بناؤها
- repositories التي تم بناؤها
- APIs التي أُضيفت
- docs file التي أُضيفت
- assumptions التي اتخذتها
- ما الذي تم تأجيله
- هل الموديول جاهزة للانتقال إلى الموديول التالية أم لا

# ملاحظات مهمة
- التزم بالهيكل القياسي للمشروع
- استخدم common guards/decorators الموجودة بالفعل
- لا تنشئ business features خارج المطلوب
- لا توسع scope بدون طلب
