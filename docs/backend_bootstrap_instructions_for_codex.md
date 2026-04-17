# Backend Bootstrap Instructions for Codex — Fayed Backend v1

## الهدف
هذا الملف موجه إلى Codex لمساعدته في **تهيئة مشروع الباك اند بالكامل قبل بدء بناء الموديولات**، والتأكد أن النظام جاهز تقنيًا للعمل على:

- NestJS
- PostgreSQL
- Prisma
- Validation
- Config / Environment
- Logging baseline
- Security baseline
- Project structure baseline

اسم المشروع الحالي:
- `fayed-backend-v1`

---

# المطلوب من Codex
يرجى تنفيذ الخطوات التالية **داخل مشروع NestJS الحالي** مع الحفاظ على الكود منظمًا وقابلًا للتوسع.

> المهم: لا تبدأ ببناء business modules الآن.  
> المطلوب فقط هو **تهيئة النظام بالكامل** وتجهيزه لأول مرحلة تنفيذ.

---

# 1) تثبيت الحزم الأساسية

## تثبيت Prisma + PostgreSQL
ثبت الحزم التالية:

### runtime
- `@prisma/client`

### dev
- `prisma`

---

## تثبيت Config / Validation / Transformation
ثبت:
- `@nestjs/config`
- `class-validator`
- `class-transformer`

---

## تثبيت Security / Platform helpers
ثبت:
- `helmet`
- `compression`
- `cookie-parser`

---

## تثبيت Environment validation helper
اختر واحدًا من التالي:
- `zod`
أو
- `joi`

**الترجيح الحالي:** استخدم `zod`

---

## تثبيت Logging helper
يمكن الاكتفاء حاليًا بـ Nest logger،  
لكن جهّز البنية لتسهيل استبداله لاحقًا.

---

# 2) تهيئة Prisma

## المطلوب
- Initialize Prisma داخل المشروع
- استخدام PostgreSQL
- التأكد من وجود:
  - `prisma/schema.prisma`
  - `prisma/seed.ts`

## ملاحظات
- لا تُنشئ schema business النهائية الآن إذا لم ننسخها بعد
- لكن جهّز Prisma بشكل صحيح
- أضف scripts مناسبة داخل `package.json`

### scripts المطلوبة
- `prisma:generate`
- `prisma:migrate:dev`
- `prisma:migrate:deploy`
- `prisma:studio`
- `prisma:seed`

---

# 3) إعداد environment files

## المطلوب
أنشئ:
- `.env`
- `.env.example`

## لا تضع أي secrets حقيقية داخل `.env.example`

## المتغيرات الأساسية التي يجب إضافتها
- `NODE_ENV`
- `PORT`
- `APP_NAME`
- `APP_URL`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

## متغيرات Google Auth (تجهيز فقط)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

## متغيرات OTP / Email / SMS (تجهيز فقط)
- `MAIL_PROVIDER`
- `MAIL_FROM`
- `SMS_PROVIDER`

## متغيرات Daily / Zoom (تجهيز فقط)
- `DAILY_API_KEY`
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

## متغيرات Stripe / Paymob
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMOB_API_KEY`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_INTEGRATION_ID`

---

# 4) إعداد Config Module بشكل صحيح

## المطلوب
- تفعيل `@nestjs/config` على مستوى المشروع
- إنشاء folder منظم خاص بالـ config
- تقسيم config حسب domain قدر الإمكان

## structure مقترح
```text
src/config/
  app.config.ts
  database.config.ts
  auth.config.ts
  payment.config.ts
  video.config.ts
  notification.config.ts
  validation/
    env.schema.ts
```

## المطلوب أيضًا
- تفعيل environment validation عند startup
- إذا كانت متغيرات البيئة ناقصة أو غير صحيحة، يفشل التطبيق بشكل واضح

---

# 5) إعداد Prisma Module و Prisma Service

## المطلوب
إنشاء:
- `PrismaModule`
- `PrismaService`

## الشروط
- يتم عمل graceful shutdown
- يكون Prisma متاحًا للـ dependency injection
- يفضل وضعه داخل:
```text
src/common/prisma/
```

أو
```text
src/prisma/
```

اختر تنظيمًا واضحًا وثابتًا.

---

# 6) إعداد Global Validation Pipe

## المطلوب
في `main.ts`:
- تفعيل `ValidationPipe` global

## الإعدادات المطلوبة
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

---

# 7) إعداد Security Baseline

## المطلوب في `main.ts`
- `helmet`
- `compression`
- `cookie-parser`

## ويفضل أيضًا
- تفعيل prefix عام للـ API مثل:
```text
/api/v1
```

---

# 8) إعداد CORS

## المطلوب
- تفعيل CORS بشكل منظم
- اجعل origins قابلة للقراءة من environment
- لا تتركها مفتوحة بلا ضوابط

## متغير مقترح
- `CORS_ORIGINS`

ويكون بصيغة:
```text
http://localhost:3000,http://localhost:3001
```

---

# 9) إعداد هيكل المشروع الأساسي

## المطلوب
إنشاء هيكل واضح من البداية داخل `src/`

### structure مقترح
```text
src/
  main.ts
  app.module.ts

  config/
  common/
    prisma/
    constants/
    decorators/
    dto/
    enums/
    exceptions/
    filters/
    guards/
    interceptors/
    interfaces/
    pipes/
    utils/

  modules/
    auth/
    users/
    patients/
    practitioners/
    specialties/
    sessions/
    payments/
    articles/
    chat/
    notifications/
    settings/
    reviews/
    training/
    admin/

  shared/
```

