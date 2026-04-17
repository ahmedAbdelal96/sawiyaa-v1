# Phase 1 Implementation Plan

## الهدف من Phase 1
الهدف من المرحلة الأولى هو تأسيس **الـ core access + onboarding + practitioner setup** بحيث يبقى عندنا أول جزء حقيقي شغال من المنصة يسمح بـ:

- تشغيل نظام المستخدمين
- تشغيل تسجيل ودخول العميل
- تشغيل تسجيل/تقديم المعالج
- تشغيل التحقق الأساسي والأمان
- تشغيل profiles
- تشغيل specialties
- تشغيل admin review flow للمعالج
- تشغيل config baseline وnotification baseline اللازمين لهذه المرحلة

يعني Phase 1 هدفها:
**تجهيز المدخل الرئيسي للمنصة، وليس تشغيل الجلسات بعد.**

---

## 1) ما الذي يدخل في Phase 1؟

### يدخل في Phase 1

#### Identity / Auth
- patient authentication
- practitioner authentication
- admin authentication baseline
- JWT access/refresh
- login sessions
- password reset baseline
- Google login للعميل
- practitioner password + OTP login

#### Profiles
- patient profile
- practitioner profile
- practitioner onboarding profile completion

#### Practitioner Onboarding
- practitioner application submit
- credentials upload
- application review
- approve / reject

#### Specialties
- specialty listing
- specialty category listing
- practitioner specialty assignment

#### Admin baseline
- admin approve/reject practitioner
- admin list applications
- admin view practitioner details

#### Config baseline
- config resolver service
- minimum config keys المطلوبة للمرحلة

#### Notifications baseline
- OTP notifications
- account-related notifications
- practitioner application submitted / approved / rejected notifications

### لا يدخل في Phase 1
- sessions booking
- availability management
- instant booking
- payments
- wallet / ledger
- articles
- chat
- reviews
- training
- advanced notifications
- support ticketing
- content moderation
- financial operations

---

## 2) الـ Deliverables النهائية للمرحلة

في نهاية Phase 1 لازم يكون عندك:

### للعميل
- يقدر يسجل
- يقدر يدخل
- يقدر يعمل profile أساسي

### للمعالج
- يقدر يعمل account
- يكمّل بياناته
- يرفع مستنداته
- يقدّم application
- يدخل بنظام password + OTP
- يظهر له status واضح لحالته

### للإدارة
- تقدر تشوف الطلبات
- تراجع بيانات المعالج
- توافق أو ترفض
- تدير specialties الأساسية

### للنظام
- notifications الأساسية شغالة
- config baseline موجود
- auth/security flow مستقر
- roles والصلاحيات الأساسية شغالة

---

## 3) المعمارية التنفيذية داخل كل Module

بما إنك قررت use-case based structure، فأنا أرشح النمط ده:

```text
modules/<module-name>/
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
  module.ts
```

### مبدأ مهم
- **Use case هو مكان business action**
- **Repository للتعامل مع Prisma**
- **Service فقط لما يكون فيه domain service أو helper مش use case مستقل**
- **Controller رفيع جدًا**
- **DTO للـ input validation فقط**
- **Policies للصلاحيات والقواعد**
- **Mapper لتحويل الـ data**
- **Presenter/serializer لو احتجت output shape منظم**

---

## 4) الموديولات التي سنبنيها في Phase 1

### A) Config Module (baseline first)
#### الهدف
- قراءة settings والقيم الأساسية
- resolver للسياسات والإعدادات
- abstraction موحد بدل hardcoded constants

#### المطلوب
- `ConfigResolverService`
- use cases للقراءة فقط في البداية
- helper methods مثل:
  - getRequiredString
  - getBoolean
  - getNumber
  - getJson
  - resolveByScope

#### لا نحتاج الآن
- admin UI كاملة لإدارة config
- advanced overrides UI

---

### B) Auth Module
#### المطلوب

##### Patient auth
- register with Google
- optional email/password baseline لو أردت لاحقًا
- login
- refresh token
- logout
- me endpoint

##### Practitioner auth
- register with email/password
- login step 1
- login step 2 OTP
- refresh token
- logout
- forgot/reset password

##### Admin auth baseline
- login
- refresh
- logout

#### use cases المقترحة

##### Patient
- `register-patient-with-google.use-case`
- `login-patient.use-case`
- `refresh-patient-token.use-case`
- `logout-patient.use-case`

##### Practitioner
- `register-practitioner-account.use-case`
- `login-practitioner-password.use-case`
- `verify-practitioner-login-otp.use-case`
- `request-practitioner-password-reset.use-case`
- `reset-practitioner-password.use-case`
- `refresh-practitioner-token.use-case`

