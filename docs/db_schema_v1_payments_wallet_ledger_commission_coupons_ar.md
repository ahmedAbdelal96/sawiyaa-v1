# DB Schema v1 — Payments / Wallet / Ledger / Commission / Coupons

## الهدف من هذا الموديول
هذا الموديول مسؤول عن:
- الدفع الإلكتروني عبر Stripe و Paymob
- تسجيل عمليات الدفع ومحاولات الدفع
- إدارة الحالة المالية للجلسات
- تسجيل القيود المحاسبية الداخلية (Ledger)
- إظهار الرصيد الحالي للمعالج داخل المنصة
- إدارة التسويات الشهرية
- تعريف قواعد العمولة
- إدارة أكواد الخصم وتوزيع تكلفة الخصم بين المنصة والمعالج

هذا الموديول **لا** يشمل بعد:
- الفواتير الضريبية التفصيلية
- النظام المحاسبي الخارجي
- تعدد العملات الكامل داخل ledger
- برامج الولاء
- اشتراكات الكورسات (يمكن إضافتها لاحقًا على نفس الأساس)

---

## المبادئ المعمارية

### 1) فصل الدفع عن المحفظة
- **Payment** = محاولة أو عملية تحصيل من العميل
- **Ledger** = السجل المالي الداخلي الرسمي للحركة
- **Wallet** = الرصيد الظاهر والمستنتج للمعالج
- **Settlement** = التحويل الشهري الفعلي خارج المنصة

يعني:
- الدفع لا يساوي الرصيد مباشرة
- والرابط بينهما يتم عبر Ledger Entries

---

### 2) الرصيد لا يُخزَّن فقط كرقم خام
مصدر الحقيقة المالي يجب أن يكون:
- Ledger entries

أما الرصيد الظاهر:
- يمكن حسابه من الـ ledger
- أو تخزين snapshot/cached balance لتحسين الأداء

---

### 3) العمولة لا تُكتب داخل الكود
قواعد العمولة يجب أن تكون:
- في قاعدة البيانات
- قابلة للتعديل
- versioned أو على الأقل لها تاريخ صلاحية
- قابلة للربط بالدولة، نوع الجلسة، ونوع السوق

---

### 4) الكوبون لا يغيّر السعر فقط
الكوبون عندكم له تأثير مالي مزدوج:
- جزء تتحمله المنصة
- جزء يتحمله المعالج

لذلك لا يكفي حفظ:
- coupon code
- discount amount

بل يجب أيضًا حفظ:
- platform share
- practitioner share

---

### 5) الجلسة هي نقطة الربط المالية الأساسية
في v1 معظم العمليات المالية ستتم حول:
- Session

لكن التصميم يجب أن يسمح لاحقًا باستخدام نفس الموديول مع:
- Courses
- Enrollments
- Group sessions
- Training purchases

---

## نطاق هذا الإصدار
يغطي هذا الإصدار:

1. **Payments**
   - إنشاء عملية الدفع
   - ربطها بالجلسة
   - provider abstraction
   - حفظ status وexternal refs

2. **Payment Attempts / Events**
   - تتبع محاولات الدفع
   - webhooks
   - failures
   - retries

3. **Ledger**
   - تسجيل القيود الداخلية
   - credit / debit
   - ربطها بالجلسة أو الدفع أو settlement

4. **Wallet**
   - عرض الرصيد الحالي للمعالج
   - available / pending / reserved

5. **Settlements**
   - التسوية الشهرية
   - حالة التحويل
   - المبلغ النهائي
   - المرجع الخارجي

6. **Commission Rules**
   - قواعد عمولة مرنة
   - حسب الدولة / نوع الجلسة / السوق

7. **Coupons**
   - أكواد الخصم
   - الموافقة
   - القيود
   - الاستخدام
   - توزيع تكلفة الخصم

---

# الجزء الأول: Payments

## 1. Payment
يمثل عملية الدفع الأساسية المرتبطة عادةً بجلسة.

### أهم المسؤوليات
- حفظ المبلغ الأساسي
- حفظ العملة
- حفظ البوابة المستخدمة
- حفظ status العملية
- ربط العملية بالجلسة
- حفظ البيانات المرجعية للبوابة

### أهم الحقول
- session_id
- patient_id
- practitioner_id
- payment_purpose
- provider
- status
- amount_subtotal
- amount_discount
- amount_total
- currency_code
- provider_payment_ref
- provider_order_ref
- initiated_at
- authorized_at
- captured_at
- failed_at

### ملاحظات
- يفضل حفظ snapshot للمبالغ النهائية بدل إعادة حسابها كل مرة
- payment يجب أن يحتفظ بنسخة من commission snapshot إن أمكن لاحقًا

---

## 2. PaymentEvent
سجل للأحداث المتعلقة بالدفع.

