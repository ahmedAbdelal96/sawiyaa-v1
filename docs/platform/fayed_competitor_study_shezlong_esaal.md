# دراسة منافسين: Shezlong و Esaal وتأثيرها على Fayed

**المشروع:** Fayed Healthcare Platform  
**إعداد:** دراسة عمل تنفيذية لاستخدامها كمرجع داخل المشروع  
**تاريخ الإعداد:** 2026-05-23  
**المنافسون الأساسيون:**  
- Shezlong — https://www.shezlong.com/  
- Esaal — https://esaal.me/home  

---

## 0) هدف الدراسة

هذه الدراسة ليست مجرد مقارنة شكلية بين مواقع. الهدف هو فهم المنافسين كـ **منتجات تشغيلية وتجارية**:

- كيف يضع كل منافس نفسه في السوق؟
- كيف يدخل المستخدم إلى المنصة؟
- كيف يختار المعالج أو الخبير؟
- كيف يتم الحجز والدفع؟
- كيف تُعرض الثقة والخصوصية؟
- ما دور الموبايل؟
- ما دور الدعم؟
- ما الذي يجب على Fayed أن يتفوق فيه؟
- ما الخطوات العملية التي يجب تثبيتها قبل أي تعديل كود؟

الدراسة مبنية على:
1. المصادر الرسمية العامة المتاحة وقت الإعداد.
2. وثائق Fayed الداخلية التي تؤكد أن المنصة ليست مجرد حجز، بل Care Experience + Platform Core.
3. قراءة المنتج من زاوية: business + UX + operations + architecture.

> ملاحظة مهمة: أي أرقام تسويقية ظاهرة على مواقع المنافسين أو المتاجر قد تتغير مع الوقت. لذلك نستخدمها كمؤشرات اتجاه، لا كأرقام مالية أو تشغيلية نهائية.

---

## 1) الملخص التنفيذي

### Shezlong

Shezlong منافس قوي جدًا في مجال العلاج النفسي العربي أونلاين. قوته ليست في وجود فيديو كول فقط، بل في بناء **Managed Mental Health Marketplace** حول الجلسة:

- علاج نفسي أونلاين.
- معالجون مرخصون.
- أدوات اختيار ومطابقة.
- ملفات معالجين غنية.
- حجز من جدول المعالج.
- جلسات فورية.
- سياسات إلغاء واسترداد واضحة.
- دعم كجزء من التشغيل.
- محتوى واختبارات.
- توجه حالي نحو wellness وAI وB2B.

### Esaal

Esaal أوسع من Shezlong. هو منصة health & wellness متعددة التخصصات:

- طبي.
- نفسي.
- تغذية.
- فيديو.
- صوت.
- نص.
- باقات.
- محفظة.
- تطبيق موبايل قوي.
- AI assistant باسم Healia حسب صفحة Google Play.
- خبراء في مجالات متعددة.

قوته في الاتساع وسهولة الدخول إلى الاستشارة، لكن اتساعه قد يسبب زحمة وفقدان وضوح في الرحلة مقارنة بمنصة أكثر تركيزًا.

### فرصة Fayed

أفضل فرصة لـ Fayed ليست تقليد أحدهما. الأفضل هو:

> أخذ عمق الثقة والتشغيل من Shezlong، وسهولة الدخول واتساع الخدمة من Esaal، ثم تقديم تجربة أبسط وأهدأ وأكثر وضوحًا، مع دقة أعلى في البيانات والمال والجلسات والشات.

---

## 2) مبادئ Fayed التي يجب أن تحكم الدراسة

قبل مقارنة المنافسين، لازم نثبت المبادئ التي يجب ألا نكسرها في Fayed.

### 2.1 Fayed ليست MVP صغير

Fayed تُبنى كمنصة طويلة العمر، قابلة للتطوير المستمر، وليست نسخة مؤقتة. هذا يعني:

- لا hardcoded business rules.
- لا hardcoded currencies.
- لا UI تعرض بيانات غير مؤكدة.
- لا بناء شاشة جميلة فوق عقد API غير مستقر.
- لا خلط frontend/backend/mobile/admin في phase واحدة إلا للضرورة.
- كل قرار يجب أن يخدم التوسع لاحقًا.

### 2.2 الكود والعقود هي مصدر الحقيقة

عند التعارض بين وثيقة قديمة والكود الحالي، الكود هو المرجع. لكن أي اختلاف مهم يجب توثيقه.

### 2.3 تجربة المستخدم جزء من الثقة

المستخدم في منصة رعاية لا يقيسك فقط باللون أو الشكل. يقيسك بـ:

- هل فاهم هو فين؟
- هل يعرف من المعالج؟
- هل يعرف موعد الجلسة؟
- هل يعرف هل يقدر يدخل الآن؟
- هل يعرف هل يقدر يلغي؟
- هل يعرف المال ذهب أين؟
- هل الشات متاح أم لا ولماذا؟
- هل الدعم موجود وقت المشكلة؟

