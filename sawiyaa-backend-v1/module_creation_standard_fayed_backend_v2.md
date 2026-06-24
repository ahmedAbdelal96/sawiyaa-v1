# Module Creation Standard — Sawiyaa Backend

## الهدف من هذا الملف
هذا الملف هو **المعيار الموحد** الذي يجب اتباعه عند إنشاء أي Module داخل الباك اند.
الهدف منه هو ضمان أن كل الموديولات تُبنى بنفس النظام، ونفس المعمارية، ونفس أسلوب الكتابة، والتوثيق، والتنظيم.

هذا الملف يجب اعتباره **مرجعًا ثابتًا** لكل من يعمل على المشروع.

---

# 1) المبادئ الأساسية

## 1.1 المعمارية العامة
كل Module يجب أن تُبنى وفقًا للمبادئ التالية:

- **Modular Monolith**
- **Use-case based structure**
- **Thin controllers**
- **No giant service files**
- **Repositories واضحة ومنفصلة**
- **DTOs واضحة**
- **Policies / Guards منفصلة**
- **Comments مفيدة ومرجعية**
- **Swagger documentation منظمة**
- **No business logic inside controllers**
- **No direct Prisma queries inside controllers**
- **No random utility functions scattered around**

---

## 1.2 الهدف من كل Module
كل Module يجب أن تكون:
- واضحة المسؤولية
- isolated منطقيًا
- سهلة التعديل
- سهلة الاختبار
- سهلة التوثيق
- لا تتعدى على business concerns الخاصة بموديولات أخرى

---

# 2) الهيكل القياسي لأي Module

كل Module يجب أن تُبنى تحت:
```text
src/modules/<module-name>/
```

وبالهيكل التالي قدر الإمكان:

```text
src/modules/<module-name>/
  controllers/
  dto/
  use-cases/
  repositories/
  services/
  mappers/
  policies/
  guards/
  presenters/
  types/
  utils/
  docs/
  <module-name>.module.ts
```

## ملاحظات
- ليس مطلوبًا استخدام كل folders من أول يوم
- لكن يجب الحفاظ على نفس الفلسفة
- إذا لم يحتج الموديول `mappers` أو `presenters` الآن، يمكن تأجيلهما
- لا يتم خلط use-cases داخل services
- لا يتم وضع كل شيء داخل ملف واحد

---

# 3) مسؤولية كل جزء

## controllers/
- تستقبل الطلبات فقط
- تستدعي use cases
- لا تحتوي business logic
- لا تحتوي Prisma queries
- تستخدم decorators للـ guards والـ swagger
- تكون رفيعة جدًا

## dto/
- validation للمدخلات
- request dto
- query dto
- params dto
- response dto عند الحاجة

## use-cases/
- كل عملية business action في ملف مستقل
- كل use case مسؤولة عن شيء واحد واضح
- لا يتم تجميع عدة flows غير مرتبطة داخل نفس use case

## repositories/
- abstraction layer للوصول للبيانات
- التعامل مع Prisma
- لا business logic ثقيلة هنا
- فقط data access logic واضحة

## services/
- فقط إذا كان هناك domain/shared service حقيقي
- ليس مكانًا لتجميع كل business logic

## policies/
- قرارات الصلاحيات والقواعد الدقيقة
- ownership checks
- workflow rules
- eligibility rules

## guards/
- authentication / authorization / account state / role checks
- يجب أن تبقى عامة ومحددة المسؤولية

## mappers/
- تحويل data من DB shape إلى domain/response shape
- أو من resolution result إلى output موحد

## presenters/
- response shaping إذا احتجنا output format منظم

## types/
- interfaces / union types / helper types الخاصة بالموديول

## utils/
- helper functions صغيرة وواضحة تخص الموديول فقط

## docs/
- ملفات Swagger / API docs / flow docs الخاصة بالموديول

---

# 4) قواعد إنشاء Use Cases

## 4.1 كل use case في ملف مستقل
مثال:
```text
create-practitioner-profile.use-case.ts
update-practitioner-profile.use-case.ts
submit-practitioner-application.use-case.ts
```

## 4.2 تسمية واضحة
صيغة التسمية:
```text
<action>-<entity>.use-case.ts
```

## 4.3 كل use case يجب أن:
- يكون له مسؤولية واحدة واضحة
- يشرح في comment أعلى الملف:
  - ما الذي يفعله
  - ما المدخلات
  - ما assumptions المهمة
  - ما القيود business-wise

## 4.4 داخل use case
- لا تستخدم magic values hardcoded
- استخدم config/policies إذا كانت القاعدة متغيرة
- استخدم repositories
- استخدم guards/policies خارجية عند الحاجة
- ارجع نتيجة واضحة ومفهومة

---

# 5) قواعد Controllers

## 5.1 Controllers يجب أن تكون Thin
يعني:
- parse input
- call use case
- return response

## 5.2 ممنوع وضع business logic داخل controller
أمثلة ممنوعة:
- if/else معقدة
- validation business-specific
- direct DB access
- workflow transitions
- authorization logic الثقيلة

