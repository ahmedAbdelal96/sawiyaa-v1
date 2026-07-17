export const arAcademyCatalog = {
  academyProgram: {
    errors: {
      notFound: 'لم يتم العثور على البرنامج الأكاديمي',
      registrationClosed: 'التسجيل في البرنامج الأكاديمي مغلق',
      seatCapacityReached: 'تم الوصول إلى العدد المستهدف للمتدربين في البرنامج الأكاديمي',
      missingPricing: 'بيانات تسعير البرنامج الأكاديمي مطلوبة',
      unsupportedCurrency:
        'عملة البرنامج الأكاديمي غير مدعومة حسب سياسة التوجيه الحالية',
      enrollmentNotFound: 'لم يتم العثور على تسجيل البرنامج الأكاديمي',
      learnersRestricted:
        'التسجيل في البرنامج الأكاديمي متاح فقط للمرضى والممارسين',
      learnerContactAlreadyExists:
        'رقم الهاتف أو واتساب أو البريد الإلكتروني مستخدم بالفعل لدى متدرب آخر',
      enrollmentAlreadyExists:
        'يوجد تسجيل مسبق لهذا البرنامج الأكاديمي والمتدرب',
      enrollmentCancellationReasonRequired:
        'يجب إدخال سبب عند إلغاء تسجيل الدورة التدريبية',
      legacyEnrollmentDisabled:
        'التسجيل القديم في نظام التدريب معطل',
      invalidPrice: 'سعر البرنامج الأكاديمي غير صالح',
      invalidDate: 'تاريخ البرنامج الأكاديمي غير صالح',
      invalidWindow: 'نافذة تاريخ البرنامج الأكاديمي غير صالحة',
      missingSlugSource: 'مصدر إنشاء رابط البرنامج الأكاديمي غير متوفر',
      categoryNotFound: 'لم يتم العثور على تصنيف البرنامج الأكاديمي',
      archivedProgramCannotBePublished:
        'لا يمكن نشر برنامج أكاديمي مؤرشف',
      archivedReadOnly: 'لا يمكن تعديل برنامج أكاديمي مؤرشف',
      archiveReasonRequired:
        'يجب إدخال سبب قبل أرشفة البرنامج الأكاديمي',
      sessionNotFound: 'لم يتم العثور على جلسة البرنامج الأكاديمي',
      attendanceInvalidStatus: 'حالة الحضور للبرنامج الأكاديمي غير صالحة',
      attendanceCorrectionReasonRequired:
        'يجب إدخال سبب عند تصحيح الحضور',
      certificateFileRequired: 'يرجى اختيار ملف PDF للشهادة قبل الرفع',
      certificateInvalidType: 'يمكن رفع ملفات PDF للشهادة فقط',
      certificateFileTooLarge:
        'ملف الشهادة أكبر من المسموح به. الحد الأقصى 10 ميجابايت',
      certificateEnrollmentNotEligible:
        'يمكن رفع الشهادة فقط للتسجيل المؤكد',
      certificateNotFound: 'لم يتم العثور على ملف الشهادة',
      coverFileRequired: 'يرجى اختيار صورة غلاف قبل الرفع',
      coverInvalidType: 'يمكن رفع صور JPG أو PNG أو WebP فقط',
      coverFileTooLarge: 'حجم ملف صورة الغلاف كبير جدًا. الحد الأقصى 10 ميجابايت',
    },
  },
  errors: {
    notFound: 'لم يتم العثور على البرنامج التعليمي',
    archivedReadOnly: 'لا يمكن تعديل برنامج مؤرشف',
    missingLectureSchedule: 'يجب تحديد جدول المحاضرات قبل النشر',
    invalidPlanWindow: 'نافذة البرنامج الزمنية غير صالحة',
    invalidLectureWindow: 'نافذة وقت الجلسة غير صالحة',
    missingLecturePlan: 'خطة المحاضرة مطلوبة',
    lectureLimitReached: 'تم الوصول إلى الحد الأقصى للمحاضرات',
    lectureOverlap: 'وقت المحاضرة يتداخل مع محاضرة أخرى',
    lectureOrderTaken: 'ترتيب المحاضرة مستخدم بالفعل',
    missingPlan: 'الخطة مطلوبة',
    invalidDuration: 'المدة غير صالحة',
    invalidLectureCount: 'عدد المحاضرات غير صالح',
    missingPricing: 'بيانات التسعير مطلوبة',
    unsupportedCurrency: 'عملة البرنامج غير مدعومة حسب سياسة التوجيه الحالية',
    enrollmentNotFound: 'لم يتم العثور على التسجيل',
    learnersRestricted:
      'يمكن الاشتراك فقط للمرضى والممارسين',
    learnerContactAlreadyExists:
      'رقم الهاتف أو واتساب أو البريد الإلكتروني مستخدم بالفعل لدى متدرب آخر',
    enrollmentAlreadyExists:
      'يوجد تسجيل مسبق لهذا البرنامج والمتدرب',
  },
  notifications: {
    enrollmentConfirmedTitle: 'تم تأكيد تسجيل البرنامج',
    enrollmentConfirmedBody: 'تم تأكيد تسجيلك في البرنامج بتاريخ {sessionAt}.',
    scheduleReminderTitle: 'سيبدأ البرنامج قريبًا',
    scheduleReminderBody: 'تذكير: سيبدأ البرنامج في {sessionAt}.',
    targetLearnerThresholdExceededTitle:
      'تجاوز العدد المستهدف للمتدربين',
    targetLearnerThresholdExceededBody:
      'تجاوز عدد المتدربين في {programTitle} العدد المستهدف {targetLearnerCount}. عدد المتدربين النشطين حاليًا: {activeLearnerCount}.',
  },
};