### 2.4 الموبايل قناة رئيسية

بالنسبة للمريض، الموبايل غالبًا هو سطح الاستخدام الأهم. لذلك يجب ألا يكون تطبيق الموبايل نسخة ناقصة أو مجرد wrapper. أهم مساراته:

- التسجيل والدخول.
- اختيار المعالج.
- الحجز.
- الدفع.
- session detail.
- الانضمام للجلسة.
- الشات.
- الدعم.
- المحفظة والمدفوعات.
- الإشعارات.

### 2.5 التصميم: Clinical Warmth

Fayed يجب أن يشعر بأنه:

- طبي/رعائي.
- هادئ.
- موثوق.
- إنساني.
- غير مزدحم.
- غير SaaS مبهرج.
- عربي أولًا مع RTL مضبوط.

---

# الجزء الأول: دراسة Shezlong

## 3) تموضع Shezlong

Shezlong تضع نفسها كمنصة علاج نفسي أونلاين. موقعها الجديد يركز على:

- Online therapy.
- Licensed therapists.
- Confidential support.
- Mental health journey.
- Flourish Planner.
- B2B.
- Online events.

هذا يعني أن Shezlong لم تعد تقدم نفسها فقط كحجز جلسة، بل كمنظومة mental wellness أوسع.

### الاستنتاج لـ Fayed

Fayed لا يجب أن يكون “حجز جلسة” فقط. يجب أن يظهر للمستخدم كرحلة رعاية منظمة:

- أساعدك تختار.
- أوضح لك الخطوة التالية.
- أدير الجلسة والدفع.
- أتابع معك بعد الجلسة.
- أوفر دعم وقت المشكلة.

---

## 4) رحلة اختيار المعالج في Shezlong

Shezlong توفر عدة طرق لاختيار المعالج:

1. أداة “توصل للمعالج المناسب”.
2. فلاتر حسب التخصص واللغة وغيرها.
3. صفحة شخصية للمعالج تعرض المؤهلات والخبرة والتعليقات.
4. دعم العملاء للمساعدة في الترشيح.

### قراءة Product

هذه النقطة جوهرية جدًا. المستخدم في الصحة النفسية غالبًا لا يعرف بالضبط من يحتاج. لو تركته أمام قائمة طويلة من المعالجين فقط، قد يتردد أو يخرج.

Shezlong تعالج هذا بـ decision support:

- لو المستخدم يعرف ما يريد: يستخدم البحث والفلاتر.
- لو المستخدم متردد: يستخدم matching.
- لو لا يزال محتارًا: يتواصل مع الدعم.

### فرصة Fayed

Fayed يجب أن يجعل guided matching core differentiator، وليس feature جانبية.

الحد الأدنى المطلوب في Fayed:

- أسئلة قصيرة جدًا.
- لغة إنسانية.
- لا تشخيص طبي مباشر.
- نتيجة واضحة: “بناءً على إجاباتك، هذه الاختيارات قد تناسبك”.
- سبب مختصر لكل ترشيح.
- CTA مباشر للحجز.
- خيار دعم لو المستخدم لا يزال غير متأكد.

---

## 5) صفحة المعالج في Shezlong

صفحة المعالج عند Shezlong ليست مجرد profile. هي صفحة بيع وثقة وتشغيل في نفس الوقت.

عادةً تعرض:

- اسم المعالج وصورته.
- التخصص.
- الخبرات.
- المؤهلات.
- التقييمات.
- تعليقات العملاء.
- السعر.
- مدة الجلسة.
- الجدول.
- زر الحجز.

### قراءة UX

المستخدم لا يحجز بسبب الاسم فقط. المستخدم يحتاج إشارات ثقة:

- هل هذا الشخص مؤهل؟
- هل تعامل مع حالات مشابهة؟
- هل الآخرون قيّموه جيدًا؟
- متى أقرب موعد؟
- كم السعر؟
- هل أستطيع الحجز الآن؟

### فرصة Fayed

صفحة practitioner في Fayed يجب أن تكون:

- واضحة ومقنعة.
- غير مزدحمة.
- تعرض الثقة أولًا.
- تعرض السعر والعملة من backend.
- تعرض التوافر بطريقة سهلة.
- تعرض CTA واحد واضح.
- لا تكرر معلومات بلا قيمة.
- لا تستخدم raw enums.
- تدعم Arabic RTL وEnglish LTR.

---

## 6) الحجز في Shezlong

رحلة الحجز من الجدول:

1. يدخل المستخدم على صفحة المعالج.
2. يضغط اختيار موعد.
3. يختار مدة الجلسة.
4. يختار الموعد المناسب.
5. يضغط حجز.
6. يختار وسيلة الدفع.
7. بعد الدفع تظهر الجلسة في صفحة “علاجي”.

### الاستنتاج

صفحة الجلسات ليست مجرد history. هي نقطة تشغيل مركزية:

- منها يرى المستخدم الجلسة.
- منها ينضم.
- منها يلغي أو يعيد الجدولة.
- منها يفهم حالة الجلسة.

### فرصة Fayed

Patient sessions + session detail في Fayed يجب أن يجيبوا بسرعة:

- من المعالج؟
- متى الجلسة؟
- ما الحالة؟
- هل يمكن الدخول؟
- هل يمكن الشات؟
- هل يمكن الإلغاء؟
- ما نتيجة الدفع أو الاسترداد؟

---

## 7) الجلسة الفورية في Shezlong

Shezlong لديها جلسة فورية رغم أن الحجز الطبيعي يجب أن يكون قبل الموعد بوقت كافٍ.

منطق الجلسة الفورية:

- المستخدم يختار معالج متصل الآن.
- يختار بدء الجلسة.
- يدفع.
- المعالج يوافق خلال مدة قصيرة.
- تبدأ الجلسة من صفحة الجلسات.

### قراءة Business

الجلسة الفورية مهمة لأنها تخدم المستخدم الذي يحتاج دعمًا سريعًا. لكنها عالية المخاطر تشغيلًا لأنها تحتاج:

- presence حقيقي.
- availability حقيقي.
- مهلة قبول.
- مهلة دفع.
- fallback لو لم يقبل المعالج.
- دعم لو فشل الدفع أو انقطعت الحالة.

### فرصة Fayed

لو Fayed يدعم instant booking، لازم يكون مبنيًا على:

- Presence منفصل عن availability.
- Policy واضحة.
- State machine للجلسة أو الطلب.
- شاشة تشرح للمستخدم ما يحدث.
- عدم حجز أموال أو عرض حالة مضللة.
- إشعارات فورية للمريض والمعالج.

---

## 8) الانضمام للجلسة في Shezlong

Shezlong تعرض زر الانضمام قبل الموعد بـ 10 دقائق. وتطلب صلاحيات المايك والكاميرا حتى لو المستخدم سيغلق الكاميرا لاحقًا.

### قراءة UX

هذه شاشة شديدة الحساسية. أي غموض هنا قد يؤدي إلى:

- ضياع جلسة.
- شكوى.
- refund dispute.
- فقدان ثقة.

### فرصة Fayed

Session join في Fayed يجب أن يتضمن:

- متى يفتح زر الانضمام.
- لماذا غير متاح الآن.
- فحص مايك/كاميرا قبل الدخول.
- دعم واضح لو حدثت مشكلة.
- عدم عرض technical error للمريض.
- عدم إظهار Daily/internal provider details بلا حاجة.
- تجربة موبايل قوية لأن معظم المستخدمين سيدخلون من الهاتف.

---

## 9) الكاميرا والصوت في Shezlong

Shezlong تفضل الجلسة الصوتية والمرئية، لكنها تسمح بجلسة صوت فقط بعد الاتفاق مع المعالج.

### الاستنتاج

المنتج الأساسي هو video/audio therapy، وليس text-only therapy. النص موجود كأداة مساعدة وليس العلاج الأساسي.

### فرصة Fayed

Fayed يجب أن يفرق بوضوح بين:

- Session video/audio.
- Session chat.
- Care/support chat.

ولا يجب أن تختلط المصطلحات على المستخدم.

---

## 10) سياسة الإلغاء في Shezlong

سياسة Shezlong للجلسات العادية:

- حد أربعة إلغاءات كل 30 يومًا.
- قبل 12 ساعة أو أكثر: استرداد كامل.
- بين 12 و6 ساعات: استرداد 75%.
- بين 6 و3 ساعات: استرداد 50%.
- أقل من 3 ساعات: لا استرداد.

### قراءة Product

الإلغاء ليس مجرد زر. هو policy-driven flow:

- يحمي وقت المعالج.
- يقلل النزاعات.
- يجعل المال مفهومًا.
- يقلل ضغط الدعم.

### فرصة Fayed

Cancel modal في Fayed يجب أن يعرض قبل التأكيد:

- هل الإلغاء مسموح؟
- سبب السماح أو المنع.
- نسبة الاسترداد.
- مبلغ الاسترداد.
- العملة.
- هل سيذهب للمحفظة أو بوابة الدفع؟
- رابط سياسة الاسترداد إن وجد.

---

## 11) Shezlong والموبايل

Shezlong يدفع المستخدمين لاستخدام التطبيق، وصفحات help تشير إلى أن الجلسات تدار من الموقع أو التطبيق. صفحة Google Play تعرض عدد تنزيلات كبير، وصفحة App Store تعرض فكرة online therapy مع متخصصين من عدة دول ولغات.

### قراءة منافسة

الموبايل ليس nice-to-have. في هذا المجال:

- التذكير بالجلسة يحتاج push.
- الدخول للجلسة غالبًا من الهاتف.
- الدعم يحتاج سرعة.
- الدفع يحتاج mobile-friendly return.
- الشات يحتاج notifications.