##### Admin
- `login-admin.use-case`
- `refresh-admin-token.use-case`

##### Shared
- `issue-auth-tokens.use-case`
- `revoke-session.use-case`
- `hash-password.use-case`
- `verify-password.use-case`

#### repositories المطلوبة
- user repository
- auth identity repository
- otp repository
- user session repository
- user email repository
- user phone repository

---

### C) Users Module
#### الهدف
- current user data
- role reading
- session context
- user basics

#### use cases
- `get-current-user.use-case`
- `list-user-roles.use-case`
- `get-user-security-state.use-case`

---

### D) Patients Module
#### الهدف
إدارة patient profile

#### use cases
- `create-patient-profile.use-case`
- `get-patient-profile.use-case`
- `update-patient-profile.use-case`
- `complete-patient-onboarding.use-case`

#### endpoints المتوقعة
- `GET /patients/me`
- `PATCH /patients/me`

---

### E) Practitioners Module
#### الهدف
- practitioner profile
- profile completion
- public/professional data
- status visibility للإدارة

#### use cases
- `create-practitioner-profile.use-case`
- `get-practitioner-profile.use-case`
- `update-practitioner-profile.use-case`
- `set-practitioner-specialties.use-case`
- `submit-practitioner-application.use-case`
- `get-practitioner-application-status.use-case`
- `upload-practitioner-credential-metadata.use-case`
- `list-practitioner-credentials.use-case`

#### نقاط مهمة
- هنا لسه ما فيش schedule
- ما فيش sessions
- ما فيش pricing runtime
- فقط onboarding + profile readiness

---

### F) Specialties Module
#### الهدف
- public and admin management baseline للتخصصات

#### use cases
- `list-specialty-categories.use-case`
- `list-specialties.use-case`
- `get-specialty-by-slug.use-case`
- `create-specialty.use-case` (admin)
- `update-specialty.use-case` (admin)
- `toggle-specialty-status.use-case` (admin)

#### API جانب العميل/المعالج
- list specialties
- search/filter بسيط

---

### G) Admin Module (Phase 1 scope only)
#### الهدف
- practitioner review flow
- specialty management baseline
- basic admin access

#### use cases
- `list-practitioner-applications.use-case`
- `get-practitioner-application-details.use-case`
- `approve-practitioner-application.use-case`
- `reject-practitioner-application.use-case`
- `list-practitioners.use-case`
- `get-practitioner-admin-view.use-case`

#### لا يدخل الآن
- dashboard analytics كاملة
- financial admin
- content admin
- moderation admin الكامل

---

### H) Notifications Module (baseline only)
#### الهدف
تشغيل الإشعارات الأساسية المرتبطة بـ Phase 1

#### use cases
- `send-otp-notification.use-case`
- `send-practitioner-application-submitted-notification.use-case`
- `send-practitioner-application-approved-notification.use-case`
- `send-practitioner-application-rejected-notification.use-case`
- `send-password-reset-notification.use-case`

#### مهم
الـ notifications في المرحلة الأولى تكون:
- functional
- بسيطة
- غير معقدة

---

## 5) ترتيب التنفيذ داخل Phase 1

### Step 1 — Config baseline
ابدأ هنا أولًا علشان بقية الموديولات تعتمد عليه.

### الناتج
- config resolver شغال
- keys الأساسية موجودة
- defaults الأساسية جاهزة

### Step 2 — Auth core
### الناتج
- JWT
- sessions
- password hashing
- OTP logic
- Google login flow baseline
- auth guards الأساسية

### Step 3 — Users + Profiles
### الناتج
- patient profile
- practitioner profile
- basic current user flows

### Step 4 — Specialties
### الناتج
- specialties listing
- specialty assignment
- specialty management basic

### Step 5 — Practitioner onboarding
### الناتج
- application flow
- credentials metadata
- application status
- practitioner submission flow

### Step 6 — Admin review flow
### الناتج
- list pending applications
- approve/reject
- practitioner state changes

### Step 7 — Notifications baseline
### الناتج
- OTP notifications
- application lifecycle notifications
- password reset notifications

---

## 6) الـ API Scope المتوقع في Phase 1

### Auth APIs
- `POST /auth/patient/google`
- `POST /auth/patient/refresh`
- `POST /auth/patient/logout`
- `POST /auth/practitioner/register`
- `POST /auth/practitioner/login`
- `POST /auth/practitioner/login/verify-otp`
- `POST /auth/practitioner/refresh`
- `POST /auth/practitioner/logout`
- `POST /auth/practitioner/forgot-password`
- `POST /auth/practitioner/reset-password`
- `POST /auth/admin/login`
- `POST /auth/admin/refresh`
- `POST /auth/admin/logout`
- `GET /auth/me`