### أمثلة
- payment_created
- provider_checkout_created
- payment_authorized
- payment_captured
- payment_failed
- payment_refund_requested
- payment_refunded
- webhook_received

### الفائدة
- Debugging
- audit trail
- reconciliation
- تتبع webhooks

---

## 3. Refund
كيان مستقل لعمليات الاسترداد.

### أهم الحقول
- payment_id
- session_id
- refund_reason
- refund_type
- amount
- provider_refund_ref
- status
- requested_at
- processed_at

### لماذا جدول مستقل؟
لأن الجلسة الواحدة قد تحتاج:
- استرداد جزئي
- أو أكثر من refund event
- أو مراجعة إدارية

---

# الجزء الثاني: Ledger / Wallet / Settlement

## 4. LedgerEntry
هذا هو أهم جدول مالي في النظام.

### ما الذي يسجله؟
كل حركة مالية داخلية تؤثر على:
- رصيد المعالج
- إيراد المنصة
- الخصومات
- الاستردادات
- التسويات

### الفكرة
أي مبلغ يظهر في wallet أو settlement يجب أن يكون له أصل في ledger.

### أهم الحقول
- practitioner_id
- session_id
- payment_id
- settlement_id
- entry_type
- direction
- amount
- currency_code
- balance_bucket
- reference_type
- reference_id
- description
- effective_at

### أنواع entries المقترحة
- SESSION_GROSS
- PLATFORM_COMMISSION
- PRACTITIONER_EARNING
- COUPON_PLATFORM_SHARE
- COUPON_PRACTITIONER_SHARE
- REFUND_PLATFORM_REVERSAL
- REFUND_PRACTITIONER_REVERSAL
- MANUAL_ADJUSTMENT
- SETTLEMENT_PAYOUT
- SETTLEMENT_REVERSAL

### لماذا entry_type + direction؟
لأن النوع يوضح طبيعة الحركة،  
والاتجاه يوضح هل هي:
- credit
- debit

---

## 5. PractitionerWallet
عرض الرصيد الحالي للمعالج.

### هل هو مصدر الحقيقة؟
لا.  
مصدر الحقيقة هو Ledger.  
لكن هذا الجدول مفيد للأداء وعرض الرصيد بسرعة.

### أهم الحقول
- practitioner_id
- currency_code
- available_balance
- pending_balance
- reserved_balance
- lifetime_earned
- lifetime_paid_out
- last_ledger_entry_at

### ملاحظات
- يفضل تحديثه transactionally بعد ledger entries
- أو عبر job/event-driven لو النظام كبر

---

## 6. SettlementBatch
يمثل دفعة تسوية شهرية، ويمكن أن تضم أكثر من معالج.

### الفكرة
كل شهر يكون لديك batch:
- شهر معين
- عملة معينة
- مجموعة تسويات

### أهم الحقول
- period_year
- period_month
- currency_code
- status
- generated_at
- finalized_at

---

## 7. PractitionerSettlement
التسوية الفعلية لمعالج معين داخل batch معين.

### أهم الحقول
- batch_id
- practitioner_id
- wallet_id
- amount_gross
- amount_adjustments
- amount_net
- currency_code
- payout_method_snapshot
- external_payout_ref
- status
- paid_at

### الحالات المقترحة
- DRAFT
- READY
- PROCESSING
- PAID
- FAILED
- CANCELLED

### ملاحظات
- payout_method_snapshot مهم لأن وسيلة الاستلام قد تتغير بعدين
- لا تعتمد فقط على current payout method profile

---

# الجزء الثالث: Commission Rules

## 8. CommissionRule
يمثل قاعدة العمولة الرسمية المستخدمة عند حساب توزيع الإيراد.

### الاستخدام في منصتكم
بما أن عندكم:
- عمولات تختلف حسب السوق
- وتريدون تعديلها من مكان مركزي
- وتريدون توحيد استخدامها

فهذا الجدول أساسي.

### أهم الحقول
- slug
- rule_name
- rule_scope
- practitioner_country_id
- patient_country_id
- market_type
- session_flow_type
- session_mode
- specialty_id
- platform_rate_percent
- practitioner_rate_percent
- is_default
- is_active
- starts_at
- ends_at
- priority

### أمثلة
- قاعدة default عامة
- قاعدة للجلسات المحلية
- قاعدة للجلسات الدولية
- قاعدة لنوع تخصص معين لاحقًا

### ملاحظات
- لا تعتمد على if/else داخل services
- resolution strategy يكون:
  1. ابحث عن القاعدة الأكثر specificity
  2. ثم الأعلى priority
  3. ثم default

---

## 9. CommissionSnapshot (اختياري لكنه مهم)
بدل ما تعتمد على القاعدة الحالية فقط، الأفضل حفظ snapshot عند الدفع أو تأكيد الجلسة.

