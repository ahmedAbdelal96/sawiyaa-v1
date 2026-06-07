export const arSessionsCatalog = {
  notifications: {
    sessionConfirmedTitle: 'تم تأكيد الجلسة',
    sessionConfirmedBody:
      'تم تأكيد جلستك في {{sessionAt}}.{{packageContext}} يمكنك التحضير للانضمام من صفحة الجلسات.',
    sessionConfirmedPractitionerTitle: 'جلسة جديدة مؤكدة',
    sessionConfirmedPractitionerBody:
      'تم تأكيد جلسة بتاريخ {{sessionAt}}.{{packageContext}}',
    sessionJoinAvailableTitle: 'جلستك جاهزة للدخول',
    sessionJoinAvailableBody:
      'تبدأ جلستك قريبًا.{{packageContext}} افتح صفحة الجلسة للانضمام بأمان.',
    sessionJoinAvailableEmailSubject: 'جلستك على فايد جاهزة للدخول',
    sessionJoinAvailableEmailTitle: 'جلستك جاهزة للدخول',
    sessionJoinAvailableEmailBody:
      'تبدأ جلستك قريبًا.{{packageContext}} افتح صفحة الجلسة للانضمام بأمان: {{sessionUrl}}',
    sessionCancelledTitle: 'تم إلغاء الجلسة',
    sessionCancelledBody: 'تم إلغاء جلستك المجدولة في {{sessionAt}}.',
    sessionCancelledPractitionerTitle: 'تم إلغاء الجلسة بواسطة المريض',
    sessionCancelledPractitionerBody:
      'قام المريض بإلغاء جلسة مجدولة في {{sessionAt}}.',
    sessionReminder60Title: 'تذكير بموعد الجلسة',
    sessionReminder60Body: 'جلستك ستبدأ بعد حوالي ساعة.',
    sessionReminder60PractitionerTitle: 'تذكير بموعد الجلسة',
    sessionReminder60PractitionerBody: 'لديك جلسة ستبدأ بعد حوالي ساعة.',
    sessionReminder15Title: 'اقترب موعد الجلسة',
    sessionReminder15Body: 'جلستك ستبدأ بعد حوالي 15 دقيقة.',
    sessionReminder15PractitionerTitle: 'اقترب موعد الجلسة',
    sessionReminder15PractitionerBody: 'لديك جلسة ستبدأ بعد حوالي 15 دقيقة.',
    packageSessionContext:
      ' الجلسة {{packageSessionIndex}} من أصل {{packageSessionCount}} ضمن الباقة الخاصة بك.',
  },
  errors: {
    patientNotFound: 'لم يتم العثور على ملف المريض',
    practitionerNotFound: 'لم يتم العثور على ملف المعالج',
    practitionerNotBookable: 'المعالج غير متاح للحجز المجدول حاليًا',
    sessionNotFound: 'لم يتم العثور على الجلسة',
    sessionAccessDenied: 'ليس لديك صلاحية الوصول إلى هذه الجلسة',
    invalidDuration: 'مدة الجلسة يجب أن تكون 30 أو 60 دقيقة',
    invalidScheduledStartAt: 'وقت بداية الجلسة غير صالح',
    scheduledStartMustBeFuture: 'يجب أن يكون وقت بداية الجلسة في المستقبل',
    unavailableTimeWindow: 'الفترة المطلوبة لا تتوافق مع توفر المعالج',
    practitionerTimeConflict: 'المعالج لديه جلسة متعارضة في هذا التوقيت',
    patientTimeConflict: 'المريض لديه جلسة متعارضة في هذا التوقيت',
    invalidStatusTransition: 'الانتقال من حالة {{from}} إلى {{to}} غير صالح',
    sessionAlreadyCancelled: 'تم إلغاء الجلسة بالفعل',
    sessionNotPendingPayment: 'يمكن فقط إنهاء صلاحية الجلسات المعلقة للدفع',
    cancellationPolicyMissing:
      'لا توجد سياسة إلغاء مفعلة لهذا النوع من الحجوزات {{bookingType}}',
    cancellationPolicyNoMatchingRule:
      'لا توجد قاعدة إلغاء نشطة مطابقة لوقت الإلغاء الحالي',
    cancellationNotAllowedByPolicy:
      'الإلغاء غير مسموح به وفقًا لسياسة الإلغاء الحالية',
    cancellationPolicyMissingSessionSchedule:
      'موعد الجلسة غير متاح لتقييم سياسة الإلغاء',
    cancellationPolicyMustHaveRules:
      'سياسة الإلغاء يجب أن تحتوي على قاعدة واحدة على الأقل',
    cancellationPolicyDuplicateRuleCode:
      'سياسة الإلغاء تحتوي على رمز قاعدة مكرر {{code}}',
    cancellationPolicyInvalidRuleWindow:
      'نافذة التوقيت غير صالحة لقاعدة الإلغاء {{code}}',
    cancellationPolicyInvalidRefundMode:
      'نمط الاسترجاع غير صالح لقاعدة الإلغاء {{code}}',
    cancellationPolicyInvalidRefundPercent:
      'نسبة الاسترجاع غير صالحة لقاعدة الإلغاء {{code}}',
    cancellationPolicyRefundPercentRequired:
      'قاعدة الإلغاء {{code}} تحتاج نسبة استرجاع',
    cancellationPolicyOverlappingRules:
      'تداخل غير صالح بين القاعدتين {{firstRuleCode}} و {{secondRuleCode}}',
    cancellationOriginalMethodRefundNotSupported:
      'استرجاع الإلغاء إلى وسيلة الدفع الأصلية غير مدعوم في هذه المرحلة',
  },
};