### Patient APIs
- `GET /patients/me`
- `PATCH /patients/me`

### Practitioner APIs
- `GET /practitioners/me`
- `PATCH /practitioners/me`
- `PUT /practitioners/me/specialties`
- `POST /practitioners/me/application/submit`
- `GET /practitioners/me/application`
- `POST /practitioners/me/credentials`

### Specialty APIs
- `GET /specialties`
- `GET /specialty-categories`
- `GET /specialties/:slug`

### Admin specialty APIs
- `POST /admin/specialties`
- `PATCH /admin/specialties/:id`
- `PATCH /admin/specialties/:id/toggle-status`

### Admin practitioner review APIs
- `GET /admin/practitioner-applications`
- `GET /admin/practitioner-applications/:id`
- `POST /admin/practitioner-applications/:id/approve`
- `POST /admin/practitioner-applications/:id/reject`

---

## 7) الـ DTO Scope في المرحلة
لكل use case لازم DTO واضح ومدخلات نظيفة.

### أمثلة DTOs
- practitioner register dto
- practitioner login dto
- verify otp dto
- patient profile update dto
- practitioner profile update dto
- specialty assignment dto
- practitioner application submit dto
- approve/reject application dto

---

## 8) الـ Guards / Policies المطلوبة

### Guards
- access token auth guard
- role guard
- practitioner approved guard (لاحقًا لبعض الأجزاء)
- admin guard

### Policies
- من يقدر يراجع application
- من يقدر يعدل specialties
- من يقدر يقدّم application
- متى يعتبر practitioner account ready for submission
- متى يسمح بالـ OTP channel

---

## 9) الـ Repositories المطلوبة
- user repository
- auth identity repository
- user session repository
- otp challenge repository
- patient profile repository
- practitioner profile repository
- practitioner application repository
- practitioner credential repository
- specialty repository
- specialty category repository
- config repository
- notification repository

---

## 10) الـ Events الداخلية المهمة
- practitioner-registered
- practitioner-login-otp-requested
- practitioner-application-submitted
- practitioner-application-approved
- practitioner-application-rejected
- password-reset-requested

ودي مهمة علشان:
- notifications
- audit
- future extensibility

---

## 11) الـ Output المطلوب من Phase 1

### سيناريو العميل
- العميل يقدر يدخل للنظام
- عنده profile

### سيناريو المعالج
- يسجل
- يدخل
- يثبت OTP
- يكمل profile
- يختار specialties
- يرفع أوراقه
- يقدم application
- يعرف حالتها

### سيناريو الإدارة
- تدخل
- تشوف الطلبات
- تراجع
- توافق أو ترفض

---

## 12) ما الذي لا نفعله في Phase 1
- لا نبني sessions
- لا نبني payments
- لا نبني wallet
- لا نبني articles
- لا نبني chats
- لا نبني reviews
- لا نبني training
- لا نبني dashboards كاملة
- لا نبني advanced analytics
- لا نبني provider integrations الكاملة غير ما يلزم auth/notifications baseline

---

## 13) معايير انتهاء المرحلة (Definition of Done)
تعتبر Phase 1 مكتملة إذا:
- auth flows الأساسية شغالة
- OTP للمعالج شغال
- Google login baseline للعميل شغال
- patient profile شغال
- practitioner profile شغال
- specialties شغالة
- application submit شغال
- admin approve/reject شغال
- notifications الأساسية شغالة
- validation + guards + error handling موجودة
- tests الأساسية للـ critical use cases موجودة

---

## 14) المخاطر التي يجب الانتباه لها في Phase 1
- Google auth integration decisions
- OTP provider decision
- password reset security
- file upload strategy للمستندات
- practitioner verification status transitions
- roles & permissions boundaries
- duplicate account prevention
- locale defaults
- slug generation for specialties

---

## 15) القرار المعماري النهائي للمرحلة
Phase 1 ستبنى على:
- **Use-case based architecture**
- **Repository per domain concern**
- **Thin controllers**
- **Policies منفصلة**
- **DTOs واضحة**
- **No giant service files**
- **No premature business module coupling**

---

## 16) الخطوة التالية بعد هذه الخطة
بعد اعتماد الخطة:
1. نعمل **Roadmap كاملة للنظام كله**  
   `Phase 1 / Phase 2 / Phase 3 / ...`
   وتشمل:
   - backend
   - frontend
   - mobile

2. وبعدها نرجع نشتغل **موديول بموديول**  
   ونحلله كويس قبل كتابة أي كود.
