# Mobile Build Handoff

آخر تحديث: 2026-04-09

## 1) Platform One-Paragraph Summary
سويّة منصة رعاية رقمية موجهة تربط المستفيدين بالمختصين عبر جلسات أونلاين، مع مسار منتجي يتجاوز "الحجز فقط" إلى تجربة guided care تشمل التوجيه للمختص المناسب (matching)، التقييمات الأولية (assessments)، رحلة متابعة (journey)، والدعم التشغيلي (support/care chat)، مع بنية backend قوية ومتكاملة عبر auth/sessions/payments/operations.

## 2) Final Recommended Mobile Direction
ابدأ بتطبيق مستفيد فقط (Single-app MVP) يركز على مسار القيمة الكامل:  
`Auth -> Matching/Discovery -> Booking -> Payment -> Session Join -> Journey/Support`  
مع تأجيل أي توسعات غير حرجة (push advanced, training depth, admin/practitioner mobile apps).

## 3) Top 10 Validated Findings
1. backend ليس مجرد baseline؛ يحتوي domains تشغيلية واسعة فعلية.
2. guided matching + patient journey موجودان فعليًا في API.
3. booking/session runtime contracts جاهزة للموبايل.
4. payment initiation موجود ويعيد checkout/client payloads.
5. support/care-chat baseline نصي جاهز.
6. frontend الحالي مرجع UX قوي لمسارات patient/app behavior.
7. terminology الحالية في الكود patient-centric تقنيًا.
8. الرؤية الجديدة تدفع نحو لغة UX داعمة لا طبية ثقيلة.
9. roadmap الموبايل القديمة كانت طويلة ومجزأة وغير متسقة مع الرؤية الحالية.
10. أكبر blockers للموبايل ليست core APIs بل mobile-operational contracts (push/deeplink).

## 4) Top 10 Immediate Actions
1. اعتماد glossary المصطلحات (technical vs UX).
2. تثبيت MVP scope رسميًا ومنع توسعة النطاق.
3. توثيق payment deeplink return contract.
4. تحديد سياسة refresh/auth failure UX للموبايل.
5. بناء architecture foundation للموبايل (modules + network + state).
6. تنفيذ auth/bootstrap كامل.
7. تنفيذ discovery + matching baseline.
8. تنفيذ booking + payment + runtime join.
9. تنفيذ journey + support baseline.
10. تجهيز telemetry أساسي لقياس conversion من matching إلى booking.

## 5) First Implementation Sprint Recommendation
Sprint 1 (5-7 أيام):
- Project skeleton + architecture
- Networking layer + auth token handling
- Login/register/refresh/logout
- Bootstrap user/journey mini home
- Error handling + loading/empty states

Definition of Done:
- مستخدم يسجل دخولًا ناجحًا ويعود للجلسة بعد إغلاق التطبيق.
- شاشة landing داخلية مرتبطة بـ `/patients/me/journey`.

## 6) Backend Changes Required Before Coding (or parallel early)
1. Contract واضح لـ payment return/deeplink.
2. Endpoint(s) لـ push token registration (حتى لو post-MVP, but spec now).
3. توثيق رسمي لحالات error/status الأكثر تأثيرًا على الموبايل.

## 7) Risks for Single Developer (Backend + Frontend + Mobile)
1. تبديل السياق العالي يبطئ الإنجاز إذا scope غير مجمّد.
2. أي تغييرات backend غير منسقة تضرب إيقاع mobile sprint.
3. التأخر في حسم terminology يؤدي لإعادة عمل UX واسعة.
4. تعقيد الدفع/redirect قد يستهلك وقتًا أكبر من المتوقع.
5. فتح مسارات ثانوية مبكرًا (training/content/advanced notifications) يهدد إطلاق MVP.