### فرصة Fayed

قبل الإطلاق، يجب أن تكون المسارات التالية في الموبايل مستقرة:

- auth/session persistence.
- push/device registration.
- notification permission UX.
- session reminders.
- payment return/deeplink.
- session join.
- chat state.
- wallet/payments history.

---

## 12) Shezlong وB2B / wellness expansion

Shezlong يملك B2B وخدمات للشركات مثل:

- private sessions.
- corporate excellence.
- well-being planner.
- find your match.
- retreats.
- employee assessments.

### قراءة Business

Shezlong يتوسع من B2C therapy إلى mental wellness ecosystem.

### فرصة Fayed

Fayed لا يحتاج تنفيذ B2B الآن خلال أسبوع. لكن المعمارية يجب ألا تمنع ذلك لاحقًا.

ما يجب فعله الآن:

- لا تجعل النظام patient-only بشكل ضيق.
- لا تسمّي الكيانات Doctor فقط.
- استخدم Practitioner / Specialty / Session.
- اجعل content/assessments/support قابلة للتوسع.

---

## 13) نقاط قوة Shezlong

- تموضع واضح في العلاج النفسي.
- ثقة وخصوصية.
- matching.
- ملفات معالجين قوية.
- سياسات تشغيل مفهومة.
- دعم حاضر في الحالات الحساسة.
- موبايل قوي.
- توسع محتوى واختبارات وB2B.
- فهم جيد للحجز والجلسات كرحلة كاملة.

---

## 14) نقاط ضعف Shezlong التي يمكن لـ Fayed استغلالها

- بعض الواجهات قد تبدو مزدحمة أو قديمة.
- بعض الرسائل التسويقية عامة.
- تجربة المحتوى قد لا تكون دائمًا متصلة بالرحلة بشكل سلس.
- المنتج قد يكون متمركزًا بقوة حول الصحة النفسية فقط.
- إدخال AI/wellness قد يضيف تشتتًا لو لم يكن مرتبطًا برحلة علاج واضحة.

### فرصة تفوق Fayed

- تجربة أهدأ.
- hierarchy أوضح.
- بيانات مالية أدق.
- عرض session states بشكل أفضل.
- mobile UX أنظف.
- support integrated في اللحظات الحرجة.
- guided matching أقل تعقيدًا وأوضح.

---

# الجزء الثاني: دراسة Esaal

## 15) تموضع Esaal

Esaal يضع نفسه كمنصة health & wellness تربط المستخدمين بخبراء موثوقين في عدة مجالات.

النطاق أوسع من Shezlong:

- استشارات طبية.
- صحة نفسية.
- تغذية.
- wellness.
- أسئلة نصية.
- جلسات صوتية ومرئية.
- باقات.
- تطبيق موبايل.

### الاستنتاج لـ Fayed

Esaal يثبت أن السوق لا يريد فقط “therapy”. هناك طلب على منصة رعاية أوسع. لكن الاتساع خطر إن لم يتم تنظيمه.

Fayed يمكن أن يكون أوسع مستقبلًا، لكن يجب أن يبقى منظمًا جدًا:

- specialties ديناميكية.
- terminology عامة.
- session module موحد.
- policies مركزية.
- UI لا يفترض تخصصًا واحدًا.

---

## 16) Esaal وخدمات التواصل

شروط Esaal توضح أن المنصة لديها نوعان من الخدمات:

1. Texting conversations.
2. Audio and video conferencing.

### قراءة Product

Esaal يبيع مرونة التواصل. هذا يقلل friction للمستخدمين الذين لا يريدون فيديو فورًا.

### خطر هذا النموذج

النص كخدمة علاجية/استشارية قد يخلق:

- توقعات غير واضحة.
- صعوبة في حدود المسؤولية.
- ضغط moderation.
- خطر نصائح طبية غير مضبوطة.
- صعوبة في ضبط الجودة.

### موقف Fayed المقترح

Fayed يجب أن يظل واضحًا:

- الجلسة الأساسية: video/audio عبر Daily.
- session chat: تابع للجلسة وبقواعد backend.
- care/support chat: دعم أو متابعة، وليس بديلًا عشوائيًا للجلسة.
- أي approved chat بين مريض ومعالج يجب أن يكون بسياسة واضحة وموافقة.

---

## 17) رحلة الحجز في Esaal

FAQ الخاص بـ Esaal يوضح رحلة حجز بسيطة:

1. Online Consulting.
2. اختيار المجال.
3. اختيار أقرب موعد أو موعد مناسب.
4. book session.
5. تسجيل/دخول.
6. دفع عبر Fawry / Vodafone Cash / Credit Card.

### قراءة UX

هذه الرحلة قوية لأنها مباشرة جدًا. المستخدم لا يحتاج فهم بنية المنصة كلها. يبدأ بالمجال ثم الموعد ثم الدفع.

### فرصة Fayed

Fayed يجب أن يحافظ على نفس البساطة لكن مع guided care:

- “أعرف من أحتاج؟” → ابحث واحجز.
- “لا أعرف من أحتاج؟” → guided matching.
- “عندي مشكلة في الدفع/الجلسة؟” → دعم واضح.
- “عندي جلسة قادمة؟” → شاشة session detail مباشرة.

---

## 18) الدفع في Esaal

Esaal يعرض طرق دفع محلية مهمة:

- Fawry.
- Vodafone Cash.
- Credit Card.

سياسة الاسترداد تذكر أن الاسترداد قد يضاف إلى Esaal Wallet، وأن استرداد الكارت يحتاج 5 إلى 10 أيام عمل، وأن Fawry له refund code، وأن Vodafone Cash لا يُسترد نقدًا بل إلى wallet.

### قراءة Business

Esaal يفهم طبيعة السوق المصري جيدًا. الدفع المحلي ليس تفصيلًا. هو عامل conversion كبير.

### فرصة Fayed

Fayed عنده قاعدة واضحة:

- مصر = EGP + Paymob.
- خارج مصر = USD + Stripe.
- ممنوع fallback لمصر لو بلد المريض غير معروفة.
- ممنوع استخدام بلد المعالج وحدها لتحديد سوق الدفع.
- العملات data-driven من backend.

يجب أن تكون هذه القاعدة أقوى من المنافسين في العرض والتنفيذ.

---

## 19) سياسة الاسترداد في Esaal

سياسة Esaal للجلسات الصوتية/المرئية:

- إلغاء قبل أكثر من 24 ساعة: full refund.
- حتى 3 ساعات قبل الجلسة: 50% refund.
- خلال 3 ساعات: no refund.
- الاسترداد يضاف إلى Esaal Wallet.
- cash refund حسب طريقة الدفع.
- rescheduling بحد أقصى جلستين شهريًا عبر خدمة العملاء.
- الباقات لا تُلغى بعد الاختيار، لكن يمكن جدولة الجلسات المتبقية حسب التوافر.

### قراءة UX

السياسة أبسط من Shezlong، لكنها عملية. المهم في Fayed ليس اختيار نفس الأرقام، بل أن تظهر السياسة للمستخدم قبل الإجراء.

### فرصة Fayed

- لا تعرض “Refund pending” فقط.
- اعرض السبب والمبلغ والعملة والمسار.
- اجعل backend هو الذي يحسب.
- اجعل frontend فقط يعرض policy result.

---

## 20) صفحة الخبير في Esaal

من صفحة حجز خبير في Esaal يظهر:

- اسم الخبير.
- التخصص.
- التقييم.
- سنوات الخبرة.
- اللغة.
- السعر بالدولار في بعض النتائج.
- معلومات عن الخبير.
- الشهادات.
- الخبرة المهنية.
- الجدول.
- request another appointment.
- feedback.

### قراءة UX

Esaal يركز على معلومات كثيرة في صفحة واحدة. هذا جيد للثقة، لكنه قد يكون مزدحمًا.

### فرصة Fayed

Fayed يجب أن يعرض نفس عناصر الثقة لكن بهدوء:

- Summary مختصر.
- trust signals واضحة.
- السعر والعملة في مكان واضح.
- أقرب موعد.
- CTA واحد رئيسي.
- التفاصيل قابلة للفتح أو منظمة.
- لا تكديس كروت متشابهة.

---

## 21) العملات في Esaal

بعض صفحات Esaal تعرض currency settings بين:

- EGP.
- USD.

### قراءة Product

وجود إعداد العملة مهم، لكن في Fayed يجب الحذر:

- لا تجعل اختيار العملة في UI يغير market logic إذا backend لا يسمح.
- لا تحول العملات في frontend.
- لا تستخدم بلد المعالج لتحديد الدفع.
- لا تعرض عملة افتراضية خاطئة.

### فرصة Fayed

Fayed يستطيع التفوق إذا كانت تجربة المال:

- واضحة.
- data-driven.
- currency-aware.
- لا تخلط EGP وUSD في رقم واحد.
- تعرض حالات payment/refund/wallet بدقة.

---

## 22) الموبايل والـ AI في Esaal

صفحة Google Play الحالية تعرض:

- “Your health, simplified”.
- فيديو consultation خلال أقل من 15 دقيقة.
- Healia AI assistant 24/7.
- 900+ specialists.
- medical, mental health, nutrition & more.
- book ahead or go on-spot.
- insurance-integrated.

### قراءة منافسة

Esaal يحاول أن يصبح تطبيق رعاية شامل، وليس مجرد booking website.

### فرصة Fayed

لا يجب أن ندخل AI الآن قبل ثبات المنصة. لكن يمكن تجهيز الرؤية:

- guided care assistant لاحقًا.
- support triage.
- matching explanation.
- content recommendation.
- follow-up nudges.

الآن، الأولوية:

- core reliability.
- notifications.
- deep links.
- payment return.
- session states.
- support.

