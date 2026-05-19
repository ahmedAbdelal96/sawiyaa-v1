import type {
  AdminPractitionerApplicationSummary,
  AdminPractitionerCredential,
  AdminReadinessSnapshot,
  PractitionerApplicationDetails,
} from "../types/practitioner-applications.types";
import type {
  CredentialType,
  PractitionerApplicationCompletionIssue,
  PractitionerApplicationCompletionViewModel,
  PractitionerApplicationStatus,
  PractitionerPayoutDestination,
} from "@/features/practitioners/types/practitioners.types";

export type AdminReviewDecisionStep =
  | "identity"
  | "professional"
  | "documents"
  | "payout"
  | "decision";

export type AdminReviewDecisionReason = {
  code: string;
  label: string;
  description?: string;
  actionLabel?: string;
  step: AdminReviewDecisionStep;
  severity: "info" | "warning" | "blocking";
};

export type DerivedAdminReviewDecision = {
  canApprove: boolean;
  statusTone: "success" | "warning" | "danger" | "info" | "neutral";
  statusLabel: string;
  statusDescription: string;
  approveDisabledReasons: AdminReviewDecisionReason[];
  missingFromPractitioner: AdminReviewDecisionReason[];
  needsAdminReview: AdminReviewDecisionReason[];
  rejectedOrNeedsCorrection: AdminReviewDecisionReason[];
  readyChecks: AdminReviewDecisionReason[];
  internalInconsistencies: AdminReviewDecisionReason[];
  summaryChips: string[];
};

type Params = {
  locale: string;
  application: AdminPractitionerApplicationSummary;
  readinessSnapshot: AdminReadinessSnapshot;
  completion: PractitionerApplicationCompletionViewModel;
  credentials: AdminPractitionerCredential[];
  payoutDestination: PractitionerPayoutDestination | null;
  livePayoutDestination: PractitionerPayoutDestination | null;
  reviewAvatarUrl: string | null;
  applicant: PractitionerApplicationDetails["applicant"];
  liveApplicant: PractitionerApplicationDetails["liveApplicant"];
  profile: PractitionerApplicationDetails["profile"];
};

function isArabic(locale: string) {
  return locale === "ar";
}

