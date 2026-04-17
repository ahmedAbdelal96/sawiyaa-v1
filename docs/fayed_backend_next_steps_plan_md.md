# Fayed — Backend Execution Order (Current Correct Path)

## الغرض
هذه الوثيقة تحدد **الترتيب الصحيح الذي نمشي به الآن في الباك إند** بناءً على:
- ما تم إنجازه فعليًا في المحادثة
- الـ backend roadmap الأصلية
- الرؤية الجديدة الخاصة بـ Care Experience Layer
- دراسة Shezlong وما أضافته من فرص Product واضحة

---

## 1) أين وصلنا الآن في الباك إند
بحسب ما تم إنجازه ومراجعته في المحادثة، تم الوصول إلى حالة قوية جدًا في الـ core backend.

### تم إنجازه فعليًا
- Auth / Identity baseline
- Practitioner onboarding + admin approval
- Public practitioners read API
- Specialties public/admin baseline
- Availability
- Presence
- Sessions
- Instant Booking
- Payments core
- Financial Rules
- Ledger / Wallet / Settlement baseline
- Logging baseline
- Reusable Verification / OTP capability
- OTP email delivery working in development

### النتيجة
هذا يعني أن:
- **Platform core الأساسي** أصبح موجودًا بدرجة كبيرة جدًا
- **Consultation engine** أصبح موجودًا
- **Finance backbone** أصبح موجودًا
- **Verification/security baseline** أصبح موجودًا

---

## 2) المبدأ الحاكم من الآن
لا نمشي بمنطق:
- "نخلص كل الخطة القديمة حرفيًا ثم نبدأ الجديدة"

ولا نمشي بمنطق:
- "نوقف القديم تمامًا ونقفز للرؤية الجديدة"

### القرار الصحيح
نمشي على خطين:

#### Track A — Finish Core Old Dependencies Only
نكمل فقط ما بقي من الخطة القديمة إذا كان **blocker حقيقي** للرؤية الجديدة.

#### Track B — Start Care Experience Backend Layer
نبدأ الموديولات/الطبقات الجديدة التي تضيف product leverage واضح:
- Guided Matching
- Assessments
- Support
- Patient Journey

---

## 3) ماذا من الخطة القديمة ما زال مهمًا الآن؟
ليس كل ما تبقى في roadmap القديمة يجب إنهاؤه قبل الجديد.

### ما أراه مهمًا الآن من القديم
1. **Refund workflow / refund posting hardening**
2. **Daily integration baseline** إذا كان ما زال غير مكتمل فعليًا
3. أي **critical hardening** للحجز/الدفع/الجلسات
4. critical tests where business risk is high

### ما لا أراه blocker الآن للرؤية الجديدة
- Training
- Full admin expansion
- Full content/editorial expansion
- Reviews phase بالكامل
- Notifications expansion الكاملة
- كل hardening النهائية قبل بدء product layer

---

## 4) ما الذي تضيفه الرؤية الجديدة على الباك إند؟
الرؤية الجديدة لا تضيف مجرد صفحات، بل تضيف **backend capabilities/flows** جديدة.

### A) Matching / Guided Matching
هذه **طبقة جديدة فعلًا** فوق directory والfilters.

#### المطلوب لاحقًا فيها
- intake answers
- preference normalization
- recommendation logic
- ranking/scoring
- matching explanation
- output suitable for frontend guided flow

### B) Assessments / Tests
هذه **موديول جديد فعليًا**.

#### المطلوب لاحقًا فيها
- tests definitions
- questions/options
- scoring
- result interpretation
- recommendation hooks
- patient assessment history

### C) Support
هذا ليس جديدًا بالكامل، لأنه موجود أصلًا في roadmap القديمة، لكن الآن أصبح **أعلى أولوية product-wise**.

#### المطلوب لاحقًا
- support ticket / conversation flow
- categories
- escalation path
- support tied to booking/payment/account issues

### D) Patient Journey Read Layer
ليس بالضرورة domain module ضخم من أول يوم، لكنه **read/orchestration layer** مهم جدًا.

#### المطلوب لاحقًا
- upcoming sessions
- past sessions
- tests taken
- recommendations / next actions
- payments snapshot
- rebooking / continuity signals

---

## 5) الترتيب الصحيح الذي نمشي به الآن

# Phase Now-1 — Close Critical Old-Core Gaps Only
### الهدف
إغلاق ما تبقى من الـ core القديم الذي يمكن أن يضر الرؤية الجديدة لو تُرك.

### الأولويات
1. Refund workflow / refund posting
2. Daily integration baseline (إن كان ما زال ناقصًا فعليًا)
3. Hardening critical للحجز/الدفع/الجلسات
4. أي contract tightening واضح ومؤثر

### ملاحظة
هذه المرحلة ليست لإعادة فتح كل roadmap القديمة، بل فقط لإغلاق **blockers الحقيقية**.

---

# Phase Now-2 — Guided Matching Module
### الهدف
بناء أول differentiator productي حقيقي فوق الـ practitioner marketplace.

