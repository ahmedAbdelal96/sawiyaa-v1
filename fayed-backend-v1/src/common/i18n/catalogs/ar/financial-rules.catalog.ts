export const arFinancialRulesCatalog = {
  success: {
    commissionRuleCreated: 'تم إنشاء قاعدة العمولة بنجاح.',
    commissionRulesFetched: 'تم جلب قواعد العمولة بنجاح.',
    couponCreated: 'تم إنشاء الكوبون بنجاح.',
    couponUpdated: 'تم تحديث الكوبون بنجاح.',
    couponDisabled: 'تم تعطيل الكوبون بنجاح.',
    couponRedemptionsFetched: 'تم جلب سجل استخدامات الكوبون بنجاح.',
    couponValidated: 'تم التحقق من الكوبون بنجاح.',
    financialBreakdownCalculated: 'تم حساب التفصيل المالي للجلسة بنجاح.',
  },
  errors: {
    sessionNotFound: 'لم يتم العثور على الجلسة.',
    pricingUnavailable: 'السعر غير متاح لهذه الجلسة.',
    currencyUnavailable: 'العملة غير متاحة لهذه الجلسة.',
    commissionRuleNotFound: 'لا توجد قاعدة عمولة نشطة تطابق سياق هذه الجلسة.',
    commissionRuleSlugExists: 'معرف قاعدة العمولة مستخدم بالفعل.',
    invalidCommissionSplit:
      'يجب أن يساوي مجموع نسبة المنصة ونسبة المعالج 100%.',
    invalidDateRange: 'نطاق التاريخ المدخل غير صالح.',
    couponNotFound: 'لم يتم العثور على الكوبون.',
    couponCodeExists: 'كود الكوبون مستخدم بالفعل.',
    couponSlugExists: 'معرف الكوبون مستخدم بالفعل.',
    couponCodeInvalid:
      'يمكن أن يتضمن كود الخصم أحرفًا وأرقامًا وشرطات وشرطات سفلية فقط.',
    practitionerCouponPercentageOnly:
      'أكواد خصم الممارس تدعم النسبة المئوية فقط.',
    practitionerCouponDiscountTooHigh:
      'خصم بروموكود الممارس لن يتجاوز 25%.',
    practitionerCouponImmutableAfterRedemption:
      'لا يمكن تغيير قيمة الخصم بعد وجود استخدامات سابقة.',
    practitionerCouponInvalidMoney: 'قيمة الخصم المدخلة غير صالحة.',
    couponUsageLimitBelowCurrentUsage:
      'لا يمكن تعيين حد استخدام أقل من عدد الاستخدامات الحالي.',
    couponNotActive: 'الكوبون غير نشط.',
    couponApprovalRequired: 'يجب اعتماد الكوبون قبل استخدامه.',
    couponNotStarted: 'لم يبدأ الكوبون بعد.',
    couponExpired: 'انتهت صلاحية الكوبون.',
    couponUsageLimitReached: 'تم الوصول إلى الحد الإجمالي لاستخدام الكوبون.',
    couponPerPatientLimitReached:
      'تم الوصول إلى حد استخدام الكوبون لهذا المريض.',
    couponScopeUnsupported:
      'نطاق هذا الكوبون غير مدعوم في هذه المرحلة الحالية.',
    couponNotApplicable: 'الكوبون غير قابل للتطبيق على هذه الجلسة.',
    invalidCouponShareSplit:
      'يجب أن يساوي مجموع حصة المنصة وحصة المعالج من الخصم 100%.',
  },
} as const;
