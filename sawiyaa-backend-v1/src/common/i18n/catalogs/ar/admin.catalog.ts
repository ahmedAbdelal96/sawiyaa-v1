export const arAdminCatalog = {
  adminUsers: {
    success: {
      usersFetched: 'تم جلب المستخدمين الداخليين بنجاح',
      userFetched: 'تم جلب تفاصيل المستخدم الداخلي بنجاح',
      userCreated: 'تم إنشاء مستخدم داخلي بنجاح',
      userUpdated: 'تم تحديث بيانات المستخدم الداخلي بنجاح',
      statusUpdated: 'تم تحديث حالة المستخدم الداخلي بنجاح',
      rolesUpdated: 'تم تحديث أدوار المستخدم الداخلي بنجاح',
      permissionOverridesFetched: 'تم جلب استثناءات الصلاحيات بنجاح',
      permissionOverridesUpdated: 'تم تحديث استثناءات الصلاحيات بنجاح',
      sessionsRevoked: 'تم إنهاء جلسات المستخدم الداخلي بنجاح',
      tokensInvalidated: 'تم إبطال رموز المستخدم الداخلي بنجاح',
    },
    errors: {
      userNotFound: 'تعذر العثور على المستخدم الداخلي',
      emailAlreadyExists: 'البريد الإلكتروني مستخدم بالفعل',
      permissionNotFound: 'تعذر العثور على مفتاح الصلاحية',
      lastSuperAdminProtected:
        'لا يمكن تنفيذ هذا الإجراء لأنه سيؤدي إلى تعطيل آخر SUPER_ADMIN',
    },
  },
  practitionerApplications: {
    success: {
      applicationsFetched: 'تم جلب طلبات الممارسين بنجاح',
      applicationFetched: 'تم جلب تفاصيل طلب الممارس بنجاح',
      practitionerCreatedDirectly:
        'تم إنشاء حساب الممارس مباشرة من لوحة الإدارة بنجاح',
      credentialPrepared:
        'تم رفع ملف المستند وتجهيزه بنجاح',
      applicationApproved: 'تمت الموافقة على طلب الممارس بنجاح',
      applicationRejected: 'تم رفض طلب الممارس بنجاح',
      changesRequested: 'تم إرسال طلب تعديل بنجاح',
      practitionerAvatarUpdated: 'تم تحديث صورة الممارس بنجاح',
      practitionerAvatarRemoved: 'تم حذف صورة الممارس بنجاح',
    },
    errors: {
      applicationNotFound: 'تعذر العثور على طلب الممارس',
      invalidApplicationState: 'حالة طلب الممارس غير صالحة لهذا الإجراء',
      applicationAlreadyApproved: 'تمت الموافقة على طلب الممارس بالفعل',
      applicationAlreadyRejected: 'تم رفض طلب الممارس بالفعل',
      applicationNotReviewable: 'لا يمكن مراجعة طلب الممارس في حالته الحالية',
      directCreateMissingRequirements:
        'بيانات إنشاء الممارس مباشرة ناقصة ولازم تستكمل قبل الإنشاء',
      invalidCountryCode: 'رمز الدولة غير صالح أو غير نشط',
      invalidYearsOfExperience: 'سنوات الخبرة يجب أن تكون صفرًا أو أكثر',
      invalidSpecialtyIds: 'هناك تخصص واحد أو أكثر غير صالح أو غير نشط',
      invalidSpecialtyCategoryId: 'فئة التخصص الرئيسية غير صالحة أو غير نشطة',
      invalidSpecialtiesForCategory:
        'التخصصات المختارة لا تنتمي إلى فئة التخصص الرئيسية المحددة',
      credentialRejectionReasonRequired:
        '\u064a\u062c\u0628 \u0625\u062f\u062e\u0627\u0644 \u0633\u0628\u0628 \u0639\u0646\u062f \u0631\u0641\u0636 \u0627\u0644\u0645\u0633\u062a\u0646\u062f',
      practitionerNotFound: 'تعذر العثور على ملف الممارس',
    },
    notifications: {
      approvedTitle: 'تمت الموافقة على طلب انضمامك كممارس',
      approvedBody: 'مبروك، تمت الموافقة على طلب انضمامك كممارس.',
      rejectedTitle: 'تم رفض طلب انضمامك كممارس',
      rejectedBody: 'تم رفض طلب انضمامك كممارس. السبب: {{reason}}',
      changesRequestedTitle: 'تم طلب تعديل طلب انضمامك كممارس',
      changesRequestedBody:
        'يرجى تعديل بيانات الطلب ثم إعادة تقديمه. السبب: {{reason}}',
    },
  },
};