> لا يلزم تنفيذ كل modules الآن،  
> لكن جهّز folders الأساسية حتى يكون المشروع منظمًا.

---

# 10) حذف الملفات التجريبية الافتراضية

## المطلوب
احذف أو نظف:
- `app.controller.ts`
- `app.service.ts`
- `app.controller.spec.ts`
- أي boilerplate لا نحتاجه

واستبدلها بهيكل production-ready بسيط.

---

# 11) إعداد Health Check بسيط

## المطلوب
إنشاء endpoint بسيط مثل:
- `GET /api/v1/health`

يعيد response بسيط مثل:
```json
{
  "success": true,
  "service": "fayed-backend-v1",
  "status": "ok"
}
```

---

# 12) إعداد Exception Handling Baseline

## المطلوب
إنشاء global exception filter مبدئي
ليوحد شكل الأخطاء في الـ API.

## الشكل المقترح للاستجابة
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [],
  "timestamp": "...",
  "path": "/api/v1/..."
}
```

---

# 13) إعداد Response Interceptor Baseline

## المطلوب
إنشاء interceptor اختياري لتوحيد شكل success responses

مثال:
```json
{
  "success": true,
  "data": {...}
}
```

> لو رأيت أن هذا قد يقيّد المشروع في البداية، يمكن الاكتفاء بالـ exception filter فقط الآن.

---

# 14) إعداد Logger Baseline

## المطلوب
- استخدام Nest logger افتراضيًا
- لكن بطريقة منظمة
- التأكد أن startup logs واضحة
- التأكد أن errors واضحة

## لا حاجة الآن لإضافة Winston/Pino إلا إذا كانت هناك قيمة فورية

---

# 15) إعداد ESLint / Prettier / TS path aliases

## المطلوب
- التأكد أن eslint شغال
- التأكد أن formatting واضح
- يمكن إضافة path aliases في `tsconfig.json`

### aliases مقترحة
- `@config/*`
- `@common/*`
- `@modules/*`
- `@shared/*`

---

# 16) إعداد Scripts مهمة داخل package.json

## تأكد من وجود scripts التالية
- `start:dev`
- `build`
- `lint`
- `format`
- `test`
- `prisma:generate`
- `prisma:migrate:dev`
- `prisma:migrate:deploy`
- `prisma:studio`
- `prisma:seed`

## scripts إضافية مفيدة
- `start:debug`
- `db:reset` (بحذر)
- `typecheck`

---

# 17) إعداد Seed baseline

## المطلوب
إنشاء `prisma/seed.ts`
بشكل مبدئي ومنظم.

## لا تضع seed business ضخمة الآن
لكن جهّز البنية لتدعم:
- roles
- admin user
- languages
- countries
- config defaults
- notification types
- specialties
لاحقًا

---

# 18) إعداد README داخلي مختصر

## المطلوب
حدّث README أو أضف ملف setup مختصر يشرح:
- كيف تشغيل المشروع
- كيف إعداد env
- كيف تشغيل Prisma
- كيف تشغيل seed
- كيف تشغيل health check

---

# 19) التأكد من أن المشروع يعمل بعد التهيئة

## المطلوب من Codex في النهاية
بعد تنفيذ كل ما سبق، تأكد من:
1. install dependencies نجح
2. project builds بدون errors
3. lint يعمل
4. Prisma generate يعمل
5. التطبيق يبدأ بنجاح
6. endpoint الصحة يعمل
7. env validation يعمل
8. لا توجد ملفات boilerplate غير ضرورية

---

# 20) Deliverables المطلوبة من Codex

يرجى أن ينجز Codex الآتي:

## A) تعديل المشروع فعليًا
داخل `fayed-backend-v1`

## B) تزويدنا بقائمة واضحة لما تم
مثل:
- dependencies added
- files created
- files removed
- scripts added
- env variables required

## C) توضيح أي نقاط تحتاج قرار لاحق
مثل:
- zod vs joi
- response envelope on/off
- exact logger upgrade
- storage provider لاحقًا

---

# 21) قرارات ثابتة يجب الالتزام بها
هذه القرارات محسومة بالفعل في المشروع:

- Framework: `NestJS`
- ORM: `Prisma`
- Database: `PostgreSQL`
- API style: REST
- Sessions video provider: `Daily`
- Training provider in V1: `Zoom / external live room`
- Payments: `Stripe + Paymob`
- Multi-language: `Arabic + English`
- Architecture preference: `Modular Monolith`
- Auth model:
  - patient login can support Google
  - practitioner login = password + OTP
  - admin = secure login with stronger restrictions

---

# 22) مهم جدًا
- لا تبدأ ببناء business modules الآن
- لا تكتب schema نهائية جديدة من عندك
- لا تضف features غير مطلوبة
- ركز فقط على **تهيئة النظام** بشكل نظيف وقابل للبناء فوقه

---

# 23) النتيجة النهائية المتوقعة
بعد انتهاء Codex، يجب أن يكون لدينا:

- NestJS backend clean and production-ready baseline
- Prisma integrated correctly
- Environment config validated
- Health check ready
- Security middleware ready
- Project structure organized
- Ready to start Phase 1 implementation

