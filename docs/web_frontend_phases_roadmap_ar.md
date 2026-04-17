# Web Frontend Roadmap — Phases Plan

## الهدف
هذا الملف يحدد roadmap كاملة للويب:
- public website
- patient web app
- practitioner dashboard
- admin dashboard (web)

> الخطة هنا خاصة بالويب فقط، وليس الموبايل.

---

# المبادئ العامة للويب
- Web أولًا
- Shared design system
- i18n من البداية (Arabic / English)
- SEO مهم جدًا في:
  - public pages
  - practitioners
  - articles
  - courses
- dashboards منفصلة منطقيًا ولو داخل نفس codebase
- لا نبني UI كاملة قبل استقرار الـ backend contracts

---

# Phase 1 — Public Access + Auth Entry Points

## الهدف
بناء الأساس المرئي للمنصة.

## يشمل
### Public pages
- home page
- about
- how it works
- contact
- terms / privacy
- specialties listing baseline

### Auth entry points
- auth entry chooser page
- patient dedicated sign-in/register pages
- practitioner dedicated sign-in/register/apply pages
- admin dedicated sign-in page

### Shared infrastructure
- routing baseline
- i18n baseline
- theme tokens
- layout system
- form system baseline
- validation integration

## الناتج النهائي
- web shell جاهز
- public presence موجودة
- auth entry points شغالة

---

# Phase 2 — Patient Web App Baseline

## الهدف
تشغيل أول مساحة للعميل على الويب.

## يشمل
- patient profile page
- account settings baseline
- auth state integration
- current user shell
- notifications in-app baseline
- specialty browsing
- practitioner browsing baseline

## الناتج النهائي
- العميل يقدر يدخل ويشوف حسابه
- يقدر يستعرض التخصصات والمعالجين

---

# Phase 3 — Practitioner Dashboard Baseline

## الهدف
تشغيل أول نسخة من dashboard المعالج.

## يشمل
- practitioner profile setup
- specialty assignment UI
- application status page
- credentials upload UI
- onboarding checklist
- security settings baseline
- OTP flow UX

## الناتج النهائي
- المعالج يقدر يكمل onboarding كامل من الويب

---

# Phase 4 — Admin Dashboard Baseline

## الهدف
تشغيل لوحة إدارة أولية.

## يشمل
- admin auth shell
- practitioner applications list
- practitioner application details
- approve/reject flow
- specialties management baseline

## الناتج النهائي
- الإدارة تراجع وتوافق وترفض من الويب

---

# Phase 5 — Session Booking UX

## الهدف
تشغيل الواجهة العلاجية الأساسية.

## يشمل
### Public/Patient
- practitioner profile public page
- schedule viewer
- slot selection
- session type selection
- booking flow
- instant booking request flow

### Practitioner
- availability management UI
- presence / online toggle
- session requests view
- upcoming sessions view

## الناتج النهائي
- العميل يحجز من الويب
- المعالج يدير الجدول والحالة

---

# Phase 6 — Payment UX

## الهدف
تشغيل تجربة الدفع على الويب.

## يشمل
- checkout pages
- payment pending / success / failed screens
- coupon entry UI
- booking confirmation page
- payment history baseline

## الناتج النهائي
- العميل يدفع ويكمل الحجز
- تدفق الدفع واضح بصريًا

---

# Phase 7 — Session Join Experience

## الهدف
تشغيل تجربة دخول الجلسة.

## يشمل
- upcoming session page
- join window UX
- Daily session pre-join checks
- audio/video permissions UX
- session status indicators
- missed/expired session states

## الناتج النهائي
- العميل والمعالج يقدروا ينضموا للجلسة من الويب بسلاسة

---

# Phase 8 — Wallet / Earnings / Finance Dashboards

## الهدف
تشغيل الواجهات المالية.

## يشمل
### Practitioner
- wallet summary
- transactions list
- monthly settlements view
- coupon management UI

### Admin
- commission views
- settlement overview
- payout tracking pages

## الناتج النهائي
- المعالج والإدارة يشوفوا الجانب المالي من الويب

---

# Phase 9 — Articles / Content Web Experience

## الهدف
تشغيل المحتوى على الويب.

## يشمل
### Public
- articles listing
- article details
- article categories pages
- article tags navigation
- SEO pages

### Practitioner/Admin
- article editor baseline
- draft management
- review workflow UI
- moderation actions UI

## الناتج النهائي
- المحتوى يظهر للعامة
- فريق العمل يقدر يديره من الويب

---

# Phase 10 — Chat / Support Web Experience

## الهدف
تشغيل التواصل النصي على الويب.

## يشمل
### Patient / Practitioner
- support conversations UI
- care chat UI
- conversation list
- message thread UI
- attachment baseline

### Admin / Support
- support ticket queue
- ticket details
- internal notes
- approval requests UI
- moderation review UI

## الناتج النهائي
- الدعم والشات الموافق عليه يشتغلان على الويب

---

# Phase 11 — Reviews / Ratings Web Experience

## الهدف
تشغيل التقييمات على الويب.

## يشمل
- rate session modal/page
- published reviews on practitioner profile
- admin moderation UI for text reviews

## الناتج النهائي
- التقييمات تصبح جزءًا من تجربة الويب

---

# Phase 12 — Training / Courses Web Experience

## الهدف
تشغيل الكورسات الحية على الويب.

## يشمل
### Public
- training landing pages
- courses listing
- course details
- category pages
- SEO pages

### User
- enrollment flow
- course schedule display
- session join info
- attendance visibility baseline

### Admin/Owner
- course management
- schedule management
- enrollments list
- attendance management

## الناتج النهائي
- التدريب يظهر ويباع ويدار من الويب

---

# Phase 13 — Design System / Performance / SEO Hardening

## الهدف
تقوية جودة المنتج على الويب.

## يشمل
- design system consolidation
- accessibility pass
- performance optimizations
- image optimization
- SEO improvements
- structured metadata
- analytics hooks
- error states polishing

## الناتج النهائي
- تجربة ويب ناضجة وقابلة للإطلاق بقوة

---

# ترتيب التنفيذ المقترح
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 9
9. Phase 10
10. Phase 11
11. Phase 12
12. Phase 8
13. Phase 13

> قد تؤجل Phase 8 المالية UI قليلًا إذا لم تكن ضرورية للإطلاق الأول.

---

# ملاحظات مهمة
- لا تبنِ dashboards كاملة قبل استقرار APIs
- public SEO pages مهمة من البداية
- practitioner dashboard وadmin dashboard يفضل بناؤهما modular
- لا تخلط categories الخاصة بالمقالات مع الكورسات أو التخصصات في الواجهة