---

## 23) نقاط قوة Esaal

- اتساع التخصصات.
- طرق تواصل متعددة.
- موبايل قوي.
- دفع محلي مناسب للسوق المصري.
- باقات ومحفظة.
- AI assistant في positioning الحالي.
- مرونة book ahead / go on-spot.
- خبراء كثيرون ومجالات متعددة.

---

## 24) نقاط ضعف Esaal التي يمكن لـ Fayed استغلالها

- التجربة قد تبدو مزدحمة.
- تعدد المجالات قد يقلل وضوح journey.
- النص كخدمة قد يخلق توقعات معقدة.
- بعض الصفحات فيها معلومات كثيرة بدون hierarchy مثالي.
- التركيز الواسع قد يجعل الثقة المتخصصة أقل وضوحًا من Shezlong.

### فرصة تفوق Fayed

- تخصص/رعاية أكثر تنظيمًا.
- رحلة مستخدم أوضح.
- matching أفضل.
- session detail أقوى.
- payment/wallet UX أدق.
- mobile notifications أذكى.
- دعم مرتبط بالسياق وليس صفحة عامة فقط.

---

# الجزء الثالث: مقارنة مباشرة

## 25) جدول مقارنة مختصر

| المحور | Shezlong | Esaal | فرصة Fayed |
|---|---|---|---|
| التموضع | علاج نفسي أونلاين | صحة وwellness متعددة التخصصات | رعاية موجهة منظمة وقابلة للتوسع |
| اختيار المعالج | Matching + filters + support | اختيار مجال/خبير/موعد | Guided matching أهدأ وأوضح |
| التواصل | Video/audio أساسًا، chat مساعد | Text + audio/video | فصل واضح بين session/care/support chat |
| الحجز | جدول + فوري + دعم | موعد قريب + book session | Booking task-specific بلا تشتت |
| الجلسة الفورية | موجودة خلال window قصير | go on-spot / under 15 min حسب app | Instant booking مبني على presence + policy |
| الدفع | محلي/دولي حسب السياق | Fawry/Vodafone/Cards + wallet | مصر EGP Paymob / خارج مصر USD Stripe |
| المحفظة | موجودة ضمنيًا في التشغيل | واضحة في refund policy | Wallet/ledger data-driven |
| الإلغاء | سياسة tiered مفصلة | سياسة أبسط | عرض policy result قبل التأكيد |
| الموبايل | قوي ومركزي | قوي ومتمدد نحو AI | Mobile-first patient journey |
| الدعم | جزء من التشغيل | 24/7/support واضح | Support داخل اللحظات الحرجة |
| المحتوى | blog/tests/wellness | blog/assessments | Content tied to care intent |
| B2B | واضح | أقل وضوحًا في الدراسة الحالية | لاحقًا مع بنية قابلة للتوسع |

---

## 26) ما الذي يجب أن يتفوق فيه Fayed؟

### 26.1 UX أوضح من الاثنين

Fayed يجب أن يقلل الحمل المعرفي:

- لا كروت كثيرة بلا معنى.
- لا copy طويل في غير policy.
- لا routes أو technical enum.
- لا statuses غامضة.
- لا أرقام مالية بلا سياق.

### 26.2 Guided Matching أقوى

المستخدم يجب أن يجد طريقًا حتى لو لا يعرف المصطلحات.

المطلوب:

- أسئلة قليلة.
- نتيجة مفهومة.
- سبب الترشيح.
- زر حجز.
- دعم بديل.

### 26.3 Session Detail أقوى

هذه الشاشة يجب أن تكون مركز الرحلة:

- الحالة.
- المعالج.
- الموعد.
- join window.
- chat availability.
- cancel eligibility.
- payment summary.
- support CTA.

### 26.4 Payment/Wallet أكثر ثقة

لا hardcoded currency.  
لا fallback خاطئ.  
لا خلط عملات.  
لا تحويل frontend.  
كل شيء من backend.

### 26.5 Mobile-first

الموبايل يجب أن يكون قويًا في:

- push notifications.
- reminder flow.
- payment return.
- deep links.
- session join.
- chat disabled/read-only states.
- support access.

### 26.6 Support as Product

الدعم ليس صفحة FAQ فقط. يجب أن يظهر عند:

- فشل الدفع.
- pending payment.
- join failure.
- chat disabled.
- cancellation blocked.
- refund under review.
- practitioner no response.
- instant booking timeout.

---

# الجزء الرابع: تأثير الدراسة على Roadmap Fayed

## 27) أولويات الإطلاق خلال أسبوع

بما أن الوقت المتاح قصير، لا يجب فتح كل شيء. الأولوية يجب أن تكون للرحلات التي لو فشلت ستفقد المستخدم الثقة فورًا.

### Priority 1 — Patient Critical Journey

- Login/register.
- Discovery/practitioner profile.
- Booking.
- Payment.
- Payment return.
- Session detail.
- Join.
- Chat state.
- Support entry.

