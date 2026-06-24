export const arAvailabilityCatalog = {
  success: {
    myAvailabilityFetched: 'تم جلب جدول الإتاحة بنجاح',
    weeklyAvailabilityReplaced: 'تم تحديث جدول الإتاحة الأسبوعي بنجاح',
    exceptionCreated: 'تم إنشاء استثناء الإتاحة بنجاح',
    exceptionUpdated: 'تم تحديث استثناء الإتاحة بنجاح',
    exceptionDeleted: 'تم حذف استثناء الإتاحة بنجاح',
  },
  notifications: {
    weekEndingReminderTitle: 'انشر إتاحة الأسبوع القادم',
    weekEndingReminderBody:
      'هذا الجدول ينطبق فقط على هذا الأسبوع. انشر الأسبوع القادم للحفاظ على توفر الحجز. يمكن للمرضى الحجز فقط في الأسابيع المنشورة.',
    weekEndingReminderPushBody:
      'انشر إتاحة الأسبوع القادم ليستمر المرضى في الحجز.',
  },
  errors: {
    practitionerNotFound: 'تعذر العثور على ملف المعالج',
    invalidTimezone: 'المنطقة الزمنية غير صالحة',
    invalidWeeklySlotRange: 'نطاق وقت الإتاحة الأسبوعية غير صالح',
    invalidWeeklySlotDuration:
      'مدة خانة الإتاحة الأسبوعية يجب أن تطابق المدة المختارة',
    invalidDurationMinutes:
      'مدة خانة الإتاحة الأسبوعية يجب أن تكون 30 أو 60 دقيقة',
    invalidGranularity:
      'يجب أن تستخدم الإتاحة الأسبوعية فواصل قدرها 30 دقيقة',
    overlappingWeeklySlots:
      'جدول الإتاحة الأسبوعي يحتوي على تداخل في نفس اليوم',
    invalidExceptionRange: 'نطاق استثناء الإتاحة غير صالح',
    exceptionNotFound: 'تعذر العثور على استثناء الإتاحة',
    invalidRange: 'نطاق الإتاحة المطلوب غير صالح',
    rangeTooLarge:
      'نطاق الإتاحة المطلوب كبير جدًا في الإصدار الحالي ويجب ألا يتجاوز {{maxDays}} يومًا',
    publicAvailabilityNotFound:
      'تعذر العثور على إتاحة المعالج العامة',
  },
};
