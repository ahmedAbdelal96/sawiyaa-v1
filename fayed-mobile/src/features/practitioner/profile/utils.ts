import type {
  PractitionerApplicationStatusResponse,
  PractitionerPayoutMethodType,
  PractitionerProfile,
  PractitionerProfileStatus,
  PractitionerReadiness,
} from "./types";

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
