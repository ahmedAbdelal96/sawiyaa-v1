export const arAvailabilityCatalog = {
  success: {
    myAvailabilityFetched: 'تم جلب جدول الإتاحة بنجاح',
    weeklyAvailabilityReplaced: 'تم تحديث جدول الإتاحة الأسبوعي بنجاح',
    exceptionCreated: 'تم إنشاء استثناء الإتاحة بنجاح',
    exceptionUpdated: 'تم تحديث استثناء الإتاحة بنجاح',
    exceptionDeleted: 'تم حذف استثناء الإتاحة بنجاح',
  },
  errors: {
    practitionerNotFound: 'تعذر العثور على ملف المعالج',
    invalidTimezone: 'المنطقة الزمنية غير صالحة',
    invalidWeeklySlotRange: 'نطاق وقت الإتاحة الأسبوعية غير صالح',
    invalidGranularity: 'يجب أن تستخدم الإتاحة الأسبوعية فواصل قدرها 15 دقيقة',
    overlappingWeeklySlots:
      'جدول الإتاحة الأسبوعي يحتوي على تداخل في نفس اليوم',
    invalidExceptionRange: 'نطاق استثناء الإتاحة غير صالح',
    exceptionNotFound: 'تعذر العثور على استثناء الإتاحة',
    invalidRange: 'نطاق الإتاحة المطلوب غير صالح',
    rangeTooLarge:
      'نطاق الإتاحة المطلوب كبير جدًا في الإصدار الحالي ويجب ألا يتجاوز {{maxDays}} يومًا',
    publicAvailabilityNotFound: 'تعذر العثور على إتاحة المعالج العامة',
  },
};