## 5.3 كل endpoint يجب أن يحتوي على:
- route واضح
- guards/decorators المطلوبة
- swagger decorators
- comment أعلى method يشرح الهدف من الـ endpoint

---

# 6) قواعد Repositories

## 6.1 Repository لكل concern واضح
أمثلة:
- user.repository.ts
- practitioner-profile.repository.ts
- session.repository.ts

## 6.2 الـ repository مسؤولة عن:
- Prisma queries
- includes/selects
- retrieval / create / update / list patterns

## 6.3 الـ repository ليست مكان business logic
مسموح:
- query composition
- pagination logic
- data lookup

غير مسموح:
- decisions workflow
- permission rules
- orchestration بين عدة concerns إلا في أقل حد ممكن

---

# 7) Swagger / API Documentation Standard

## 7.1 كل Module يجب أن يكون لها docs خاصة بها
داخل:
```text
src/modules/<module-name>/docs/
```

## 7.2 في docs folder نريد:
- ملف Markdown يشرح:
  - purpose of module
  - endpoints
  - request/response shapes
  - guards المستخدمة
  - use cases الرئيسية
  - notes / assumptions

مثال:
```text
src/modules/auth/docs/auth.api.md
src/modules/config/docs/config.api.md
```

## 7.3 داخل كل Controller API
لازم نستخدم Swagger decorators المناسبة مثل:
- `@ApiTags`
- `@ApiOperation`
- `@ApiBearerAuth`
- `@ApiResponse`
- `@ApiBadRequestResponse`
- `@ApiUnauthorizedResponse`
- `@ApiForbiddenResponse`
- `@ApiBody`
- `@ApiQuery`
- `@ApiParam`

## 7.4 كل endpoint يجب أن تكون موثقة
بحد أدنى:
- summary
- description
- request dto
- main success response
- common error responses
- auth requirement if needed

---

# 8) Commenting Standard

## 8.1 التعليقات مطلوبة لكن بشكل ذكي
نريد comments **مرجعية** وليست comments شكلية.

## 8.2 أين يجب وضع comments؟
### أعلى كل ملف مهم
- use case
- guard
- policy
- repository
- controller

### أعلى كل method مهمة
خصوصًا إذا:
- فيها workflow
- فيها security logic
- فيها assumption مهم
- فيها branching مهم

### داخل الكود
فقط في:
- الخطوات المعقدة
- القرارات الحساسة
- security-sensitive logic
- resolution logic
- workflow transitions

## 8.3 ما نوع التعليقات المطلوبة؟
يجب أن تشرح:
- هذه القطعة من الكود مسؤولة عن ماذا
- لماذا هذا القرار موجود
- ما assumptions المهمة
- ما الفرق بين هذا المسار وغيره

## 8.4 ما الذي لا نريده؟
- comments تشرح كل سطر واضح
- comments بدون قيمة
- تكرار اسم المتغير كتعليق
- شرح بديهي لا يضيف معلومة

---

# 9) Guards / Policies Standard

## 9.1 Guards
تستخدم من أجل:
- authentication
- role checks
- account state checks
- practitioner-specific checks
- internal endpoint protection

## 9.2 Policies
تستخدم من أجل:
- ownership
- eligibility
- workflow permissions
- approval rules
- resource-specific decisions

## 9.3 لا تخلط بينهما
- guard للحماية العامة
- policy للقرار الدقيق داخل الـ business flow

---

# 10) DTO Standard

## 10.1 أنواع DTOs
- request dto
- query dto
- params dto
- action dto
- response dto عند الحاجة

## 10.2 كل DTO يجب أن:
- تستخدم validation decorators
- تكون صغيرة وواضحة
- لا تحتوي business logic
- تحتوي comments مختصرة عند الحاجة

---

# 11) Error Handling Standard

## 11.1 استخدم exceptions واضحة
- BadRequest
- Unauthorized
- Forbidden
- NotFound
- Conflict
- custom exceptions عند الحاجة

## 11.2 لا تستخدم Error عامة إلا نادرًا
إذا كان عندك business case واضح، استخدم exception واضحة ومنظمة.

---

# 12) Naming Standard

## 12.1 أسماء الملفات
- kebab-case
- واضحة
- لا اختصارات غامضة

## 12.2 أسماء classes
- PascalCase
- معبرة

## 12.3 أسماء الـ use cases
- Verb + Entity + UseCase

## 12.4 أسماء الـ repositories
- Entity + Repository

## 12.5 أسماء الـ DTOs
- Action + Entity + Dto

---

# 13) Testing Awareness Standard

حتى لو لم ننفذ test لكل شيء الآن، يجب أن يكون الكود:
- testable
- use cases منفصلة
- repositories قابلة للـ mocking
- business logic غير مدفونة داخل controller

---

# 14) Module API Docs Template

كل موديول يجب أن تحتوي داخل `docs/` على ملف مثل:

```md
# <Module Name> API Docs

## Purpose
...

## Endpoints
- METHOD /path
- METHOD /path

## Guards
...

## Main DTOs
...

## Main Use Cases
...

## Notes
...
```

