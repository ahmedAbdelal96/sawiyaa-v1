# Mobile App Roadmap (Proposed) - تطبيق المستفيد

آخر تحديث: 2026-04-09  
الحالة: مقترح قبل الاعتماد النهائي

## مبادئ حاكمة
1. صياغة المنتج: دعم/رعاية/عافية، وليس framing علاجي ضيق.
2. العقود التقنية الحالية (`patients/*`, `PATIENT`) تبقى كما هي حاليًا.
3. backend code هو source-of-truth عند التعارض مع docs.
4. التنفيذ موجّه لمطور واحد: نطاق صغير، سريع، قابل للإطلاق.

---

## Phase 0: Product Alignment / Discovery
### Goal
تثبيت قرارات المنتج والعقود الحرجة قبل كتابة كود الموبايل.

### Features/Outputs
- اعتماد glossary موحد (technical vs UX).
- تثبيت Mobile MVP scope.
- توثيق payment deep-link return contract.
- توثيق error/status matrix لمسارات auth/booking/payment/join.

### Dependencies
- Product sign-off
- Backend confirmation لعقد الدفع

### Excluded Scope
- أي تطوير UI production
- أي تكامل push فعلي

### Exit Criteria
- وثائق: `mobile_mvp_scope_ar.md` + `terminology_product_language_ar.md` معتمدة.
- agreement مكتوب لعقد payment return للموبايل.

---

## Phase 1: MVP Foundation
### Goal
تأسيس هيكل التطبيق القابل للتوسع مع auth/session stable.

### Features
- App architecture + feature modules.
- Navigation + route guards.
- Networking layer + interceptors + retry policy.
- Token/session management (access/refresh).
- i18n baseline (Arabic-first).
- Design tokens + core UI primitives.

### Dependencies
- auth endpoints (`/auth/patient/*`, `/auth/me`)
- `/users/me*`

### Excluded Scope
- booking/payment/session features
- care flows المعقدة

### Exit Criteria
- user can sign in/out/refresh reliably.
- bootstrap state يعمل بعد relaunch.

---

## Phase 2: Core Booking & Sessions
### Goal
تقديم رحلة القيمة الأساسية end-to-end: اختيار -> حجز -> دفع -> دخول جلسة.

### Features
- Discovery: specialties/practitioners/profile/availability windows.
- Guided matching baseline.
- Session create/list/detail/cancel.
- Payment initiate + return handling + payment state refresh.
- Runtime prepare/join + blocked reasons UX.

### Dependencies
- `/specialties`, `/public/practitioners*`
- `/matching/sessions*`
- `/patients/me/sessions*`
- `/patients/me/sessions/:id/payments/initiate`
- payment deeplink contract (من Phase 0)

### Excluded Scope
- push notifications الكاملة
- training/reviews/content الموسعة

### Exit Criteria
- completed paid booking from app.
- user can join eligible session from app.

---

## Phase 3: Programs / Tracking / Engagement
### Goal
رفع الاستمرارية بعد أول جلسة.

### Features
- Patient Journey screen.
- Assessments list/submit/history baseline.
- Support tickets baseline.
- Care chat text baseline.
- (اختياري) reviews baseline إذا الوقت يسمح.

### Dependencies
- `/patients/me/journey`
- `/assessments*` + `/patients/me/assessments*`
- `/patients/me/support/tickets*`
- `/patients/me/care-chat/*`

### Excluded Scope
- attachments in chat/support
- advanced notification center

### Exit Criteria
- user can track basic journey + reach support from app.

---

## Phase 4: Growth / Retention / Advanced Features
### Goal
تحسين retention والعمق التشغيلي بعد استقرار MVP.

### Features
- Push notifications + deep links.
- in-app notifications feed (إذا backend contract متاح).
- training/content/re-engagement flows.
- analytics funnels + experimentation hooks.

### Dependencies
- device registration + user notification endpoints
- analytics event taxonomy

### Excluded Scope
- admin/practitioner mobile apps
- heavy advanced ops

### Exit Criteria
- retention loops واضحة وقابلة للقياس.

---

## ترتيب التنفيذ المقترح (Single Developer)
1. Phase 0 (أسبوع)
2. Phase 1 (1-2 أسبوع)
3. Phase 2 (2-3 أسابيع)
4. Phase 3 (1-2 أسبوع)
5. Phase 4 (لاحقًا حسب نتائج MVP)

## مبرر هذا الترتيب
- يضمن تقليل المخاطر أولًا (alignment + payment contract).
- يطلق أسرع مسار قيمة تجاري.
- يؤجل العناصر عالية التكلفة/منخفضة اليقين لما بعد إثبات الـ MVP.

