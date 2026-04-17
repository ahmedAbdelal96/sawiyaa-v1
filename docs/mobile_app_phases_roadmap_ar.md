# Mobile App Roadmap - تطبيق المستفيد (Aligned)

آخر تحديث: 2026-04-09  
الحالة: نسخة محدثة معتمدة على الكود الحالي والرؤية الجديدة

## لماذا تحديث هذه الوثيقة؟
- التخلص من framing "تطبيق مريض" كتصور منتج رئيسي.
- مواءمة roadmap مع الواقع الفعلي في backend/frontend.
- تحديد MVP واقعي لمطور واحد.

## مبدأ أساسي
التسمية التقنية الحالية (`PATIENT`, `patients/me/*`) **تبقى** بدون تغيير الآن.  
تحسين اللغة يكون في طبقة UX/Product copy.

---

## Phase 0: Product Alignment / Discovery
### Goal
تثبيت القرارات الحاسمة قبل أي coding للموبايل.

### Features
- توحيد terminology (Technical vs UX).
- تثبيت MVP scope النهائي.
- توثيق payment return/deeplink contract.
- توثيق حالات الأخطاء/الانتقالات الحرجة.

### Dependencies
- Product sign-off
- Backend sign-off على payment return

### Excluded Scope
- بناء شاشات production
- push implementation

### Exit Criteria
- وثائق scope/terminology/api جاهزة ومعتمدة.

---

## Phase 1: MVP Foundation
### Goal
تأسيس التطبيق تقنيًا مع auth/session stable.

### Features
- Architecture + feature modules baseline.
- Navigation + guards.
- Networking + interceptors + retry.
- Auth/session lifecycle (access/refresh/logout).
- i18n baseline (Arabic-first).
- Core design system primitives.

### Dependencies
- `/auth/patient/*`, `/auth/me`, `/users/me*`

### Excluded Scope
- booking/payment/runtime

### Exit Criteria
- تسجيل دخول/خروج/استعادة جلسة يعمل بثبات.

---

## Phase 2: Core Booking & Sessions
### Goal
تفعيل المسار الأساسي: اختيار مختص -> حجز -> دفع -> دخول جلسة.

### Features
- Discovery flows (specialties, practitioners, profile, availability).
- Guided matching baseline.
- Sessions create/list/detail/cancel.
- Payment initiate + return + status sync.
- Runtime prepare/join UX.

### Dependencies
- `/specialties`, `/public/practitioners*`
- `/matching/sessions*`
- `/patients/me/sessions*`
- `/patients/me/sessions/:id/payments/initiate`

### Excluded Scope
- push center
- training lanes

### Exit Criteria
- user can complete paid booking and join session from app.

---

## Phase 3: Programs / Tracking / Engagement
### Goal
تعزيز الاستمرارية وتجربة المتابعة.

### Features
- Journey summary (`/patients/me/journey`).
- Assessments baseline.
- Support tickets baseline.
- Care-chat text baseline.
- Reviews baseline (اختياري حسب السعة).

### Dependencies
- journey/assessments/support/care-chat endpoints الحالية

### Excluded Scope
- attachments chat/support
- advanced notification feed

### Exit Criteria
- user can follow journey + request support without leaving app.

---

## Phase 4: Growth / Retention / Advanced Features
### Goal
تحسين retention والتوسع بعد إثبات MVP.

### Features
- Push notifications + deep links.
- User notifications feed (عند جاهزية backend contract).
- Content/training expansion.
- Advanced analytics + retention nudges.

### Dependencies
- push token/device contract
- notifications read APIs

### Excluded Scope
- admin/practitioner mobile apps

### Exit Criteria
- retention features قابلة للقياس وتشغل دورة نمو مستقرة.

---

## نطاق MVP المعتمد (مختصر)
داخل MVP:
- Auth
- Discovery + Matching
- Booking + Payment
- Session Runtime
- Journey baseline
- Support/Care chat baseline

خارج MVP:
- mobile apps للأدوار الأخرى
- advanced notification center
- heavy training/programs

## مخاطر يجب مراقبتها
1. غموض payment return on mobile.
2. غياب push/device APIs واضحة.
3. drift لغوي بين copy والـ enums الداخلية.
4. توسعة scope خارج MVP.