---

# 15) خطوات إنشاء أي Module جديدة

عند إنشاء أي Module يجب اتباع الخطوات التالية بالترتيب:

1. فهم هدف الموديول
2. تحديد ما يدخل وما لا يدخل في النسخة الحالية
3. تحديد use cases المطلوبة
4. تحديد repositories المطلوبة
5. تحديد guards/policies المطلوبة
6. تحديد DTOs
7. تحديد endpoints
8. تجهيز docs/Swagger plan
9. تنفيذ الموديول بنفس الهيكل القياسي
10. مراجعة:
   - no giant service
   - no business logic in controller
   - comments موجودة
   - docs موجودة
   - swagger decorators موجودة

---

# 16) Definition of Done لأي Module
تعتبر أي Module جاهزة إذا:
- structure واضحة ومنظمة
- use cases مفصولة
- repositories واضحة
- controllers thin
- guards/policies في مكانها الصحيح
- swagger decorators موجودة
- docs file موجودة داخل `docs/`
- comments المرجعية مكتوبة
- build/typecheck ناجحين
- لا يوجد خروج عن scope المطلوب

---

# 17) ممنوعات واضحة
عند إنشاء أي موديول، الأشياء التالية ممنوعة:
- giant service file
- direct Prisma in controller
- business logic في controller
- random helper files غير منظمة
- routes بدون swagger docs
- موديول بدون docs folder
- كود بدون comments في الأجزاء المهمة
- التوسع خارج scope المطلوب

---

# 18) القرار النهائي
هذا الملف هو **المعيار الرسمي الموحد** لإنشاء أي Module في المشروع.
أي module جديدة يجب أن تُبنى وفق هذا النظام حتى يبقى المشروع:
- منظم
- موحد
- آمن
- قابل للصيانة
- قابل للتوسع

---

# 19) Phase 1 Lessons Learned (Mandatory Additions)

This section captures real issues we faced during implementation and turns them into mandatory standards for all next modules.

## 19.1 Localized Messages (i18n) is mandatory

- No hardcoded success/error/business messages inside controllers, use-cases, repositories, or guards.
- Every module must use the existing backend localization baseline (`I18nService` / message key resolution).
- New module messages must be added to both language catalogs:
  - `ar`
  - `en`
- Module message keys must be namespaced by module name.
  - Example: `patients.success.profileUpdated`
  - Example: `patients.errors.profileNotFound`
- Missing key behavior must use fallback locale; no silent message breakage.
- Business exceptions should use `messageKey` (or localized resolver) so frontend can receive localized messages consistently.

## 19.2 Swagger docs must be split from controllers

- Every module must include a dedicated docs file under:
  - `src/modules/<module-name>/docs/<module-name>.api.md`
- Controller decorators are still required, but detailed API explanation must live in the module docs file, not as heavy inline controller comments.
- Module docs must stay synchronized with code (endpoints, guards, DTOs, responses).
- During audit/review, a module is not complete if docs file is missing or outdated, even if routes are working.

## 19.3 Swagger decorator completeness checklist

For each endpoint, verify at least:

- `@ApiTags`
- `@ApiOperation`
- `@ApiBearerAuth` for protected endpoints
- `@ApiBody` for `POST` / `PATCH` when body exists
- `@ApiResponse` (success response)
- `@ApiBadRequestResponse` where validation/business bad input is possible
- `@ApiUnauthorizedResponse` for protected endpoints
- `@ApiForbiddenResponse` when role/account state restrictions apply
- `@ApiNotFoundResponse` where resource lookup is expected and may fail

Swagger should explain security behavior clearly; do not leave protected routes looking public in docs.

## 19.4 Route protection consistency checklist

- Public endpoints must be explicitly marked (for example with `@Public()` if this is the project convention).
- Protected endpoints must explicitly apply required guards.
- Role-specific endpoints must use role decorators/guards consistently.
- Patient-only and practitioner-only routes must be enforced with role checks, not only "authenticated user" checks.
- Internal endpoints (such as config/internal APIs) must never be exposed as public by mistake.

## 19.5 Runtime and port safety baseline

- Do not use browser-unsafe ports for local web access (for example `6000` is blocked by modern browsers with `ERR_UNSAFE_PORT`).
- Recommended local backend port is `6001` or another safe port.
- Startup scripts should kill stale process on the configured app port before boot.
- If legacy ports were used before, cleanup script can include a legacy fallback port to prevent locked process issues.

## 19.6 Prisma client generation baseline

- Before local start, ensure Prisma client is generated (`prisma generate`) with local engine copy available.
- Avoid stale generated clients that force unexpected Data Proxy behavior in local development.
- If startup fails with datasource protocol mismatch, verify generated client mode and regenerate Prisma client before debugging business code.

## 19.7 Definition of Done update (enforced)

A module is not "closed" unless all of the following are true:

- Module docs file exists and matches current implementation.
- Swagger decorators are complete and accurate on all endpoints.
- Guard/decorator usage is consistent with route security intent.
- Localized messages are integrated (no hardcoded business messages).
- Build and typecheck pass.
