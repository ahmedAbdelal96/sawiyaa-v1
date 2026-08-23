export const arFinancialOperationsCatalog = {
  errors: {
    paymentNotFound: 'لم يتم العثور على عملية الدفع.',
    paymentNotCaptured: 'لا يمكن ترحيل القيود إلا لعمليات الدفع المكتملة.',
    paymentSnapshotsIncomplete:
      'لا يمكن تنفيذ رد المبلغ إلى المحفظة لأن بيانات الدفع المحفوظة لهذه الجلسة غير مكتملة. راجع بيانات الدفع قبل تأكيد القرار.',
    practitionerNotFound: 'لم يتم العثور على ملف المعالج.',
    settlementItemNotFound: 'لم يتم العثور على بند التسوية.',
    settlementPayoutNotFound: 'لم يتم العثور على سجل الصرف.',
    payoutProofNotFound: 'لم يتم العثور على مستند الصرف.',
    settlementBatchExists: 'يوجد بالفعل دفعة تسويات لنفس الفترة والعملة.',
    settlementBatchNotFound: 'لم يتم العثور على دفعة التسويات.',
    invalidSettlementState: 'حالة دفعة التسويات غير صالحة لهذا الإجراء.',
    settlementPayoutAlreadyRecorded:
      'تم تسجيل عملية الصرف لهذه التسوية بالفعل.',
    invalidSettlementPayoutState: 'حالة التسوية غير صالحة لتسجيل عملية الصرف.',
    invalidPayoutAmount: 'المبلغ المدفوع غير صالح.',
    payoutOverrideReasonRequired:
      'يجب إدخال سبب عندما يختلف المبلغ الفعلي بشكل ملحوظ عن المبلغ المحسوب.',
    exchangeRateRequired: 'يجب إدخال سعر صرف للتحويل بين عملتين.',
    payoutAmountExceedsDue: 'المبلغ المدفوع أكبر من المبلغ المستحق المتبقي.',
    partialPayoutNotSupported: 'الصرف الجزئي غير مدعوم في هذا المسار.',
    payoutProofFileRequired: 'ملف إثبات الصرف مطلوب.',
    payoutProofInvalidType: 'يُسمح فقط بملفات JPG أو PNG أو WEBP أو PDF.',
    payoutProofFileTooLarge: 'ملف إثبات الصرف أكبر من المسموح.',
    invalidFilter: 'يوجد خطأ في مرشحات العمليات المالية.',
    forbiddenScope: 'غير مسموح لك بالوصول إلى هذا النطاق المالي.',
    resourceNotFoundInScope:
      'لم يتم العثور على المورد المطلوب ضمن النطاق المسموح.',
    // Wallet
    practitionerWalletNotFound: 'لم يتم العثور على محفظة المعالج.',
    practitionerWalletRequired: 'محفظة المعالج مطلوبة لإتمام هذه العملية.',
    practitionerWalletCurrencyUnresolved: 'تعذّر تحديد عملة محفظة المعالج.',
    walletCurrencyChangeRequiresSettlement:
      'لا يمكن تغيير عملة المحفظة قبل إتمام تسوية المبالغ المعلقة.',
    // Settlement
    invalidSettlementAmount: 'مبلغ التسوية غير صالح.',
    settlementAlreadyClosed: 'تم إغلاق دفعة التسويات بالفعل.',
    approvedSettlementImmutable: 'لا يمكن تعديل بند تسوية معتمد.',
    legacySettlementAssignmentDisabled:
      'تعيين التسويات بالطريقة القديمة غير مفعّل.',
    // Ledger
    practitionerEarningRequiresSettlement:
      'أرباح المعالج تستلزم وجود تسوية مرتبطة.',
    practitionerEarningRequiresAudit:
      'أرباح المعالج تستلزم وجود مراجعة مالية مرتبطة.',
    unbalancedJournalEntry:
      'قيد اليومية غير متوازن — مجموع المدين يجب أن يساوي مجموع الدائن.',
    currencyRequired: 'العملة مطلوبة لإتمام هذه العملية.',
    // Payout flows
    legacyPayoutPathBlocked:
      'مسار الصرف القديم محظور. يُرجى استخدام مسار التسوية الجديد.',
    payoutAmountInvalid: 'مبلغ الصرف غير صالح.',
    payoutSettlementRequired: 'يجب تحديد بند تسوية لإتمام عملية الصرف.',
    payoutSettlementInvalid: 'بند التسوية المحدد غير صالح.',
    payoutAmountExceedsSettlement:
      'المبلغ المطلوب صرفه يتجاوز قيمة بند التسوية.',
    manualPayoutAlreadyRecorded: 'تم تسجيل صرف يدوي لهذه التسوية مسبقاً.',
    // Package settlement
    packageSettlementCurrencyMissing: 'العملة مفقودة في تسوية الباقة.',
    packageSettlementNotFound: 'لم يتم العثور على تسوية الباقة.',
    packageSettlementNotReady: 'تسوية الباقة ليست جاهزة لهذا الإجراء بعد.',
    packageSettlementEmpty: 'تسوية الباقة لا تحتوي على بنود.',
    packageSettlementInvalidAmount: 'مبلغ تسوية الباقة غير صالح.',
    packageSettlementSnapshotMissing:
      'لقطة تسوية الباقة المطلوبة غير موجودة.',
    // Session earning reviews
    sessionEarningReviewFinalAmountsRequired:
      'المبالغ النهائية لمراجعة أرباح الجلسة مطلوبة.',
    sessionEarningReviewReasonRequired: 'سبب مراجعة أرباح الجلسة مطلوب.',
    // Recovery
    recoveryAlreadyResolved: 'تم تسوية طلب الاسترداد مسبقاً.',
    recoveryAmountInvalid: 'مبلغ الاسترداد غير صالح.',
    recoveryAmountExceedsRemaining: 'مبلغ الاسترداد يتجاوز المبلغ المتبقي.',
    recoveryReasonRequired: 'سبب الاسترداد مطلوب.',
  },
} as const;
