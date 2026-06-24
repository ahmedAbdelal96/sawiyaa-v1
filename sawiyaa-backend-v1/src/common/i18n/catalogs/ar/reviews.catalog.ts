export const arReviewsCatalog = {
  success: {
    reviewSubmitted: 'تم إرسال تقييم الجلسة بنجاح',
    reviewsListed: 'تم جلب التقييمات بنجاح',
    reviewDetails: 'تم جلب تفاصيل التقييم بنجاح',
    reviewModerated: 'تم تطبيق إجراء المراجعة بنجاح',
    publicReviewsListed: 'تم جلب تقييمات المعالج العامة بنجاح',
  },
  errors: {
    patientProfileNotFound: 'لم يتم العثور على ملف المريض',
    sessionNotFoundForPatient: 'لم يتم العثور على الجلسة لهذا المريض',
    sessionNotCompleted: 'يمكن تقييم الجلسات المكتملة فقط',
    sessionNotPaid: 'يجب أن تكون الجلسة مدفوعة قبل إرسال التقييم',
    reviewAlreadyExists: 'يوجد تقييم بالفعل لهذه الجلسة',
    reviewNotFound: 'لم يتم العثور على التقييم',
    invalidModerationTransition: 'انتقال حالة مراجعة التقييم غير صالح',
    publicPractitionerNotFound:
      'لم يتم العثور على المعالج أو أن ملفه غير متاح بشكل عام',
  },
};
