export const arRefundPoliciesCatalog = {
  errors: {
    policyFamilyNotFound: 'لم يتم العثور على عائلة سياسة الاسترجاع',
    activePolicyNotFound: 'لم يتم العثور على سياسة استرجاع نشطة',
    versionNotFound: 'لم يتم العثور على إصدار سياسة الاسترجاع',
    cannotArchiveActiveVersion: 'لا يمكن أرشفة إصدار سياسة استرجاع نشط مباشرةً',
    acceptanceRequired: 'يجب قبول سياسة الاسترجاع النشطة قبل إتمام عملية الدفع',
    acceptanceWrongPolicyType:
      'نوع سياسة الاسترجاع المقبولة لا يطابق نوع عملية الدفع',
    acceptanceStale: 'إصدار سياسة الاسترجاع المقبول لم يعد هو الإصدار الحالي',
    draftOnly: 'يمكن تعديل إصدارات المسودة فقط من سياسة الاسترجاع',
    titleRequired: 'عنوان سياسة الاسترجاع مطلوب',
    summaryRequired: 'ملخص سياسة الاسترجاع مطلوب',
    localizedContentRequired: 'المحتوى المحلي لسياسة الاسترجاع مطلوب',
    clausesRequired: 'بنود سياسة الاسترجاع مطلوبة',
    rulesRequired: 'قواعد سياسة الاسترجاع مطلوبة',
    invalidLocalizedValue:
      'يجب أن تكون القيم المحلية لسياسة الاسترجاع نصوصًا غير فارغة',
    invalidJsonObject: 'يجب أن يكون محتوى سياسة الاسترجاع كائن JSON صالحًا',
    invalidClause: 'بند سياسة الاسترجاع غير صالح',
    invalidRule: 'قاعدة سياسة الاسترجاع غير صالحة',
    invalidRefundPercent: 'يجب أن تكون نسبة الاسترجاع بين 0 و 100',
  },
};
