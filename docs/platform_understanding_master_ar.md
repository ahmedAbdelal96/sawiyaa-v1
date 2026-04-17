# وثيقة الفهم الشامل للمنصة (Master)

آخر تحديث: 2026-04-09  
نطاق التحقق: `docs/` + `fayed-backend-v1/` + `fayed-frontend-v1/`

## 1) ملخص المنصة
منصة Fayed هي منصة رعاية رقمية تربط بين المستفيدين ومقدمي الرعاية/المختصين عبر جلسات أونلاين، مع طبقة إرشاد واضحة (guided matching + assessments + journey + support) بدل الاكتفاء بنمط دليل/حجز تقليدي.

الرؤية المحدثة (من `docs/fayed_new_vision_plan.docx`) تؤكد أن القيمة الأساسية هي:
- تقليل الحيرة قبل الحجز.
- تقديم مسار قرار واضح من الاحتياج إلى الجلسة.
- دعم الاستمرارية بعد أول جلسة.

## 2) Personas / Roles
### Personas الأساسية
- مستفيد يبحث عن دعم/راحة/عافية (نفسي/لايف ستايل/متابعة).
- مختص (Practitioner) يدير بروفايله، توافره، جلساته، ومتابعة المالية.
- فريق تشغيلي/إداري (Admin / Support / Content Reviewer).

### Roles التقنية الفعلية
من الكود:
- `PATIENT`
- `PRACTITIONER`
- `ADMIN`
- `SUPER_ADMIN`
- `SUPPORT_AGENT`
- `CONTENT_REVIEWER`

مرجع:  
`fayed-backend-v1/prisma/schema.prisma` + `fayed-frontend-v1/src/config/route-access.ts`

## 3) Core Journeys (المسارات الجوهرية)
### Journey A: دخول وتثبيت الجلسة
`Auth -> Journey/Matching/Discovery -> Session Create -> Payment -> Runtime Join`

أدلة:
- Backend:
  - `auth/*` في `src/modules/auth/controllers/*.controller.ts`
  - `patients/me/journey` في `src/modules/patient-journey/controllers/patient-journey.controller.ts`
  - `matching/sessions` في `src/modules/matching/controllers/matching.controller.ts`
  - `patients/me/sessions` في `src/modules/sessions/controllers/patient-sessions.controller.ts`
  - `patients/me/sessions/:id/payments/initiate` في `src/modules/payments/controllers/patient-payments.controller.ts`
  - `patients/me/sessions/:id/runtime/*`
- Frontend:
  - صفحات patient routes في `src/app/[locale]/(patient)/patient/*`

### Journey B: المتابعة والاستمرارية
`Journey -> Sessions History -> Assessments History -> Support/Care Chat`

### Journey C: المسارات التشغيلية
`Admin moderation + finance ops + settlements + notifications diagnostics`

## 4) المجالات المنفذة فعليًا (Implemented Domains)
من `fayed-backend-v1/src/app.module.ts` + controllers:
- Auth, Users, Patients, Practitioners
- Matching, Assessments, Patient Journey
- Sessions, Instant Booking, Availability, Presence
- Payments, Financial Rules, Financial Operations
- Support, Care Chat, General Chat (backend-only product-wise)
- Reviews, Articles, Training
- Moderation, Notifications (ops-oriented), Settings, Specialties, Admin

## 5) Terminology Map (مختصر)
### تسمية تقنية داخلية (ثابتة الآن)
- `PATIENT`, `patients/me/*`, `PatientProfile`

### لغة UX/Product المقترحة
- `مستفيد` / `باحث عن دعم` / `رحلتي`
- تجنب تمركز لغة الواجهة حول "مريض" إلا عند الحاجة القانونية/السريرية الصريحة.

مهم: لا نكسر العقود التقنية الآن؛ الفصل يكون في طبقة المحتوى وواجهة المستخدم.

## 6) Source of Truth Rules
1. العقود الفعلية في backend controllers + DTOs هي المرجع الأول.
2. عند التعارض بين docs والكود: نعتمد الكود ونوثق التعارض.
3. frontend يعتبر مرجعًا قويًا لمسارات UX المنفذة، لكنه ليس مرجعًا وحيدًا لعقد API.
4. وثائق roadmap القديمة مرجعية تاريخية وليست دائمًا الحالة الحالية.

## 7) التحقق من baseline السابق (Phase A)
ملاحظة تشغيلية: لم يتم العثور داخل المستودع على ملفين بالاسم الحرفي:
- `Pasted markdown.md`
- `Pasted markdown (2).md`

تم الاعتماد كـ baseline عملي على:
- نتائج التحليل السابق في نفس جلسة العمل.
- الوثائق/الـ trackers المحدثة داخل المشروع (خصوصًا `backend-current-state-audit.md` و`fayed_master_system_gap_plan.md`).

### 7.1 نقاط مؤكدة (Confirmed)
- التحول إلى Guided Care Layer فوق الـ core صحيح ومؤكد بالكود.
- backend يحتوي أسطح تشغيلية واسعة تتجاوز توصيف roadmap القديم.
- frontend يحتوي patient/admin/practitioner flows فعلية، وليس مجرد skeleton.

### 7.2 نقاط تحتاج تصحيح (Corrected)
- توصيف "الموبايل لاحق جدًا بعد اكتمال كل الويب" لم يعد دقيقًا؛ يمكن بدء MVP موبايل الآن ضمن نطاق مضبوط.
- framing "patient-only treatment app" غير متوافق مع الرؤية الجديدة؛ الأفضل framing "تجربة دعم/رعاية موجهة".

### 7.3 نقاط غير مكتملة (Incomplete)
- Mobile push/device registration contracts غير مكتملة كواجهات API مخصصة.
- End-user notifications feed غير ظاهر كـ endpoint patient-first واضح.
- deep-link payment mobile return contract غير موحد كوثيقة تنفيذية.

### 7.4 وثائق تبدو outdated
- `docs/mobile_app_phases_roadmap_ar.md` (الصياغة والهيكلة القديمة M1..M13 ولغة "مريض").
- أجزاء من `docs/platform_foundation_blueprint_ar.md` مرتبطة بنموذج أقدم من auth/tenant.

## 8) الحالة الحالية للمشروع
- Backend: قوي وجاهز تشغيليًا لمعظم MVP الموبايل.
- Frontend: متقدم ويمثل مرجع UX عملي قابل لإعادة الاستخدام.
- التحدي الأكبر قبل الموبايل: توحيد لغة المنتج + تثبيت عقود mobile-specific (payments return/push/deeplink).

## 9) الخلاصة التنفيذية
المشروع جاهز لبدء Mobile MVP **بشرط** حسم 3 محاور قبل coding:
1. Product terminology contract (UX language).
2. Mobile payment/deeplink return contract.
3. Scope freeze واضح لـ V1 (بدون توسيع مبكر).

