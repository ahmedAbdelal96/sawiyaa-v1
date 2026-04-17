# Open Questions Master

آخر تحديث: 2026-04-09

## Product Questions
1. ما الصيغة النهائية المعتمدة في UX: `رحلتي` أم `رحلتي العلاجية` أم `رحلة الرعاية`؟
2. هل matching سيكون mandatory قبل الحجز أم optional؟
3. هل care-chat يدخل في MVP أو V1.5 إذا ضاق الوقت؟
4. ما أولوية assessments في الموبايل: مدخل أساسي أم مسار ثانوي؟

## Business Questions
1. هل الخدمة في V1 متمركزة على الدعم النفسي فقط أم تشمل مسارات wellness أوسع من البداية؟
2. هل هناك مناطق/أسواق مستهدفة أولية تؤثر على payment provider الافتراضي؟
3. ما SLA المتوقع للدعم داخل التطبيق؟
4. هل توجد متطلبات قانونية للغة طبية محددة في بعض الشاشات؟

## Backend Questions
1. ما contract الرسمي للـ payment deep-link return للموبايل؟
2. هل سيتم توفير endpoint صريح لـ push token registration؟
3. هل يوجد plan لواجهة end-user notifications feed؟
4. هل blockedReason في join contract سيبقى بنفس القيم أم متوقع توسعه قريبًا؟

## Frontend Questions
1. هل سيتم اعتبار web copy الحالي مرجعًا نهائيًا للغة المنتج أم سيتم تنفيذ موجة copy جديدة؟
2. ما الشاشات التي تعتبر prototype فقط رغم وجود route/API؟
3. هل هناك flows تعتمد على web-only behavior غير مناسب للموبايل (مثل redirect assumptions)؟

## Mobile Questions
1. هل الاختيار النهائي سيكون React Native أم Flutter (بما يتوافق مع الفريق الحالي)؟
2. ما analytics/events الدنيا المطلوبة في MVP؟
3. هل نحتاج offline behavior من V1 أم نؤجلها؟
4. هل يوجد شرط لاستخدام native video SDK مباشرة أم نكتفي join contract + web/session handoff؟

## UX / Terminology Questions
1. ما الكلمات المحظورة رسميًا في واجهة المستفيد؟
2. ما المصطلح العربي المعتمد لـ `Practitioner` عبر كل الشاشات؟
3. هل نريد tone رسمي طبي أم tone داعم هادئ في كل الرسائل؟
4. كيف نفرق لغويًا بين "الدعم العام" و"الرعاية المتخصصة" بدون التباس؟

