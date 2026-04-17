export const arFinancialOperationsCatalog = {
  errors: {
    paymentNotFound: 'لم يتم العثور على عملية الدفع.',
    paymentNotCaptured: 'لا يمكن ترحيل القيود إلا لعمليات الدفع المكتملة.',
    paymentSnapshotsIncomplete:
      'بيانات الدفع المالية غير مكتملة لترحيل القيود.',
    practitionerNotFound: 'لم يتم العثور على ملف المعالج.',
    settlementItemNotFound: 'لم يتم العثور على بند التسوية.',
    settlementPayoutNotFound: 'لم يتم العثور على سجل الصرف.',
    payoutProofNotFound: 'لم يتم العثور على مستند الصرف.',
    settlementBatchExists: 'يوجد بالفعل دفعة تسويات لنفس الفترة والعملة.',
    settlementBatchNotFound: 'لم يتم العثور على دفعة التسويات.',
    invalidSettlementState: 'حالة دفعة التسويات غير صالحة لهذا الإجراء.',
    settlementPayoutAlreadyRecorded:
      'تم تسجيل عملية الصرف لهذه التسوية بالفعل.',
    invalidSettlementPayoutState:
      'حالة التسوية غير صالحة لتسجيل عملية الصرف.',
    invalidPayoutAmount: 'المبلغ المدفوع غير صالح.',
    payoutAmountExceedsDue: 'المبلغ المدفوع أكبر من المبلغ المستحق المتبقي.',
    partialPayoutNotSupported: 'الصرف الجزئي غير مدعوم في هذا المسار.',
    payoutProofFileRequired: 'ملف إثبات الصرف مطلوب.',
    payoutProofInvalidType: 'يُسمح فقط بملفات JPG أو PNG أو WEBP أو PDF.',
    payoutProofFileTooLarge: 'ملف إثبات الصرف أكبر من المسموح.',
    invalidFilter: 'يوجد خطأ في مرشحات العمليات المالية.',
    forbiddenScope: 'غير مسموح لك بالوصول إلى هذا النطاق المالي.',
    resourceNotFoundInScope:
      'لم يتم العثور على المورد المطلوب ضمن النطاق المسموح.',
  },
} as const;