### لماذا هذه أول خطوة جديدة؟
لأنها أعلى أثرًا على:
- conversion
- trust
- decision support
- تقليل التردد عند المستخدم

### ما سنبنيه backend-wise
- matching intake structure
- matching request/result models
- preference normalization
- scoring/recommendation engine baseline
- recommendation explanation/rationale
- practitioner recommendation output contract

### مخرجات المرحلة
- endpoint/service layer تغذي guided matching flow في الويب
- ranking/recommendation baseline واضحة وقابلة للتوسع

---

# Phase Now-3 — Assessments Module
### الهدف
تحويل الاختبارات إلى funnel + self-discovery + matching input.

### ما سنبنيه backend-wise
- assessments definitions
- questions/options
- scoring rules
- result generation
- category/type support
- patient saved results/history
- optional hooks إلى matching/recommendations

### لماذا تأتي بعد matching؟
لأن matching هو الأثر الأعلى مباشرة على conversion.
أما assessments فتعزز:
- trust
- lead quality
- self-understanding
- recommendation context

---

# Phase Now-4 — Support Module (Move Up in Priority)
### الهدف
جعل support جزءًا من المنتج نفسه، وليس مرحلة بعيدة فقط.

### ما سنبنيه backend-wise
- support ticket / conversation core
- issue categories
- statuses / assignment / escalation
- linkage to booking/payment/account contexts
- internal notes/support operations basics

### لماذا نقدمه الآن؟
لأن الرؤية الجديدة تعتبر support جزءًا من:
- trust
- conversion rescue
- product operations

---

# Phase Now-5 — Patient Journey Read Layer
### الهدف
إعادة تعريف patient area إلى "رحلتي العلاجية".

### ما سنبنيه backend-wise
- journey aggregation endpoint(s)
- upcoming sessions
- past sessions
- tests/results snapshot
- recommendations / next actions
- payment summary
- continuity / rebooking signals baseline

### مهم
هذا لا يجب أن يبدأ كـ giant domain module.
الأفضل أن يبدأ كـ **read-model/orchestration layer** فوق modules موجودة.

---

# Phase Later — Old Roadmap Modules That Continue Normally
بعد هذه المراحل، نرجع نكمل وفق الأولوية المناسبة من القديم والجديد معًا:
- Articles / Content integration
- Reviews / Ratings
- Admin Operations Expansion
- Training
- Notifications Expansion
- Full hardening/performance/search/observability

---

## 6) الترتيب التنفيذي المختصر المعتمد الآن

### الترتيب المقترح من الآن:
1. **Refund workflow / refund posting**
2. **Daily integration baseline** (إذا كان ناقصًا فعليًا)
3. **Guided Matching module**
4. **Assessments module**
5. **Support module**
6. **Patient Journey read layer**
7. ثم لاحقًا:
   - Articles integration
   - Reviews
   - Admin expansion
   - Training
   - broader hardening

---

## 7) كيف نعرف أننا نمشي صح؟
### أسئلة التحقق في كل مرحلة
- هل هذه الخطوة تزيل blocker حقيقي؟
- هل هذه الخطوة ترفع conversion أو trust أو retention بوضوح؟
- هل هذه الخطوة تبني capability جديدة أم فقط تفاصيل ثانوية؟
- هل هذه الخطوة تعتمد على شيء غير مستقر بعد؟

إذا كانت الإجابة:
- **نعم، تزيل blocker** → ننفذها أولًا
- **نعم، ترفع conversion/trust بوضوح** → تدخل مبكرًا
- **لا، مجرد تحسين جانبي** → تؤجل

---

## 8) القرار المعتمد
### لا ننتظر إنهاء كل roadmap القديمة حتى آخرها
### ولا نقفز إلى الرؤية الجديدة بلا ترتيب

## القرار النهائي:
1. **نغلق فقط ما بقي من old core الضروري**
2. **ثم نبدأ مباشرة بـ Guided Matching**
3. **ثم Assessments**
4. **ثم Support**
5. **ثم Patient Journey**

هذا هو الترتيب الأصح الآن معماريًا وproduct-wise.

---

## 9) أول خطوة مقترحة بعد هذه الوثيقة
### Backend-wise
أول module جديد أوصي أن نعرّفه ونخطط له من الآن هو:

# Guided Matching Module

لأنه:
- الأكثر اختلافًا مقارنة بالخطة القديمة
- الأعلى أثرًا على conversion
- الأكثر اتساقًا مع الرؤية الجديدة المستفادة من دراسة Shezlong

---

## 10) ملاحظة ختامية
هذه الخطة ليست بديلًا عن roadmap القديمة، بل هي:

# Overlay Execution Plan

يعني:
- نحافظ على platform core
- ونضيف فوقه Care Experience Layer بالترتيب الصحيح
- بدون تضخم backlog
- وبدون تأجيل القيمة productية الحقيقية إلى ما بعد كل شيء

