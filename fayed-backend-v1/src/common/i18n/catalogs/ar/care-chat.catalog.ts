export const arCareChatCatalog = {
  notifications: {
    requestApprovedTitle: 'تمت الموافقة على محادثة الرعاية',
    requestApprovedBody:
      'تمت الموافقة على طلب محادثة الرعاية. افتح المحادثة للمتابعة.',
    requestRejectedTitle: 'لم تتم الموافقة على محادثة الرعاية',
    requestRejectedBody:
      'لم تتم الموافقة على طلب محادثة الرعاية. راجع تفاصيل الطلب لمعرفة الخطوة التالية.',
    requestRevokedTitle: 'تم تحديث محادثة الرعاية',
    requestRevokedBody:
      'تم تحديث وصول محادثة الرعاية. افتح المحادثة أو تفاصيل الطلب لمراجعة الحالة الحالية.',
  },
  success: {
    requestCreated: 'تم إنشاء طلب محادثة الرعاية بنجاح',
    requestListed: 'تم جلب طلبات محادثة الرعاية بنجاح',
    requestDetails: 'تم جلب تفاصيل طلب محادثة الرعاية بنجاح',
    requestDecided: 'تم تطبيق قرار طلب محادثة الرعاية بنجاح',
    requestRevoked: 'تم سحب موافقة محادثة الرعاية بنجاح',
    conversationDetails: 'تم جلب تفاصيل محادثة الرعاية بنجاح',
    messageSent: 'تم إرسال رسالة محادثة الرعاية بنجاح',
  },
  errors: {
    patientProfileNotFound: 'لم يتم العثور على ملف المريض',
    practitionerProfileNotFound: 'لم يتم العثور على ملف المعالج',
    practitionerNotFound: 'لم يتم العثور على معالج صالح لطلب محادثة الرعاية',
    requestNotFound: 'لم يتم العثور على طلب موافقة محادثة الرعاية',
    conversationNotFound: 'لم يتم العثور على محادثة الرعاية',
    invalidLinkedSession: 'الجلسة المرتبطة غير صالحة لهذا المريض/المعالج',
    activeRequestAlreadyExists:
      'يوجد طلب محادثة رعاية نشط بالفعل لهذا المريض والمعالج',
    requestExpired: 'انتهت صلاحية طلب موافقة محادثة الرعاية',
    invalidApprovalDecisionTransition: 'انتقال قرار الموافقة غير صالح',
    invalidRevokeTransition: 'انتقال سحب الموافقة غير صالح',
    conversationInactiveForSend:
      'محادثة الرعاية غير نشطة؛ لا يمكن إرسال رسائل جديدة',
  },
};