function uniqueReasons(reasons: AdminReviewDecisionReason[]) {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = `${reason.code}:${reason.label}:${reason.step}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueChips(chips: Array<string | null | undefined>) {
  const normalized = chips
    .map((chip) => chip?.trim())
    .filter((chip): chip is string => Boolean(chip && chip !== "-" && chip !== "0" && chip !== "undefined"));
  return Array.from(new Set(normalized));
}

function getCredentialTypeLabel(locale: string, type: CredentialType) {
  const ar = isArabic(locale);
  const labels: Record<CredentialType, string> = {
    LICENSE: ar ? "الترخيص المهني" : "Professional license",
    DEGREE: ar ? "الشهادة العلمية" : "Academic certificate",
    CERTIFICATION: ar ? "شهادة الاعتماد" : "Certification",
    NATIONAL_ID_FRONT: ar ? "بطاقة الهوية - الوجه الأمامي" : "National ID front",
    NATIONAL_ID_BACK: ar ? "بطاقة الهوية - الوجه الخلفي" : "National ID back",
    NATIONAL_ID: ar ? "بطاقة الهوية" : "National ID",
    PASSPORT: ar ? "جواز السفر" : "Passport",
    MEMBERSHIP: ar ? "العضوية" : "Membership",
    OTHER: ar ? "مستند آخر" : "Other document",
  };
  return labels[type];
}

function getIssueReason(locale: string, issue: PractitionerApplicationCompletionIssue): AdminReviewDecisionReason | null {
  const ar = isArabic(locale);
  switch (issue.code) {
    case "QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "شهادة علمية غير مرفوعة" : "Academic certificate is missing",
        description: ar ? "الطلب ينقصه مستند الشهادة العلمية المطلوب." : "The required academic certificate has not been uploaded.",
        actionLabel: ar ? "اطلب رفع الشهادة العلمية" : "Request the academic certificate",
        step: "documents",
        severity: "blocking",
      };
    case "DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "مستند الهوية غير مكتمل" : "Identity evidence is incomplete",
        description: ar ? "يلزم جواز سفر أو بطاقتا الهوية الأمامية والخلفية." : "A passport or both sides of the national ID are required.",
        actionLabel: ar ? "اطلب استكمال مستند الهوية" : "Request the identity document",
        step: "documents",
        severity: "blocking",
      };
    case "DOCUMENTS_NATIONAL_ID_FRONT_MISSING":
      return {
        code: issue.code,
        label: ar ? "صورة البطاقة الأمامية غير مرفوعة" : "National ID front is missing",
        description: ar ? "الوجه الأمامي لبطاقة الهوية غير موجود." : "The front side of the national ID is missing.",
        actionLabel: ar ? "اطلب رفع الوجه الأمامي" : "Request the front side",
        step: "documents",
        severity: "blocking",
      };
    case "DOCUMENTS_NATIONAL_ID_BACK_MISSING":
      return {
        code: issue.code,
        label: ar ? "صورة البطاقة الخلفية غير مرفوعة" : "National ID back is missing",
        description: ar ? "الوجه الخلفي لبطاقة الهوية غير موجود." : "The back side of the national ID is missing.",
        actionLabel: ar ? "اطلب رفع الوجه الخلفي" : "Request the back side",
        step: "documents",
        severity: "blocking",
      };
    case "PAYOUT_DESTINATION_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "بيانات استلام المستحقات غير مكتملة" : "Payout details are incomplete",
        description: ar ? "بيانات المستحقات المطلوبة غير موجودة." : "Required payout details are missing.",
        actionLabel: ar ? "اطلب استكمال بيانات المستحقات" : "Request payout details",
        step: "payout",
        severity: "blocking",
      };
    case "PAYOUT_ACCOUNT_HOLDER_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "اسم صاحب الحساب غير موجود" : "Account holder name is missing",
        description: ar ? "اسم صاحب الحساب مطلوب لاعتماد بيانات المستحقات." : "The account holder name is required for payout review.",
        actionLabel: ar ? "اطلب اسم صاحب الحساب" : "Request the account holder name",
        step: "payout",
        severity: "blocking",
      };
    case "PAYOUT_BANK_NAME_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "اسم البنك غير موجود" : "Bank name is missing",
        description: ar ? "اسم البنك مطلوب لإكمال بيانات المستحقات." : "The bank name is required to complete the payout details.",
        actionLabel: ar ? "اطلب اسم البنك" : "Request the bank name",
        step: "payout",
        severity: "blocking",
      };
    case "PAYOUT_BANK_ACCOUNT_REQUIRED":
      return {
        code: issue.code,
        label: ar ? "رقم الحساب البنكي غير موجود" : "Bank account number is missing",
        description: ar ? "رقم الحساب البنكي مطلوب لاعتماد المستحقات." : "The bank account number is required for payout approval.",
        actionLabel: ar ? "اطلب رقم الحساب البنكي" : "Request the bank account number",
        step: "payout",
        severity: "blocking",
      };
    case "DOCUMENTS_CREDENTIAL_NOT_APPROVED":
      return {
        code: issue.code,
        label: ar ? "مستندات مرفوعة وتحتاج مراجعة الإدارة" : "Uploaded documents still need admin review",
        description: ar ? "يوجد مستند واحد أو أكثر تم رفعه ولم تتم مراجعته بعد." : "One or more uploaded documents still need admin review.",
        actionLabel: ar ? "راجع المستندات من خطوة المستندات" : "Review the documents in the documents step",
        step: "documents",
        severity: "warning",
      };
    case "APPLICATION_APPROVED":
      return {
        code: issue.code,
        label: ar ? "تم اعتماد الطلب بالفعل" : "The application is already approved",
        description: ar ? "الطلب في حالة اعتماد نهائية، لذلك لا يمكن اعتمادُه مرة أخرى." : "This application is already in an approved state and cannot be approved again.",
        actionLabel: ar ? "راجع حالة الطلب الحالية" : "Review the current application state",
        step: "decision",
        severity: "info",
      };
    case "APPLICATION_REJECTED":
      return {
        code: issue.code,
        label: ar ? "تم رفض الطلب بالفعل" : "The application is already rejected",
        description: ar ? "هذا الطلب في حالة رفض نهائية." : "This application is already in a rejected state.",
        actionLabel: ar ? "راجع قرار الرفض الحالي" : "Review the current rejection decision",
        step: "decision",
        severity: "info",
      };
    case "APPLICATION_CHANGES_REQUESTED":
      return {
        code: issue.code,
        label: ar ? "تم إرسال طلب تعديل بالفعل" : "Changes have already been requested",
        description: ar ? "يوجد طلب تعديل مفتوح لهذا الطلب بالفعل." : "There is already an open request for changes on this application.",
        actionLabel: ar ? "راجع طلب التعديل الحالي" : "Review the existing change request",
        step: "decision",
        severity: "info",
      };
    case "APPLICATION_ARCHIVED":
      return {
        code: issue.code,
        label: ar ? "الطلب مؤرشف" : "The application is archived",
        description: ar ? "الطلب في حالة أرشفة ولا يمكن اتخاذ قرار جديد عليه الآن." : "This application is archived and cannot receive a new decision right now.",
        actionLabel: ar ? "راجع حالة الأرشفة" : "Review the archive state",
        step: "decision",
        severity: "info",
      };
    default:
      return null;
  }
}

function getStatusPresentation(
  locale: string,
  applicationStatus: PractitionerApplicationStatus,
  canApprove: boolean,
): Pick<DerivedAdminReviewDecision, "statusLabel" | "statusDescription" | "statusTone"> {
  const ar = isArabic(locale);

  if (applicationStatus === "APPROVED") {
    return {
      statusTone: "success",
      statusLabel: ar ? "تم اعتماد الطلب بالفعل" : "The application is already approved",
      statusDescription: ar
        ? "القرار النهائي اتُّخذ بالفعل. يمكنك فقط مراجعة البيانات وسجل القرار الحالي."
        : "A final approval decision has already been made. You can review the data and the recorded decision.",
    };
  }

  if (applicationStatus === "REJECTED") {
    return {
      statusTone: "danger",
      statusLabel: ar ? "تم رفض الطلب بالفعل" : "The application is already rejected",
      statusDescription: ar
        ? "هذا الطلب مرفوض حاليًا. راجع السبب المسجل قبل اتخاذ أي إجراء إضافي."
        : "This application is already rejected. Review the recorded reason before taking any further action.",
    };
  }

  if (applicationStatus === "CHANGES_REQUESTED") {
    return {
      statusTone: "warning",
      statusLabel: ar ? "تم إرسال طلب تعديل" : "Changes have already been requested",
      statusDescription: ar
        ? "يوجد طلب تعديل مفتوح لهذا المعالج. راجع ما إذا كانت البيانات المحدثة كافية."
        : "There is already an open request for changes. Check whether the latest updates are sufficient.",
    };
  }

  if (applicationStatus === "ARCHIVED") {
    return {
      statusTone: "neutral",
      statusLabel: ar ? "الطلب مؤرشف" : "The application is archived",
      statusDescription: ar
        ? "الطلب في حالة أرشفة. لا يمكن اعتمادُه من هذه الحالة."
        : "The application is archived and cannot be approved from this state.",
    };
  }

  if (canApprove) {
    return {
      statusTone: "success",
      statusLabel: ar ? "يمكن اعتماد الطلب" : "The application can be approved",
      statusDescription: ar
        ? "كل متطلبات الاعتماد الحالية مكتملة. أكمل المراجعة اليدوية ثم اعتمد الطلب."
        : "All current approval requirements are satisfied. Finish your manual review and approve the application.",
    };
  }

  return {
    statusTone: "warning",
    statusLabel: ar ? "لا يمكن اعتماد الطلب الآن" : "The application cannot be approved yet",
    statusDescription: ar
      ? "راجع الأسباب التالية لتحديد ما إذا كان المطلوب استكمال بيانات أو مراجعة مستندات أو معالجة تناقض في البيانات."
      : "Review the reasons below to determine whether the next step is requesting missing data, reviewing documents, or resolving a data inconsistency.",
  };
}

export function deriveAdminReviewDecision(params: Params): DerivedAdminReviewDecision {
  const ar = isArabic(params.locale);
  const completion = params.completion;

  const lifecycleReasons = completion.blockers
    .filter((issue) => issue.code.startsWith("APPLICATION_"))
    .map((issue) => getIssueReason(params.locale, issue))
    .filter((reason): reason is AdminReviewDecisionReason => Boolean(reason));

  const missingFromPractitioner = completion.blockers
    .filter(
      (issue) =>
        issue.requirementScope === "SUBMISSION" &&
        !issue.code.startsWith("APPLICATION_"),
    )
    .map((issue) => getIssueReason(params.locale, issue))
    .filter((reason): reason is AdminReviewDecisionReason => Boolean(reason));

  const pendingCredentials = params.credentials
    .filter((credential) => credential.reviewStatus === "PENDING")
    .map<AdminReviewDecisionReason>((credential) => ({
      code: `CREDENTIAL_PENDING_REVIEW:${credential.credentialId}`,
      label: ar
        ? `${getCredentialTypeLabel(params.locale, credential.credentialType)} بانتظار مراجعة الإدارة`
        : `${getCredentialTypeLabel(params.locale, credential.credentialType)} is pending admin review`,
      description: ar
        ? "افتح المستند وراجع صحته قبل اتخاذ القرار النهائي."
        : "Open the file and review its validity before making the final decision.",
      actionLabel: ar ? "راجع المستند من خطوة المستندات" : "Review it in the documents step",
      step: "documents",
      severity: "warning",
    }));

  const approvalScopeReasons = completion.blockers
    .filter((issue) => issue.requirementScope === "APPROVAL")
    .map((issue) => getIssueReason(params.locale, issue))
    .filter((reason): reason is AdminReviewDecisionReason => Boolean(reason));

  const needsAdminReview = uniqueReasons([...pendingCredentials, ...approvalScopeReasons]);

  const rejectedOrNeedsCorrection = params.credentials
    .filter((credential) => credential.reviewStatus === "REJECTED" || credential.reviewStatus === "EXPIRED")
    .map<AdminReviewDecisionReason>((credential) => ({
      code: `CREDENTIAL_NEEDS_CORRECTION:${credential.credentialId}`,
      label: ar
        ? `${getCredentialTypeLabel(params.locale, credential.credentialType)} يحتاج تصحيح`
        : `${getCredentialTypeLabel(params.locale, credential.credentialType)} needs correction`,
      description: credential.reviewNotes?.trim()
        ? credential.reviewNotes.trim()
        : ar
          ? "يوجد ملاحظات أو رفض سابق على هذا المستند."
          : "This document has prior review feedback or a rejected status.",
      actionLabel: ar ? "أرسل طلب تعديل أو ارفض الطلب" : "Request changes or reject the application",
      step: "documents",
      severity: "blocking",
    }));

  const positiveChecks: AdminReviewDecisionReason[] = [];
  if (params.reviewAvatarUrl) {
    positiveChecks.push({
      code: "PROFILE_PHOTO_PRESENT",
      label: ar ? "الصورة الشخصية موجودة" : "Profile photo is available",
      description: ar ? "يمكن مقارنة الصورة ببيانات الهوية." : "The profile photo is available for identity comparison.",
      step: "identity",
      severity: "info",
    });
  }
  if (params.readinessSnapshot.hasRequiredCredentials && needsAdminReview.length === 0 && rejectedOrNeedsCorrection.length === 0) {
    positiveChecks.push({
      code: "REQUIRED_DOCUMENTS_REVIEWED",
      label: ar ? "المستندات المطلوبة تمت مراجعتها" : "Required documents have been reviewed",
      description: ar ? "كل المستندات المطلوبة موجودة وتمت مراجعتها." : "All required documents are present and reviewed.",
      step: "documents",
      severity: "info",
    });
  }
  if (params.readinessSnapshot.hasPayoutDestination && (params.livePayoutDestination || params.payoutDestination)) {
    positiveChecks.push({
      code: "PAYOUT_DETAILS_PRESENT",
      label: ar ? "بيانات المستحقات موجودة" : "Payout details are available",
      description: ar ? "بيانات استلام المستحقات متاحة للمراجعة." : "Payout details are available for review.",
      step: "payout",
      severity: "info",
    });
  }

  const canApprove = params.readinessSnapshot.canBeApproved;
  const statusPresentation = getStatusPresentation(params.locale, params.application.status, canApprove);

  const approveDisabledReasons = canApprove
    ? []
    : uniqueReasons([...lifecycleReasons, ...missingFromPractitioner, ...needsAdminReview, ...rejectedOrNeedsCorrection]);

  const internalInconsistencies: AdminReviewDecisionReason[] =
    !canApprove && approveDisabledReasons.length === 0
      ? [
          {
            code: "INTERNAL_APPROVAL_REASON_MISSING",
            label: ar
              ? "تعذر تحديد سبب منع الاعتماد من البيانات المستلمة"
              : "Could not determine why approval is blocked from the received data",
            description: ar
              ? "راجِع استجابة الـ API لأن الواجهة لم تتلق سببًا واضحًا لمنع الاعتماد."
              : "Review the API response because the UI did not receive a clear approval blocker.",
            actionLabel: ar ? "راجع بيانات التصحيح" : "Inspect the debug data",
            step: "decision",
            severity: "blocking",
          },
        ]
      : [];

  const readyChecks = canApprove ? uniqueReasons(positiveChecks) : [];

  const summaryChips = uniqueChips([
    params.application.status === "APPROVED" ? (ar ? "تم الاعتماد" : "Approved") : null,
    params.application.status === "CHANGES_REQUESTED" ? (ar ? "طُلِب تعديل" : "Changes requested") : null,
    params.application.status === "REJECTED" ? (ar ? "مرفوض" : "Rejected") : null,
    missingFromPractitioner[0] ? (ar ? `ناقص: ${missingFromPractitioner[0].label.replace(/ غير مرفوعة$/, "")}` : missingFromPractitioner[0].label) : null,
    needsAdminReview[0] ? (ar ? `يحتاج مراجعة: ${needsAdminReview[0].label.replace(" بانتظار مراجعة الإدارة", "")}` : needsAdminReview[0].label) : null,
    rejectedOrNeedsCorrection[0]
      ? ar
        ? `يحتاج تصحيح: ${rejectedOrNeedsCorrection[0].label.replace(" يحتاج تصحيح", "")}`
        : rejectedOrNeedsCorrection[0].label
      : null,
    canApprove ? (ar ? "جاهز للاعتماد" : "Ready for approval") : null,
  ]);

  return {
    canApprove,
    statusTone: statusPresentation.statusTone,
    statusLabel: statusPresentation.statusLabel,
    statusDescription: statusPresentation.statusDescription,
    approveDisabledReasons: uniqueReasons([...approveDisabledReasons, ...internalInconsistencies]),
    missingFromPractitioner: uniqueReasons(missingFromPractitioner),
    needsAdminReview,
    rejectedOrNeedsCorrection: uniqueReasons(rejectedOrNeedsCorrection),
    readyChecks,
    internalInconsistencies,
    summaryChips,
  };
}
