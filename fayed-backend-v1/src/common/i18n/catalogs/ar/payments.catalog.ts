export const arPaymentsCatalog = {
  notifications: {
    paymentSucceededTitle: 'اكتمل الدفع',
    paymentSucceededBody: 'تم دفع مبلغ {{amount}} {{currencyCode}} بنجاح.',
    paymentFailedTitle: 'فشلت عملية الدفع',
    paymentFailedBody: 'تعذرت عملية الدفع. يرجى إعادة المحاولة من صفحة الجلسة.',
    refundRequestedTitle: 'تم استلام طلب الاسترجاع',
    refundRequestedBody:
      'تم استلام طلب استرجاع مبلغ {{amount}} {{currencyCode}}.',
    refundSucceededTitle: 'اكتمل الاسترجاع',
    refundSucceededBody: 'تم استرجاع مبلغ {{amount}} {{currencyCode}} بنجاح.',
    refundFailedTitle: 'فشل الاسترجاع',
    refundFailedBody:
      'تعذر تنفيذ الاسترجاع الآن. يمكنك التواصل مع الدعم إذا لزم.',
  },
  errors: {
    patientNotFound: 'لم يتم العثور على ملف المريض',
    sessionNotFound: 'لم يتم العثور على الجلسة',
    sessionNotPayable: 'هذه الجلسة غير قابلة للدفع حاليًا',
    sessionPaymentExpired: 'انتهت مهلة الدفع الخاصة بهذه الجلسة',
    paymentNotFound: 'لم يتم العثور على عملية الدفع',
    paymentAlreadyCompleted: 'توجد عملية دفع ناجحة بالفعل لهذه الجلسة',
    activePaymentAlreadyExists: 'توجد محاولة دفع نشطة بالفعل لهذه الجلسة',
    pricingUnavailable: 'سعر الجلسة غير متاح',
    currencyUnavailable: 'عملة الدفع غير متاحة',
    invalidStatusTransition:
      'الانتقال من حالة الدفع {{from}} إلى {{to}} غير صالح',
    providerNotFound: 'لم يتم العثور على مزود الدفع {{provider}}',
    providerNotConfigured: 'مزود الدفع {{provider}} غير مهيأ',
    providerUnavailable: 'مزود الدفع {{provider}} غير متاح حاليًا',
    providerWebhookNotConfigured:
      'سر webhook الخاص بمزود الدفع {{provider}} غير مهيأ',
    providerInitializationFailed:
      'فشل مزود الدفع {{provider}} في تهيئة عملية الدفع',
    providerNotImplemented: 'مزود الدفع {{provider}} غير مدعوم في هذه المرحلة',
    invalidWebhookSignature: 'توقيع webhook الخاص بالدفع غير صالح',
  },
};
