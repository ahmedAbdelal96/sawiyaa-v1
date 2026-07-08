import type {
  AcademyProgramCategorySummary,
  AcademyProgramItem,
  AcademyProgramLocale,
  AcademyProgramSessionItem,
  AcademyProgramEnrollmentPaymentStatus,
  AcademyProgramEnrollmentStatus,
  AcademyProgramDeliveryMethod,
} from "../types/academy-programs.types";

function trimValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveAcademyProgramLocalizedValue(input: {
  locale: AcademyProgramLocale;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  fallback?: string | null | undefined;
}): string {
  const primary = trimValue(input.primary);
  const secondary = trimValue(input.secondary);
  const fallback = trimValue(input.fallback);

  if (input.locale === "ar") {
    return primary || secondary || fallback;
  }

  return secondary || primary || fallback;
}

export function resolveAcademyProgramTitle(
  program: Pick<AcademyProgramItem, "titleAr" | "titleEn" | "slug" | "title">,
  locale: AcademyProgramLocale,
): string {
  return resolveAcademyProgramLocalizedValue({
    locale,
    primary: program.titleAr,
    secondary: program.titleEn,
    fallback: program.title ?? program.slug,
  });
}

export function resolveAcademyProgramDescription(
  program: Pick<AcademyProgramItem, "descriptionAr" | "descriptionEn" | "description" | "slug">,
  locale: AcademyProgramLocale,
): string | null {
  const value = resolveAcademyProgramLocalizedValue({
    locale,
    primary: program.descriptionAr,
    secondary: program.descriptionEn,
    fallback: program.description ?? null,
  });

  return value || null;
}

export function resolveAcademyProgramCategoryTitle(
  category: AcademyProgramCategorySummary | null | undefined,
  locale: AcademyProgramLocale,
): string | null {
  if (!category) {
    return null;
  }

  const value = resolveAcademyProgramLocalizedValue({
    locale,
    primary: category.titleAr,
    secondary: category.titleEn,
    fallback: category.title || category.slug,
  });

  return value || null;
}

export function resolveAcademyProgramSessionTitle(
  session: Pick<AcademyProgramSessionItem, "titleAr" | "titleEn" | "id">,
  locale: AcademyProgramLocale,
): string {
  return resolveAcademyProgramLocalizedValue({
    locale,
    primary: session.titleAr,
    secondary: session.titleEn,
    fallback: session.id,
  });
}

export function resolveAcademyProgramDeliveryMethodLabel(
  deliveryMethod: AcademyProgramDeliveryMethod,
  t: (key: string) => string,
): string {
  switch (deliveryMethod) {
    case "ZOOM":
      return t("programs.deliveryMethods.ZOOM");
    case "WHATSAPP":
      return t("programs.deliveryMethods.WHATSAPP");
    case "GOOGLE_MEET":
      return t("programs.deliveryMethods.GOOGLE_MEET");
    case "OFFLINE":
      return t("programs.deliveryMethods.OFFLINE");
    default:
      return t("programs.deliveryMethods.OTHER");
  }
}

export function resolveAcademyProgramEnrollmentStatusLabel(
  status: AcademyProgramEnrollmentStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return t("statuses.enrollment.PENDING_PAYMENT");
    case "CONFIRMED":
      return t("statuses.enrollment.CONFIRMED");
    case "CANCELLED":
      return t("statuses.enrollment.CANCELLED");
    case "EXPIRED":
      return t("statuses.enrollment.EXPIRED");
    default:
      return t("statuses.enrollment.UNKNOWN");
  }
}

export function resolveAcademyProgramPaymentStatusLabel(
  status: AcademyProgramEnrollmentPaymentStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "CREATED":
      return t("statuses.payment.CREATED");
    case "PENDING":
      return t("statuses.payment.PENDING");
    case "REQUIRES_ACTION":
      return t("statuses.payment.REQUIRES_ACTION");
    case "AUTHORIZED":
      return t("statuses.payment.AUTHORIZED");
    case "CAPTURED":
      return t("statuses.payment.CAPTURED");
    case "FAILED":
      return t("statuses.payment.FAILED");
    case "CANCELLED":
      return t("statuses.payment.CANCELLED");
    case "EXPIRED":
      return t("statuses.payment.EXPIRED");
    case "REFUND_PENDING":
      return t("statuses.payment.REFUND_PENDING");
    case "PARTIALLY_REFUNDED":
      return t("statuses.payment.PARTIALLY_REFUNDED");
    case "REFUNDED":
      return t("statuses.payment.REFUNDED");
    default:
      return t("statuses.payment.UNKNOWN");
  }
}

export function resolveAcademyProgramRegistrationStateLabel(
  registrationOpen: boolean,
  t: (key: string) => string,
): string {
  return registrationOpen
    ? t("programs.registration.open")
    : t("programs.registration.closed");
}

export function resolveAcademyProgramCertificateStatusLabel(
  status: "NOT_ISSUED" | "ISSUED" | "REISSUED",
  t: (key: string) => string,
): string {
  switch (status) {
    case "ISSUED":
      return t("programs.certificate.statuses.ISSUED");
    case "REISSUED":
      return t("programs.certificate.statuses.REISSUED");
    default:
      return t("programs.certificate.statuses.NOT_ISSUED");
  }
}
