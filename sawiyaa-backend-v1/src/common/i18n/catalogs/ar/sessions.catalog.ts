export const arSessionsCatalog = {
  notifications: {
    sessionConfirmedTitle: 'تم تأكيد الجلسة',
    sessionConfirmedBody:
      'تم تأكيد جلستك في {{sessionAt}}.{{packageContext}} يمكنك التحضير للانضمام من صفحة الجلسات.',
    sessionConfirmedPushBody: 'تم تأكيد جلستك. افتح صفحة الجلسات للتحضير.',
    sessionConfirmedPractitionerTitle: 'جلسة جديدة مؤكدة',
    sessionConfirmedPractitionerBody:
      'تم تأكيد جلسة بتاريخ {{sessionAt}}.{{packageContext}}',
    sessionConfirmedPractitionerPushBody:
      'تم تأكيد جلسة جديدة. راجع التفاصيل واستعد للانضمام.',
    sessionJoinAvailableTitle: 'جلستك جاهزة للدخول',
    sessionJoinAvailableBody:
      'تبدأ جلستك قريبًا.{{packageContext}} افتح صفحة الجلسة للانضمام بأمان.',
    sessionJoinAvailablePushBody:
      'جلستك جاهزة. افتح صفحة الجلسة للانضمام بأمان.',
    sessionJoinAvailableEmailSubject: 'جلستك على سويّة جاهزة للدخول',
    sessionJoinAvailableEmailTitle: 'جلستك جاهزة للدخول',
    sessionJoinAvailableEmailBody:
      'تبدأ جلستك قريبًا.{{packageContext}} افتح صفحة الجلسة للانضمام بأمان.',
    sessionCancelledTitle: 'تم إلغاء الجلسة',
    sessionCancelledBody: 'تم إلغاء جلستك المجدولة في {{sessionAt}}.',
    sessionCancelledPushBody: 'تم إلغاء جلستك.',
    sessionCancelledPractitionerTitle: 'تم إلغاء الجلسة بواسطة المريض',
    sessionCancelledPractitionerBody:
      'قام المريض بإلغاء جلسة مجدولة في {{sessionAt}}.',
    sessionCancelledPractitionerPushBody: 'قام المريض بإلغاء جلسة.',
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
    sessionAlreadyNoShow: 'تم تسجيل الجلسة كعدم حضور بالفعل',
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
    packageEntitlementDecisionNotPackageSession:
      '\u0647\u0630\u0627 \u0627\u0644\u0642\u0631\u0627\u0631 \u062e\u0627\u0635 \u0628\u062c\u0644\u0633\u0629 \u0645\u062f\u0639\u0648\u0645\u0629 \u0628\u062d\u0632\u0645\u0629 \u0641\u0642\u0637',
    packageEntitlementDecisionNotAllowedStatus:
      '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0633\u062c\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0642\u0631\u0627\u0631 \u0644\u0647\u0630\u0647 \u0627\u0644\u062d\u0627\u0644\u0629',
    packageEntitlementDecisionInvalidCombination:
      '\u0647\u0630\u0627 \u0627\u0644\u062a\u0631\u0643\u064a\u0628 \u0645\u0646 \u0627\u0644\u0642\u0631\u0627\u0631 \u063a\u064a\u0631 \u0645\u0633\u0645\u0648\u062d \u0628\u0647',
    packageEntitlementDecisionAlreadyExists:
      '\u064a\u0648\u062c\u062f \u0642\u0631\u0627\u0631 \u0628\u062f\u064a\u0644 \u0627\u0644\u062d\u0632\u0645\u0629 \u0633\u0627\u0628\u0642\u0627\u064b \u0644\u0647\u0630\u0647 \u0627\u0644\u062c\u0644\u0633\u0629',
    packageEntitlementDecisionReviewUnavailable:
      '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u062d\u0627\u0633\u0628\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062c\u0644\u0633\u0629',
  },
  // Phase 4A — Manual session decision types
  decisionTypes: {
    MARK_COMPLETED: 'تحديد مكتمل',
    MARK_PATIENT_NO_SHOW: 'تحديد عدم حضور المريض',
    MARK_PRACTITIONER_NO_SHOW: 'تحديد عدم حضور المعالج',
    MARK_BOTH_NO_SHOW: 'تحديد عدم حضور الطرفين',
    MARK_TECHNICAL_REVIEW: 'تحديد مراجعة تقنية',
    MARK_INSUFFICIENT_EVIDENCE: 'تحديد أدلة غير كافية',
  },
};