### لماذا؟
لأن القاعدة قد تتغير لاحقًا، لكن الجلسات القديمة يجب أن تظل محسوبة حسب وقت إنشائها.

### أهم الحقول
- session_id
- payment_id
- commission_rule_id
- platform_rate_percent
- practitioner_rate_percent
- market_type
- captured_at

في v1 يمكن الاكتفاء بحفظ snapshot fields داخل Payment نفسه، لكن وجود جدول مستقل أنظف.

---

# الجزء الرابع: Coupons

## 10. Coupon
أكواد الخصم التي ينشئها المعالج أو الإدارة.

### في منصتكم
المعالج يمكنه إنشاء كوبون:
- لكن بحدود
- وبمراجعة
- وبقيم قصوى
- وتوزيع واضح لتكلفة الخصم

### أهم الحقول
- code
- slug
- created_by_user_id
- owner_practitioner_id
- coupon_scope
- status
- discount_type
- discount_value
- max_discount_amount
- platform_share_percent
- practitioner_share_percent
- usage_limit_total
- usage_limit_per_patient
- starts_at
- ends_at
- is_active
- requires_approval
- approved_by_user_id
- approved_at

### الحالات المقترحة
- DRAFT
- PENDING_REVIEW
- APPROVED
- REJECTED
- ACTIVE
- EXPIRED
- DISABLED

### الملاحظات
- الكود نفسه يجب أن يكون unique وقابل للبحث السريع
- slug هنا مفيد في الإدارة والـ SEO الداخلي، لكن الكود نفسه هو الأهم وظيفيًا

---

## 11. CouponRedemption
يسجل كل مرة يتم فيها استخدام الكوبون.

### أهم الحقول
- coupon_id
- session_id
- payment_id
- patient_id
- practitioner_id
- currency_code
- gross_amount
- discount_amount
- platform_discount_share
- practitioner_discount_share
- redeemed_at

### الفائدة
- منع التكرار
- الإحصائيات
- reconciliation
- بناء ledger entries الصحيحة

---

# الجزء الخامس: SEO / Slugs / Indexing

## 1) استخدام slug
بما أنك طلبت استخدام slug “في كل شيء” للـ SEO،  
فهنا لازم نكون عمليين:

### استخدم slug في الكيانات العامة المعروضة للواجهة
- practitioners
- specialties
- specialty categories
- articles
- article categories
- courses
- public pages
- commission rules (إداريًا فقط)
- coupons (إداريًا فقط)

### لا تعتمد على slug في الكيانات المالية التشغيلية
مثل:
- payments
- refunds
- ledger entries
- settlements
- payment events

هذه كيانات داخلية عالية الحساسية، والاعتماد فيها يكون على:
- UUID
- external refs
- indexes مناسبة

### لماذا؟
لأن:
- SEO مهم في الكيانات public
- أما الكيانات المالية فالمهم فيها:
  - correctness
  - uniqueness
  - reconciliation
  - tracing

---

## 2) الـ indexes المقترحة بعناية

## Payment
- index على `(session_id)`
- index على `(patient_id, status)`
- index على `(practitioner_id, status)`
- unique index على `provider_payment_ref` عند وجوده
- index على `(provider, status, created_at)`
- index على `(currency_code, status)`

## PaymentEvent
- index على `(payment_id, created_at)`
- index على `(event_type, created_at)`

## Refund
- index على `(payment_id, status)`
- index على `(session_id, status)`
- index على `(requested_at)`

## LedgerEntry
- index على `(practitioner_id, effective_at)`
- index على `(practitioner_id, balance_bucket, effective_at)`
- index على `(session_id)`
- index على `(payment_id)`
- index على `(settlement_id)`
- index على `(entry_type, effective_at)`
- index على `(reference_type, reference_id)`

## PractitionerWallet
- unique index على `(practitioner_id, currency_code)`

## SettlementBatch
- unique index على `(period_year, period_month, currency_code)`

## PractitionerSettlement
- unique index على `(batch_id, practitioner_id)`
- index على `(practitioner_id, status)`
- index على `(paid_at)`

## CommissionRule
- unique index على `slug`
- index على `(is_active, is_default)`
- index على `(priority, starts_at, ends_at)`
- index على `(practitioner_country_id, patient_country_id)`
- index على `(session_flow_type, session_mode)`
- index على `(specialty_id)`

## Coupon
- unique index على `code`
- unique index على `slug`
- index على `(owner_practitioner_id, status)`
- index على `(status, starts_at, ends_at)`
- index على `(approved_by_user_id)`

## CouponRedemption
- unique index على `(coupon_id, session_id)`
- index على `(patient_id, redeemed_at)`
- index على `(practitioner_id, redeemed_at)`
- index على `(payment_id)`

---

# الجزء السادس: العلاقات الأساسية

