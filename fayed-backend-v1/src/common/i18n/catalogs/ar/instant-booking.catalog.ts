export const arInstantBookingCatalog = {
  errors: {
    patientNotFound: 'لم يتم العثور على ملف المريض',
    practitionerNotFound: 'لم يتم العثور على ملف المعالج',
    practitionerNotEligible: 'المعالج غير مؤهل للحجز الفوري',
    practitionerNotOnline: 'المعالج غير متصل حاليًا',
    practitionerBusy: 'المعالج مشغول حاليًا',
    practitionerNotAvailableNow:
      'المعالج غير متاح حاليًا لنافذة حجز فوري مناسبة',
    instantBookingDisabled:
      'المعالج لا يقبل الحجوزات الفورية الآن',
    invalidSessionMode:
      'الحجز الفوري يدعم فقط VIDEO أو AUDIO في الإصدار الحالي',
    requestNotFound: 'لم يتم العثور على طلب الحجز الفوري',
    pendingRequestAlreadyExists:
      'يوجد بالفعل طلب حجز فوري معلق لهذا المعالج',
    invalidStatusTransition:
      'الانتقال من حالة {{from}} إلى {{to}} في طلب الحجز الفوري غير صالح',
    requestAlreadyCancelled: 'تم إلغاء طلب الحجز الفوري بالفعل',
    requestAlreadyAccepted: 'تم قبول طلب الحجز الفوري بالفعل',
    requestAlreadyRejected: 'تم رفض طلب الحجز الفوري بالفعل',
  },
};
