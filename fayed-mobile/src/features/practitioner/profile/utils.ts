import type {
  PractitionerApplicationStatusResponse,
  PractitionerPayoutMethodType,
  PractitionerProfile,
  PractitionerProfileStatus,
  PractitionerReadiness,
} from "./types";
import type { TFunction } from "i18next";

type Translate = TFunction<"translation", undefined>;

export function getInitials(name: string | null | undefined) {
  const value = name?.trim();
  if (!value) {
    return "P";
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function profileTone(status: PractitionerProfileStatus) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "PENDING_REVIEW":
      return "warning" as const;
    case "REJECTED":
    case "SUSPENDED":
    case "INACTIVE":
      return "error" as const;
    default:
      return "default" as const;
  }
}

export function readinessTone(readiness: PractitionerReadiness | null) {
  if (!readiness) {
    return "default" as const;
  }

  return readiness.canSubmitApplication ? "success" as const : "warning" as const;
}

export function applicationTone(
  application: PractitionerApplicationStatusResponse | null | undefined,
) {
  switch (application?.status) {
    case "APPROVED":
      return "success" as const;
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "CHANGES_REQUESTED":
      return "warning" as const;
    case "REJECTED":
    case "ARCHIVED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

export function payoutSummary(
  payout: PractitionerProfile["payoutDestination"],
) {
  if (!payout?.methodType) {
    return "-";
  }

  const pieces = [payout.accountHolderName];

  switch (payout.methodType) {
    case "BANK_ACCOUNT":
      pieces.push(payout.bankName, payout.bankAccountNumber);
      break;
    case "IBAN":
      pieces.push(payout.iban);
      break;
    case "WALLET":
      pieces.push(payout.walletProvider, payout.walletIdentifier);
      break;
    case "OTHER":
      pieces.push(payout.otherDetails);
      break;
  }

  return pieces.filter(Boolean).join(" · ");
}

export function practitionerAccountStatusLabel(status: string | null | undefined, t: Translate) {
  switch (status) {
    case "ACTIVE":
      return t("practitioner.account.statuses.ACTIVE");
    case "INACTIVE":
      return t("practitioner.account.statuses.INACTIVE");
    case "SUSPENDED":
      return t("practitioner.account.statuses.SUSPENDED");
    case "PENDING_VERIFICATION":
      return t("practitioner.account.statuses.PENDING_VERIFICATION");
    case "PENDING_APPROVAL":
      return t("practitioner.account.statuses.PENDING_APPROVAL");
    case "DELETED":
      return t("practitioner.account.statuses.DELETED");
    default:
      return t("practitioner.account.unknown");
  }
}

export function practitionerApplicationStatusLabel(
  status: PractitionerApplicationStatusResponse["status"],
  t: Translate,
) {
  if (!status) {
    return t("practitioner.account.applicationStatuses.NONE");
  }

  return t(`practitioner.account.applicationStatuses.${status}`, status);
}

export function practitionerMissingRequirementLabel(key: string, t: Translate) {
  switch (key) {
    case "displayName":
      return t("practitioner.account.requirements.displayName");
    case "professionalTitle":
      return t("practitioner.account.requirements.professionalTitle");
    case "bio":
      return t("practitioner.account.requirements.bio");
    case "countryCode":
      return t("practitioner.account.requirements.countryCode");
    case "yearsOfExperience":
      return t("practitioner.account.requirements.yearsOfExperience");
    case "languages":
      return t("practitioner.account.requirements.languages");
    case "specialties":
      return t("practitioner.account.requirements.specialties");
    case "primarySpecialtyCategoryId":
      return t("practitioner.account.requirements.primarySpecialtyCategoryId");
    case "credentials":
      return t("practitioner.account.requirements.credentials");
    case "identityDocuments":
      return t("practitioner.account.requirements.identityDocuments");
    case "academicCertificate":
      return t("practitioner.account.requirements.academicCertificate");
    case "payoutDestination":
      return t("practitioner.account.requirements.payoutDestination");
    case "payoutAccountHolderName":
      return t("practitioner.account.requirements.payoutAccountHolderName");
    case "activeAccount":
      return t("practitioner.account.requirements.activeAccount");
    case "approvedProfile":
      return t("practitioner.account.requirements.approvedProfile");
    case "packagesEnabled":
      return t("practitioner.account.requirements.packagesEnabled");
    case "packagePurchasesEnabled":
      return t("practitioner.account.requirements.packagePurchasesEnabled");
    case "sessionPrice30Egp":
      return t("practitioner.account.requirements.sessionPrice30Egp");
    case "sessionPrice30Usd":
      return t("practitioner.account.requirements.sessionPrice30Usd");
    case "sessionPrice60Egp":
      return t("practitioner.account.requirements.sessionPrice60Egp");
    case "sessionPrice60Usd":
      return t("practitioner.account.requirements.sessionPrice60Usd");
    case "practitionerOtpVerified":
      return t("practitioner.account.requirements.practitionerOtpVerified");
    default:
      return t("practitioner.account.requirements.other");
  }
}

export function languageCodeLabel(value: string, t: Translate) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return t("practitioner.account.unknown");
  }

  const translated = t(`practitioner.account.language.${normalized}`);
  return translated !== `practitioner.account.language.${normalized}`
    ? translated
    : t("practitioner.account.unknown");
}

export function localeLabel(value: string | null | undefined, t: Translate) {
  if (!value) {
    return null;
  }

  if (value.startsWith("ar")) {
    return t("practitioner.account.language.ar");
  }

  if (value.startsWith("en")) {
    return t("practitioner.account.language.en");
  }

  return t("practitioner.account.unknown");
}

export function payoutMethodLabel(value: string | null | undefined, t: Translate) {
  if (!value) {
    return null;
  }

  const translated = t(`practitioner.account.payoutMethods.${value}`);
  return translated !== `practitioner.account.payoutMethods.${value}`
    ? translated
    : t("practitioner.account.unknown");
}

export function methodTypeLabel(methodType: PractitionerPayoutMethodType) {
  switch (methodType) {
    case "BANK_ACCOUNT":
      return "BANK_ACCOUNT";
    case "IBAN":
      return "IBAN";
    case "WALLET":
      return "WALLET";
    case "OTHER":
      return "OTHER";
    default:
      return methodType;
  }
}
