export const arSupportCatalog = {
  success: {
    ticketCreated: 'تم إنشاء تذكرة الدعم بنجاح',
    ticketListed: 'تم جلب تذاكر الدعم بنجاح',
    ticketDetails: 'تم جلب تفاصيل تذكرة الدعم بنجاح',
    messageAdded: 'تمت إضافة رسالة الدعم بنجاح',
    internalNoteAdded: 'تمت إضافة الملاحظة الداخلية بنجاح',
    statusUpdated: 'تم تحديث حالة التذكرة بنجاح',
    assignmentUpdated: 'تم تحديث إسناد التذكرة بنجاح',
  },
  errors: {
    supportRoleRequired: 'يلزم دور دعم للوصول إلى هذا المسار',
    patientProfileNotFound: 'ملف المريض مطلوب للوصول إلى الدعم',
    practitionerProfileNotFound: 'ملف المعالج مطلوب للوصول إلى الدعم',
    ticketNotFound: 'لم يتم العثور على تذكرة الدعم',
    ticketForbidden: 'ليس لديك صلاحية الوصول إلى هذه التذكرة',
    invalidStatusTransition: 'انتقال حالة التذكرة غير صالح',
    invalidAssignedUser: 'يجب أن يكون المستخدم المعيّن بدور أدمن أو دعم',
    invalidRelatedSession: 'الجلسة المرتبطة غير صالحة للمالك الحالي',
    invalidRelatedPayment: 'الدفعة المرتبطة غير صالحة للمالك الحالي',
    invalidRelatedInstantBookingRequest:
      'طلب الحجز الفوري المرتبط غير صالح للمالك الحالي',
    invalidRelatedMatchingSession:
      'جلسة المطابقة المرتبطة غير صالحة للمالك الحالي',
    invalidRelatedAssessmentSubmission:
      'إرسال التقييم المرتبط غير صالح للمالك الحالي',
    unsupportedPractitionerRelatedEntity:
      'نوع الكيان المرتبط هذا غير مدعوم لتذاكر دعم المعالجين',
  },
};