### Priority 2 — Practitioner Operating Journey

- Availability.
- Upcoming sessions.
- Session detail.
- Join.
- Chat state.
- Earnings/ledger basic visibility.
- Support.

### Priority 3 — Admin Operational Safety

- Practitioner review.
- Sessions visibility.
- Payments visibility.
- Chat moderation basics.
- Support cases.
- Audit for sensitive actions.

### Priority 4 — Mobile Reliability

- Notifications.
- Deep links.
- Session reminders.
- Payment return.
- Runtime join.
- Chat.
- Error states.

---

## 28) ما لا يجب فعله الآن

لا يجب الآن:

- بناء AI assistant قبل ثبات core.
- إضافة B2B قبل الإطلاق.
- توسيع الباقات لو عقود الدفع غير مثبتة.
- تصميم dashboards ضخمة.
- تغيير business model بدون backend contract.
- خلط admin + mobile + frontend + backend في task واحدة.
- إضافة UI polish على حساب correctness.
- عرض بيانات مالية hardcoded.
- تغيير payment fallback عشوائيًا.
- فتح chat حر بين المريض والمعالج بدون policy.

---

## 29) Gap Map أولي لـ Fayed

> هذا ليس حكمًا نهائيًا على الكود الحالي، بل خريطة فحص نستخدمها عند مراجعة المشروع.

### Patient Mobile

- هل التسجيل والدخول ثابتان؟
- هل session token/session persistence مستقر؟
- هل push/device registration موجود؟
- هل notification permission UX واضح؟
- هل payment return/deep link واضح؟
- هل session join يفتح في الوقت الصحيح؟
- هل chat state واضح؟
- هل support متاح من لحظات الفشل؟

### Patient Web

- هل صفحة المعالج تقنع وتحجز؟
- هل الأسعار والعملات data-driven؟
- هل booking flow بسيط؟
- هل cancel modal يعرض policy result؟
- هل session detail يجيب الأسئلة الخمسة؟
- هل wallet/payments واضحين؟

### Practitioner

- هل المعالج يفهم حالة قبوله؟
- هل profile/availability واضح؟
- هل الجلسات القادمة واضحة؟
- هل earnings/ledger currency-aware؟
- هل support متاح؟
- هل notifications تعمل؟

### Admin

- هل admin قادر يراجع المعالجين؟
- هل يراقب الجلسات والمدفوعات؟
- هل chat moderation منفصل وواضح؟
- هل actions حساسة auditable؟
- هل لا يوجد عرض بيانات مالية غامضة؟

---

## 30) Product Principles مستخلصة من المنافسين

1. لا تبيع “جلسة” فقط؛ بع رحلة رعاية.
2. لا تجعل المستخدم يختار من قائمة طويلة فقط؛ أعطه guided path.
3. لا تجعل الدفع black box؛ اعرض كل شيء بوضوح.
4. لا تجعل session join مفاجأة؛ حضّر المستخدم.
5. لا تجعل support بعيدًا؛ ضعه حيث يحدث الخلل.
6. لا تجعل الشات غامضًا؛ وضّح متى ولماذا.
7. لا تجعل المعالج يشعر أنه مجرد profile؛ أعطه أدوات تشغيل.
8. لا تعرض المال من frontend assumptions.
9. لا تبني feature جديدة لو ستكسر الثقة في core journey.
10. لا تقلد المنافس؛ ابني نسخة أوضح وأكثر ثقة.

---

# الجزء الخامس: Prompt عملي لاحق لكودكس عند الحاجة

## 31) Prompt لفحص رحلة الموبايل الحرجة

استخدم هذا prompt عندما تريد من كودكس يراجع Mobile Patient Critical Journey بدون تعديل عشوائي:

```text
Act as a senior mobile/fullstack engineer working on the Fayed healthcare platform.

Context:
Fayed is a healthcare platform connecting patients with practitioners through booking, payment, video sessions, chat, wallet, support, and guided care. The platform must be scalable, maintainable, and trustworthy. The patient mobile app is a critical launch surface.

Task:
Perform a small audit only for the Patient Mobile Critical Journey:
login/register -> discovery/practitioner profile -> booking -> payment return/deep link -> session detail -> join session -> session chat/support.

Important:
- Do not modify code in this task.
- Do not run broad refactors.
- Do not touch backend/admin/web unless you only need to inspect contracts.
- Do not use git reset, git clean, git checkout, git pull, git push, or git commit.
- Do not assume currencies or payment provider logic in the client.
- Do not invent fallback behavior.
- Treat backend API contracts as the source of truth.

Audit focus:
1. Which screens/files currently implement each step?
2. Which API contracts are used?
3. Are payment return/deep links handled clearly?
4. Are session join states clear?
5. Are chat available/read-only/unavailable states handled?
6. Are push notifications/device registration supported?
7. Are loading/empty/error states user-friendly?
8. Are Arabic RTL and English LTR supported where applicable?
9. Are there any raw routes, raw keys, raw enums, or mojibake?
10. What are the launch-critical gaps?

Allowed output only:
- A concise audit report.
- A prioritized gap list: Critical / High / Medium.
- Recommended next smallest implementation task.
- Files inspected.
- Verification suggestions.

Stop after the audit. Do not implement.
```

