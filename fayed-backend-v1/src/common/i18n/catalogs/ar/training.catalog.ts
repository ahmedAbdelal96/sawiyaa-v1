export const arTrainingCatalog = {
  errors: {
    notFound: 'لم يتم العثور على التدريب',
    scheduleNotFound: 'لم يتم العثور على جدول التدريب',
    invalidPublishTransition: 'انتقال نشر التدريب غير صالح',
    invalidArchiveTransition: 'انتقال أرشفة التدريب غير صالح',
    archivedReadOnly: 'لا يمكن تعديل تدريب مؤرشف',
    localeRequiredForTranslationUpdate: 'اللغة مطلوبة عند تعديل حقول الترجمة',
    slugAlreadyExists: 'معرف التدريب مستخدم بالفعل',
    scheduleCodeAlreadyExists: 'رمز الجدول مستخدم بالفعل',
    enrollmentWindowRequired: 'نافذة التسجيل مطلوبة',
    sessionWindowRequired: 'نطاق وقت الجلسة مطلوب',
    invalidEnrollmentWindow: 'نافذة وقت التسجيل غير صالحة',
    invalidSessionWindow: 'نطاق وقت الجلسة غير صالح',
    enrollmentMustCloseBeforeStart: 'يجب إغلاق التسجيل قبل بدء الموعد',
    invalidCapacity: 'السعة يجب أن تكون أكبر من صفر',
    cannotOpenPastSchedule: 'لا يمكن فتح التسجيل لجدول بدأ بالفعل',
    invalidScheduleStatusTransition: 'انتقال حالة الجدول غير صالح',
    capacityBelowCurrentEnrollments:
      'لا يمكن أن تكون السعة أقل من عدد المسجلين الحالي',
    patientNotFound: 'لم يتم العثور على ملف المريض',
    enrollmentNotFound: 'لم يتم العثور على التسجيل',
    enrollmentAlreadyExists: 'يوجد تسجيل مسبق لهذا الجدول',
    courseNotEnrollable: 'الدورة غير متاحة للتسجيل حالياً',
    scheduleNotEnrollable: 'الجدول غير مفتوح للتسجيل حالياً',
    missingSchedulePricing: 'تسعير الجدول أو الدورة غير مكتمل للدفع',
    unsupportedEnrollmentCurrency:
      'عملة التسجيل غير مدعومة بسياسة التوجيه الحالية',
    invalidExternalRoomProvider: 'مزود غرفة الانضمام غير صالح',
    externalJoinUrlRequired: 'رابط الانضمام الخارجي مطلوب عند تحديد المزود',
    externalRoomProviderRequired:
      'مزود الغرفة الخارجية مطلوب عند تحديد رابط الانضمام',
    attendanceMutationNotAllowedForEnrollmentState:
      'لا يمكن تسجيل الحضور في حالة التسجيل الحالية',
    attendanceMutationNotAllowedForScheduleState:
      'لا يمكن تسجيل الحضور في حالة الجدول الحالية',
    attendanceCannotBeMarkedBeforeStart: 'لا يمكن تسجيل الحضور قبل بدء الموعد',
  },
  notifications: {
    enrollmentConfirmedTitle: 'تم تأكيد تسجيل التدريب',
    enrollmentConfirmedBody: 'تم تأكيد تسجيلك في التدريب بتاريخ {sessionAt}.',
    scheduleReminderTitle: 'التدريب سيبدأ قريباً',
    scheduleReminderBody: 'تذكير: سيبدأ تدريبك في {sessionAt}.',
  },
};
