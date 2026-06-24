export type ReconciliationIssueCopy = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  whyItMattersAr: string;
  whyItMattersEn: string;
  recommendedActionAr: string;
  recommendedActionEn: string;
};

const FALLBACK_COPY: ReconciliationIssueCopy = {
  titleAr: "مشكلة مطابقة مالية تحتاج مراجعة.",
  titleEn: "A financial reconciliation issue requires review.",
  descriptionAr: "لم يتم العثور على شرح تفصيلي لهذا الكود بعد.",
  descriptionEn: "No detailed explanation is available for this code yet.",
  whyItMattersAr: "قد يشير ذلك إلى فرق مالي أو بيانات ناقصة تحتاج مراجعة قبل أي تحويلات.",
  whyItMattersEn: "This may indicate a financial mismatch or missing data that should be reviewed before payouts.",
  recommendedActionAr: "راجع العملية المرتبطة وتأكد من صحة القيد أو التسوية أو الاسترداد. لا تعدّل البيانات المالية يدويًا.",
  recommendedActionEn: "Review the related operation and verify the entry, settlement, or refund. Do not manually edit financial data.",
};

const ISSUE_CODE_COPY: Record<string, ReconciliationIssueCopy> = {
  MISSING_JOURNAL_ENTRY: {
    titleAr: "قيد اليومية مفقود",
    titleEn: "Missing journal entry",
    descriptionAr: "تم اكتشاف عملية مالية بدون قيد يومية مطابق.",
    descriptionEn: "A financial operation was found without a matching journal entry.",
    whyItMattersAr: "قد يعني ذلك أن الأثر المحاسبي غير مسجل بالكامل، مما يؤثر على الدفتر والتسويات.",
    whyItMattersEn: "The accounting impact may not be fully recorded, which can affect the ledger and settlements.",
    recommendedActionAr: "راجع العملية المرتبطة وتأكد من إنشاء قيد اليومية الصحيح قبل أي صرف أو اعتماد نهائي.",
    recommendedActionEn: "Review the related operation and ensure the correct journal entry exists before payout or final approval.",
  },
  MISSING_GATEWAY_FEE_SNAPSHOT: {
    titleAr: "لقطة رسوم بوابة الدفع مفقودة",
    titleEn: "Missing gateway fee snapshot",
    descriptionAr: "عملية الدفع مكتملة لكن لقطة رسوم البوابة غير موجودة.",
    descriptionEn: "The payment completed but the gateway fee snapshot is missing.",
    whyItMattersAr: "قد يؤدي ذلك إلى اختلاف في صافي الإيراد أو الربح المحسوب.",
    whyItMattersEn: "This may affect net revenue or profit calculations.",
    recommendedActionAr: "راجع عملية الدفع المرتبطة وتحقق من حفظ رسوم البوابة قبل اعتماد التسوية.",
    recommendedActionEn: "Review the related payment and confirm the gateway fee was captured before settlement approval.",
  },
  MISSING_VAT_SNAPSHOT: {
    titleAr: "لقطة ضريبة القيمة المضافة مفقودة",
    titleEn: "Missing VAT snapshot",
    descriptionAr: "عملية الدفع لا تحتوي على لقطة ضريبة محفوظة.",
    descriptionEn: "The payment does not contain a stored VAT snapshot.",
    whyItMattersAr: "قد يؤثر ذلك على الضريبة المعلنة أو على صافي القيد المالي.",
    whyItMattersEn: "This may affect reported tax values or the net financial posting.",
    recommendedActionAr: "راجع إعدادات الضريبة وحفظ اللقطة المالية قبل التسوية أو الصرف.",
    recommendedActionEn: "Review tax settings and capture the financial snapshot before settlement or payout.",
  },
  PAYMENT_COUPON_REDEMPTION_MISSING: {
    titleAr: "استرداد الخصم مفقود",
    titleEn: "Missing coupon redemption",
    descriptionAr: "تم تطبيق خصم على الدفع لكن سجل الاسترداد غير موجود.",
    descriptionEn: "A discount appears on the payment but the coupon redemption record is missing.",
    whyItMattersAr: "قد يؤدي ذلك إلى عدم تطابق بين الدفع والدفتر أو بين الخصم والتسوية.",
    whyItMattersEn: "This can cause a mismatch between the payment, ledger, and discount accounting.",
    recommendedActionAr: "راجع سجل الخصم المرتبط بالدفع وتأكد من وجود سجل استرداد واحد فقط.",
    recommendedActionEn: "Review the discount linked to the payment and ensure exactly one redemption record exists.",
  },
  PACKAGE_SETTLEMENT_COMPLETION_MISMATCH: {
    titleAr: "عدم تطابق في إكمال تسوية الباقة",
    titleEn: "Package settlement completion mismatch",
    descriptionAr: "حالة تسوية الباقة لا تطابق ما تم تسجيله محاسبيًا.",
    descriptionEn: "The package settlement status does not match the recorded accounting state.",
    whyItMattersAr: "قد يشير ذلك إلى أن جزءًا من التمكين أو الصرف لم يُسجل بعد.",
    whyItMattersEn: "This may indicate that part of the release or payout flow has not been recorded yet.",
    recommendedActionAr: "راجع تسوية الباقة والعمليات التابعة قبل أي اعتماد نهائي.",
    recommendedActionEn: "Review the package settlement and related operations before final approval.",
  },
  SETTLEMENT_GROSS_MISMATCH: {
    titleAr: "عدم تطابق في الإجمالي",
    titleEn: "Settlement gross mismatch",
    descriptionAr: "الإجمالي المتوقع للتسوية لا يطابق القيمة الفعلية المسجلة.",
    descriptionEn: "The expected settlement gross amount does not match the recorded amount.",
    whyItMattersAr: "قد يؤثر ذلك على الرصيد التقديري وعلى الاستحقاق المحاسبي.",
    whyItMattersEn: "This may affect projected balances and accounting entitlement.",
    recommendedActionAr: "راجع عناصر التسوية ومصدر القيود قبل تنفيذ أي تحويل.",
    recommendedActionEn: "Review the settlement items and source entries before any payout.",
  },
  SETTLEMENT_NET_MISMATCH: {
    titleAr: "عدم تطابق في الصافي",
    titleEn: "Settlement net mismatch",
    descriptionAr: "صافي التسوية لا يطابق الحساب المتوقع.",
    descriptionEn: "The settlement net amount does not match the expected calculation.",
    whyItMattersAr: "قد يشير ذلك إلى خصم أو استرداد أو ضريبة لم تُحتسب كما يجب.",
    whyItMattersEn: "This may indicate a discount, refund, or tax value was not included correctly.",
    recommendedActionAr: "راجع الخصومات والاستردادات والضرائب المرتبطة قبل اعتماد التسوية.",
    recommendedActionEn: "Review related discounts, refunds, and taxes before approving the settlement.",
  },
  SETTLEMENT_PAYOUT_LEDGER_MISMATCH: {
    titleAr: "عدم تطابق بين التسوية وقيد الدفع",
    titleEn: "Settlement to payout ledger mismatch",
    descriptionAr: "قيمة الصرف لا تطابق قيود الدفتر الخاصة بالتسوية.",
    descriptionEn: "The payout value does not match the ledger entries for the settlement.",
    whyItMattersAr: "قد يؤدي ذلك إلى فرق بين ما تم صرفه وما هو مستحق محاسبيًا.",
    whyItMattersEn: "This may cause a difference between what was paid and what is accounting-eligible.",
    recommendedActionAr: "راجع قيد الصرف والتسوية المرتبطة وتأكد من عدم تكرار المعالجة.",
    recommendedActionEn: "Review the payout entry and linked settlement to ensure the flow was processed once.",
  },
  WALLET_LEDGER_DRIFT: {
    titleAr: "انحراف بين المحفظة والدفتر",
    titleEn: "Wallet ledger drift",
    descriptionAr: "رصيد المحفظة المحسوب لا يطابق القيود المالية المسجلة.",
    descriptionEn: "The wallet balance does not match the recorded ledger entries.",
    whyItMattersAr: "قد يؤثر ذلك على عرض الرصيد أو على أهلية الصرف.",
    whyItMattersEn: "This may affect the displayed balance or payout eligibility.",
    recommendedActionAr: "راجع القيود المرتبطة بهذا الرصيد قبل أي تعديل أو صرف.",
    recommendedActionEn: "Review the related ledger entries before any adjustment or payout.",
  },
  JOURNAL_NOT_BALANCED: {
    titleAr: "قيد يومية غير متوازن",
    titleEn: "Journal entry not balanced",
    descriptionAr: "إجمالي المدين والدائن غير متساوٍ في قيد اليومية.",
    descriptionEn: "The journal entry debit and credit totals are not equal.",
    whyItMattersAr: "هذا يشير إلى مشكلة محاسبية حرجة يجب مراجعتها فورًا.",
    whyItMattersEn: "This indicates a critical accounting issue that needs immediate review.",
    recommendedActionAr: "راجع القيد المحاسبي المرتبط فورًا قبل أي صرف أو اعتماد.",
    recommendedActionEn: "Review the journal entry immediately before any payout or approval.",
  },
  DUPLICATE_LEDGER_POSTING: {
    titleAr: "تسجيل قيد مكرر",
    titleEn: "Duplicate ledger posting",
    descriptionAr: "تم تسجيل نفس الأثر المالي أكثر من مرة.",
    descriptionEn: "The same financial impact was posted more than once.",
    whyItMattersAr: "قد يؤدي ذلك إلى تضخيم الإيراد أو الخصم أو الصرف بشكل غير صحيح.",
    whyItMattersEn: "This can inflate revenue, discount, or payout figures incorrectly.",
    recommendedActionAr: "تحقق من تكرار المعالجة ولا تعالج هذه الحالة يدويًا دون مسار مالي معتمد.",
    recommendedActionEn: "Verify the duplicate processing and do not correct it manually without an approved finance workflow.",
  },
  REFUND_REVERSAL_MISSING: {
    titleAr: "قيد عكسي للاسترداد مفقود",
    titleEn: "Missing refund reversal",
    descriptionAr: "الاسترداد ناجح لكن القيود العكسية غير موجودة.",
    descriptionEn: "The refund succeeded but the reversing ledger entries are missing.",
    whyItMattersAr: "قد يعني ذلك أن أثر الاسترداد غير منعكس في الدفتر أو التسوية.",
    whyItMattersEn: "The refund impact may not be reflected in the ledger or settlement state.",
    recommendedActionAr: "راجع الاسترداد والقيود العكسية المرتبطة قبل اعتماد أي تقرير مالي.",
    recommendedActionEn: "Review the refund and related reversal entries before approving any financial report.",
  },
  CROSS_CURRENCY_AGGREGATION_RISK: {
    titleAr: "خطر تجميع عملات مختلفة",
    titleEn: "Cross-currency aggregation risk",
    descriptionAr: "تم رصد احتمال تجميع قيم بعملات مختلفة في نفس الحساب.",
    descriptionEn: "A potential mix of different currencies was detected in the same calculation.",
    whyItMattersAr: "قد يؤدي ذلك إلى نتائج مالية غير صحيحة أو ملخصات مضللة.",
    whyItMattersEn: "This can produce incorrect financial results or misleading summaries.",
    recommendedActionAr: "راجع القيم وتأكد من فصل EGP عن USD قبل أي تسوية أو تحويل.",
    recommendedActionEn: "Review the values and keep EGP separate from USD before any settlement or payout.",
  },
};

export function getReconciliationIssueCopy(issueCode: string | null | undefined): ReconciliationIssueCopy {
  if (!issueCode) return FALLBACK_COPY;
  return ISSUE_CODE_COPY[issueCode] ?? FALLBACK_COPY;
}