---

## 32) Prompt لأي UI task لاحق

```text
Act as a senior frontend/fullstack engineer working on Fayed.

Before making any UI/UX change, read and follow DESIGN.md and the Fayed Clinical Warmth Design System.

Task:
[اكتب المهمة المحددة هنا]

Scope:
- Only touch the files needed for this task.
- Keep the change small and safe.
- Preserve current behavior unless explicitly required.
- Use existing components and patterns where possible.
- Use i18n translation files for user-facing text if the project uses translations.
- Support Arabic RTL and English LTR.
- Do not expose raw routes, raw enums, or technical keys to users.
- Do not hardcode currencies, payment providers, or policy results.

Forbidden:
- Do not run git reset, git clean, git checkout, git pull, git push, or git commit.
- Do not refactor unrelated code.
- Do not touch backend/mobile/admin unless explicitly allowed.
- Do not invent backend logic in the frontend.
- Do not add decorative cards or generic SaaS UI.

Verification:
- Run the relevant typecheck/lint/build command for the touched app.
- If the task affects a page or runtime flow, perform a browser/mobile smoke check.
- Verify Arabic and English UI states if translations were touched.
- Check for mojibake, raw keys, raw routes, and hardcoded currencies.

Final report:
1. Files changed.
2. What changed.
3. What was intentionally not changed.
4. Verification commands/results.
5. Any risks or follow-up needed.
```

---

# 33) الخلاصة التنفيذية النهائية

Shezlong وEsaal يثبتان أن السوق لا يربح بمجرد بناء فيديو كول أو قائمة معالجين.

السوق يربح عندما تقدم المنصة:

- ثقة.
- اختيار سهل.
- حجز واضح.
- دفع مفهوم.
- جلسة مستقرة.
- دعم سريع.
- سياسات عادلة ومفهومة.
- موبايل قوي.
- بيانات دقيقة.
- معالج يشعر أن المنصة تساعده في التشغيل والربح.

Fayed يستطيع التفوق لو التزم بثلاث قواعد:

1. **Correctness before polish**  
   صحة البيانات والحالات والمال قبل جمال الشكل.

2. **Guided care before crowded features**  
   رحلة واضحة بدل مميزات كثيرة مشتتة.

3. **Mobile-first reliability before expansion**  
   الموبايل، الدفع، الجلسة، الشات، والإشعارات قبل AI/B2B/ميزات توسع.

---

# 34) المراجع الرسمية المستخدمة

## Shezlong

- Shezlong main site:  
  https://www.shezlong.com/

- Shezlong Web home:  
  https://web.shezlong.com/

- Shezlong About:  
  https://web.shezlong.com/about-us/

- Shezlong B2B:  
  https://web.shezlong.com/b2b/

- اختيار المعالج المناسب:  
  https://help.shezlong.com/ar/articles/9963138

- حجز جلسة من جدول المعالج:  
  https://help.shezlong.com/ar/articles/9963271

- حجز جلسة فورية:  
  https://help.shezlong.com/ar/articles/9963280

- حضور الجلسة:  
  https://help.shezlong.com/ar/articles/9963332

- تفعيل الكاميرا:  
  https://help.shezlong.com/ar/articles/9968563

- إلغاء الجلسة:  
  https://help.shezlong.com/ar/articles/9968572

## Esaal

- Esaal home:  
  https://esaal.me/home

- Esaal about:  
  https://esaal.me/en/about-us

- Esaal FAQ:  
  https://esaal.me/en/faqs

- Esaal terms:  
  https://esaal.me/en/terms

- Esaal refund policy:  
  https://esaal.me/en/refundpolicy

- Esaal online consultation:  
  https://esaal.me/en/online-consultation

- Example expert page:  
  https://esaal.me/en/book-session/nutrition-fitness/dr.ramy-salah-eldeen

- Esaal mental assessments:  
  https://esaal.me/en/mental-assessments

- Esaal Google Play listing:  
  https://play.google.com/store/apps/details?id=com.g22solutions.esaal

---

# 35) طريقة استخدام هذا الملف داخل Fayed

ضع هذا الملف داخل مجلد مثل:

```text
docs/competitors/fayed_competitor_study_shezlong_esaal.md
```

واستخدمه كمرجع عند:

- تخطيط mobile critical journey.
- تحسين صفحة المعالج.
- تحسين booking/payment.
- مراجعة session detail.
- مراجعة wallet/payments.
- تصميم support flows.
- كتابة prompts لكودكس.
- اتخاذ قرار feature: هل تزيد الثقة والتحويل والاستمرارية أم تضيف زحمة؟

