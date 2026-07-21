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
      credentialPrepared: 'تم رفع ملف المستند وتجهيزه بنجاح',
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
      countryReferenceDataMissing: 'لا توجد بيانات دول مفعلة في النظام حاليًا',
      countryNotFound: 'الدولة المحددة غير موجودة في النظام',
      countryInactive: 'الدولة المحددة غير مفعلة حاليًا',
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
  practitionerPublication: {
    success: {
      published: '\u062a\u0645 \u0646\u0634\u0631 \u0627\u0644\u0645\u062e\u062a\u0635 \u0628\u0646\u062c\u0627\u062d',
      unpublished: '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0646\u0634\u0631 \u0627\u0644\u0645\u062e\u062a\u0635 \u0628\u0646\u062c\u0627\u062d',
      alreadyPublished: '\u0627\u0644\u0645\u062e\u062a\u0635 \u0645\u0646\u0634\u0648\u0631 \u0628\u0627\u0644\u0641\u0639\u0644',
      alreadyUnpublished: '\u0627\u0644\u0645\u062e\u062a\u0635 \u063a\u064a\u0631 \u0645\u0646\u0634\u0648\u0631 \u0628\u0627\u0644\u0641\u0639\u0644',
    },
    errors: {
      notFound: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0645\u062e\u062a\u0635',
      reasonRequired: '\u064a\u062c\u0628 \u0625\u062f\u062e\u0627\u0644 \u0633\u0628\u0628 \u0639\u0646\u062f \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0646\u0634\u0631',
      reasonTooLong: '\u0633\u0628\u0628 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0646\u0634\u0631 \u0637\u0648\u064a\u0644 \u062c\u062f\u0627\u064b',
      notReady: '\u0627\u0644\u0645\u062e\u062a\u0635 \u063a\u064a\u0631 \u062c\u0627\u0647\u0632 \u0644\u0644\u0646\u0634\u0631',
    },
    blockers: {
      notApproved: '\u064a\u062c\u0628 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u062e\u062a\u0635 \u0623\u0648\u0644\u0627\u064b',
      accountInactive: '\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062e\u062a\u0635 \u0646\u0634\u0637\u0627\u064b',
      publicSlug: '\u064a\u062c\u0628 \u0625\u0636\u0627\u0641\u0629 \u0631\u0627\u0628\u0637 \u0639\u0627\u0645 \u0644\u0644\u0645\u0644\u0641',
      displayName: '\u064a\u062c\u0628 \u0625\u0636\u0627\u0641\u0629 \u0627\u0633\u0645 \u0638\u0627\u0647\u0631',
      professionalTitle: '\u064a\u062c\u0628 \u0625\u0636\u0627\u0641\u0629 \u0644\u0642\u0628 \u0645\u0647\u0646\u064a',
      bio: '\u064a\u062c\u0628 \u0625\u0636\u0627\u0641\u0629 \u0646\u0628\u0630\u0629 \u0645\u0647\u0646\u064a\u0629',
      specialty: '\u064a\u062c\u0628 \u0625\u0636\u0627\u0641\u0629 \u062a\u062e\u0635\u0635 \u0646\u0634\u0637 \u0648\u0627\u062d\u062f \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644',
    },
  },
};
