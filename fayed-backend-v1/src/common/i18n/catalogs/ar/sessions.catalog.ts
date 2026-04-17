export const arSessionsCatalog = {
  notifications: {
    sessionConfirmedTitle: 'Session confirmed',
    sessionConfirmedBody:
      'Your session is confirmed for {{sessionAt}}. You can prepare to join from your sessions screen.',
    sessionConfirmedPractitionerTitle: 'New confirmed session',
    sessionConfirmedPractitionerBody:
      'A session has been confirmed for {{sessionAt}}.',
    sessionCancelledTitle: 'Session cancelled',
    sessionCancelledBody:
      'Your session scheduled at {{sessionAt}} was cancelled.',
    sessionCancelledPractitionerTitle: 'Session cancelled by patient',
    sessionCancelledPractitionerBody:
      'A patient cancelled a session scheduled at {{sessionAt}}.',
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
    invalidStatusTransition:
      'الانتقال من حالة {{from}} إلى {{to}} غير صالح',
    sessionAlreadyCancelled: 'تم إلغاء الجلسة بالفعل',
    sessionNotPendingPayment:
      'يمكن فقط إنهاء صلاحية الجلسات المعلقة للدفع',
  },
};