- Session 1—N Payments
- Payment 1—N PaymentEvents
- Payment 1—N Refunds
- PractitionerProfile 1—1..N Wallets (حسب العملة)
- PractitionerProfile 1—N LedgerEntries
- SettlementBatch 1—N PractitionerSettlements
- PractitionerSettlement 1—N LedgerEntries
- CommissionRule يمكن ربطها بـ Session / Payment عبر snapshot
- Coupon 1—N CouponRedemptions
- Session 0..1 — N CouponRedemptions
- Payment 0..1 — N CouponRedemptions

---

# الجزء السابع: Business Rules

## Payment Rules
1. لا تعتبر الجلسة مدفوعة إلا عند status واضح مثل `CAPTURED` أو `SUCCEEDED`
2. يمكن وجود أكثر من payment attempt للجلسة حسب السياسة
3. يجب حفظ external refs لكل provider

## Ledger Rules
1. كل earning للمعالج تسجل ledger entry منفصلة
2. كل عمولة للمنصة تسجل entry منفصلة
3. كل reversal بسبب refund يسجل entry مستقل
4. settlement payout لا يعدل القيود القديمة بل يضيف قيدًا جديدًا

## Wallet Rules
1. available = قابل للسحب
2. pending = لم يصبح مؤهلاً للتسوية بعد
3. reserved = محجوز لمراجعة أو نزاع أو refund محتمل

## Coupon Rules
1. الكوبون لا يفعّل إلا بعد الموافقة
2. المعالج لا يتجاوز النسبة القصوى المسموح بها
3. توزيع الخصم بين المنصة والمعالج يجب أن يساوي 100%
4. عند redemption تحفظ الحصص الفعلية snapshot

## Commission Rules
1. يجب وجود default rule واحدة على الأقل لكل سوق أساسي
2. إذا لم توجد قاعدة مطابقة يتم fallback إلى default
3. snapshot القاعدة عند الدفع أو التأكيد إلزامي منطقيًا

---

# الجزء الثامن: أمثلة Flow

## A) جلسة مدفوعة بدون كوبون
1. Session created
2. Payment created
3. Payment captured
4. Commission rule resolved
5. Ledger entries generated:
   - SESSION_GROSS
   - PLATFORM_COMMISSION
   - PRACTITIONER_EARNING
6. Wallet updated
7. عند نهاية الشهر:
   - Settlement generated
   - SETTLEMENT_PAYOUT ledger entry
   - wallet available decreases

---

## B) جلسة مدفوعة مع كوبون
1. Session created
2. Coupon validated
3. Payment created بمبلغ مخفض
4. Payment captured
5. Ledger entries generated:
   - SESSION_GROSS
   - PLATFORM_COMMISSION
   - PRACTITIONER_EARNING
   - COUPON_PLATFORM_SHARE
   - COUPON_PRACTITIONER_SHARE
6. Wallet updated حسب صافي نصيب المعالج

---

## C) Refund جزئي
1. Refund requested
2. Provider refund processed
3. Refund status updated
4. Ledger reversals posted:
   - REFUND_PLATFORM_REVERSAL
   - REFUND_PRACTITIONER_REVERSAL
5. Wallet balances adjusted

---

# الجزء التاسع: التوصيات التنفيذية

## 1) لا تربط Payment مباشرة بـ Wallet
العلاقة دائمًا تمر عبر Ledger.

## 2) snapshots مهمة جدًا
احفظ snapshots لهذه العناصر وقت الدفع:
- commission rates
- coupon split
- practitioner display info لو لزم
- currency
- session mode
- duration

## 3) لا تستخدم slug بدل identifiers الداخلية
slug مفيد جدًا للـ public URLs وadmin readability،  
لكن الكيانات المالية تعتمد على:
- UUID
- provider refs
- settlement refs

## 4) reconciliation من البداية
احفظ:
- webhook payload refs
- provider refs
- attempt refs
- payout refs

## 5) money fields
يفضل تخزين الأموال بصيغة Decimal دقيقة،  
وليس float أبدًا.

---

# الجزء العاشر: القرار المعماري النهائي
- Payments منفصل عن Ledger
- Ledger هو مصدر الحقيقة المالي
- Wallet طبقة عرض/تجميع
- Settlements شهرية ومنفصلة
- Commission rules قابلة للتعديل من DB
- Coupons approved and split-aware
- Slugs تستخدم في الـ public/admin entities المناسبة فقط
- Indexes مصممة حسب أنماط البحث الفعلية

---

# الخطوة التالية بعد هذا الموديول
بعد اعتماد هذا الموديول، المنطقي أن ننتقل إلى:

**Articles / Categories / Review Workflow / Admin Content Moderation**

أو لو أردت إكمال البنية التشغيلية أولًا:
**Chat / Support / Chat Approval / Moderation**
