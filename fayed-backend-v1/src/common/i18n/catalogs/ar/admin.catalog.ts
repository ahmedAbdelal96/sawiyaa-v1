export const arAdminCatalog = {
  practitionerApplications: {
    success: {
      applicationsFetched: 'تم جلب طلبات الممارسين بنجاح',
      applicationFetched: 'تم جلب تفاصيل طلب الممارس بنجاح',
      practitionerCreatedDirectly:
        'تم إنشاء حساب الممارس مباشرة من لوحة الإدارة بنجاح',
      applicationApproved: 'تمت الموافقة على طلب الممارس بنجاح',
      applicationRejected: 'تم رفض طلب الممارس بنجاح',
      practitionerAvatarUpdated: 'تم تحديث صورة الممارس بنجاح',
      practitionerAvatarRemoved: 'تم حذف صورة الممارس بنجاح',
    },
    errors: {
      applicationNotFound: 'تعذر العثور على طلب الممارس',
      invalidApplicationState: 'حالة طلب الممارس غير صالحة لهذا الإجراء',
      applicationAlreadyApproved: 'تمت الموافقة على طلب الممارس بالفعل',
      applicationAlreadyRejected: 'تم رفض طلب الممارس بالفعل',
      applicationNotReviewable:
        'لا يمكن مراجعة طلب الممارس في حالته الحالية',
      invalidCountryCode: 'رمز الدولة غير صالح أو غير نشط',
      invalidYearsOfExperience: 'سنوات الخبرة يجب أن تكون صفرًا أو أكثر',
      invalidSpecialtyIds:
        'هناك تخصص واحد أو أكثر غير صالح أو غير نشط',
      invalidSpecialtyCategoryId:
        'فئة التخصص الرئيسية غير صالحة أو غير نشطة',
      invalidSpecialtiesForCategory:
        'التخصصات المختارة لا تنتمي إلى فئة التخصص الرئيسية المحددة',
      practitionerNotFound: 'تعذر العثور على ملف الممارس',
    },
    notifications: {
      approvedTitle: 'تمت الموافقة على طلب انضمامك كممارس',
      approvedBody: 'مبروك، تمت الموافقة على طلب انضمامك كممارس.',
      rejectedTitle: 'تم رفض طلب انضمامك كممارس',
      rejectedBody: 'تم رفض طلب انضمامك كممارس. السبب: {{reason}}',
    },
  },
};

