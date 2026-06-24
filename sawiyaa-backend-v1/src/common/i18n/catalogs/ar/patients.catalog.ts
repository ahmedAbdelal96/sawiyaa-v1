export const arPatientsCatalog = {
  success: {
    profileFetched: 'تم جلب ملف المريض بنجاح',
    profileUpdated: 'تم تحديث ملف المريض بنجاح',
    onboardingCompleted: 'تم إكمال تهيئة ملف المريض بنجاح',
    avatarUpdated: 'تم تحديث الصورة الشخصية بنجاح',
    avatarRemoved: 'تم حذف الصورة الشخصية بنجاح',
  },
  errors: {
    userNotFound: 'تعذر العثور على مستخدم المريض',
    profileNotFound: 'تعذر العثور على ملف المريض',
    invalidProfileState:
      'ملف المريض لا يحقق الحد الأدنى المطلوب لإكمال التهيئة',
    profileAccessDenied: 'غير مسموح لك بالوصول إلى ملف هذا المريض',
    countryNotFound: 'رمز الدولة غير صالح أو غير نشط',
    avatarFileRequired: 'يرجى اختيار صورة قبل المتابعة',
    avatarInvalidType: 'نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP',
    avatarFileTooLarge: 'حجم الصورة أكبر من الحد المسموح (5MB)',
    avatarNotFound: 'لا توجد صورة شخصية حالياً',
  },
};
