import { toAppError } from "@/lib/api/errors";

const ACADEMY_PROGRAM_ERROR_MAP: Record<string, string> = {
  ACADEMY_PROGRAM_NOT_FOUND: "programs.errors.notFound",
  ACADEMY_PROGRAM_CATEGORY_NOT_FOUND: "programs.errors.categoryNotFound",
  ACADEMY_PROGRAM_ARCHIVED_CANNOT_BE_PUBLISHED:
    "programs.errors.archivedProgramCannotBePublished",
  ACADEMY_PROGRAM_ARCHIVED_READ_ONLY: "programs.errors.archivedReadOnly",
  ACADEMY_PROGRAM_ARCHIVE_REASON_REQUIRED: "programs.errors.archiveReasonRequired",
  ACADEMY_PROGRAM_INVALID_WINDOW: "programs.errors.invalidWindow",
  ACADEMY_PROGRAM_INVALID_DATE: "programs.errors.invalidDate",
  ACADEMY_PROGRAM_INVALID_PRICE: "programs.errors.invalidPrice",
  ACADEMY_PROGRAM_MISSING_SLUG_SOURCE: "programs.errors.missingSlugSource",
  ACADEMY_PROGRAM_TITLE_AR_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_TITLE_EN_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_DESCRIPTION_AR_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_DESCRIPTION_EN_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_PRICE_EGP_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_PRICE_USD_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_START_AT_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_END_AT_REQUIRED: "programs.errors.basicDetailsRequired",
  ACADEMY_PROGRAM_SESSION_NOT_FOUND: "programs.errors.sessionNotFound",
  ACADEMY_PROGRAM_ATTENDANCE_INVALID_STATUS: "programs.errors.attendanceInvalidStatus",
  ACADEMY_PROGRAM_ATTENDANCE_CORRECTION_REASON_REQUIRED:
    "admin.detail.attendance.feedback.correctionReasonRequired",
  ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS: "programs.errors.enrollmentAlreadyExists",
  ACADEMY_PROGRAM_LEARNER_CONTACT_ALREADY_EXISTS: "programs.errors.learnerContactAlreadyExists",
  ACADEMY_PROGRAM_CERTIFICATE_FILE_REQUIRED: "programs.errors.certificateFileRequired",
  ACADEMY_PROGRAM_CERTIFICATE_INVALID_TYPE: "programs.errors.certificateInvalidType",
  ACADEMY_PROGRAM_CERTIFICATE_FILE_TOO_LARGE: "programs.errors.certificateFileTooLarge",
  ACADEMY_PROGRAM_CERTIFICATE_ENROLLMENT_NOT_ELIGIBLE:
    "programs.errors.certificateEnrollmentNotEligible",
  ACADEMY_PROGRAM_CERTIFICATE_NOT_FOUND: "programs.errors.certificateNotFound",
};

type AcademyProgramFormFieldErrorKey =
  | "titleAr"
  | "titleEn"
  | "descriptionAr"
  | "descriptionEn"
  | "startAt"
  | "endAt"
  | "priceEgp"
  | "priceUsd"
  | "maxSeats"
  | "startsAt"
  | "endsAt"
  | "deliveryMethod";

export type AcademyProgramFormErrorKeyMap = Partial<Record<AcademyProgramFormFieldErrorKey, string>>;

const ACADEMY_PROGRAM_PUBLIC_ERROR_MAP: Record<string, string> = {
  ACADEMY_PROGRAM_NOT_FOUND: "public.errors.notFound",
  ACADEMY_PROGRAM_REGISTRATION_CLOSED: "public.errors.registrationClosed",
  ACADEMY_PROGRAM_SEAT_CAPACITY_REACHED: "public.errors.capacityReached",
  ACADEMY_PROGRAM_MISSING_PRICING: "public.errors.missingPricing",
  ACADEMY_PROGRAM_UNSUPPORTED_CURRENCY: "public.errors.unsupportedCurrency",
  ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS: "public.errors.alreadyEnrolled",
  ACADEMY_PROGRAM_LEARNER_CONTACT_ALREADY_EXISTS: "public.errors.alreadyEnrolled",
  PAYMENT_PROVIDER_UNAVAILABLE: "public.errors.paymentUnavailable",
  PAYMENT_PROVIDER_NOT_CONFIGURED: "public.errors.paymentUnavailable",
  "payments.errors.providerUnavailable": "public.errors.paymentUnavailable",
  "payments.errors.providerNotConfigured": "public.errors.paymentUnavailable",
};

const ACADEMY_PROGRAM_COVER_UPLOAD_ERROR_MAP: Record<string, string> = {
  ACADEMY_PROGRAM_COVER_FILE_REQUIRED: "programs.errors.coverFileRequired",
  ACADEMY_PROGRAM_COVER_INVALID_TYPE: "programs.errors.coverInvalidType",
  ACADEMY_PROGRAM_COVER_FILE_TOO_LARGE: "programs.errors.coverFileTooLarge",
};

export function getAcademyProgramErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && ACADEMY_PROGRAM_ERROR_MAP[appError.code]) {
    return ACADEMY_PROGRAM_ERROR_MAP[appError.code];
  }

  if (appError.statusCode === 404) {
    return ACADEMY_PROGRAM_ERROR_MAP.ACADEMY_PROGRAM_NOT_FOUND;
  }

  if (appError.statusCode === 403) {
    return "programs.errors.forbidden";
  }

  if (appError.statusCode === 409) {
    return "programs.errors.duplicateSlug";
  }

  return "programs.errors.genericSave";
}

export function getPublicAcademyProgramErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && ACADEMY_PROGRAM_PUBLIC_ERROR_MAP[appError.code]) {
    return ACADEMY_PROGRAM_PUBLIC_ERROR_MAP[appError.code];
  }

  if (appError.statusCode === 404) {
    return ACADEMY_PROGRAM_PUBLIC_ERROR_MAP.ACADEMY_PROGRAM_NOT_FOUND;
  }

  if (appError.statusCode === 409) {
    return ACADEMY_PROGRAM_PUBLIC_ERROR_MAP.ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS;
  }

  return "public.errors.generic";
}

export function getAcademyProgramCoverUploadErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && ACADEMY_PROGRAM_COVER_UPLOAD_ERROR_MAP[appError.code]) {
    return ACADEMY_PROGRAM_COVER_UPLOAD_ERROR_MAP[appError.code];
  }

  return "programs.errors.coverUploadFailed";
}

function buildCourseFieldErrorMap(code: string | null): AcademyProgramFormErrorKeyMap {
  switch (code) {
    case "ACADEMY_PROGRAM_TITLE_AR_REQUIRED":
      return {
        titleAr: "programs.form.validation.titleArRequired",
      };
    case "ACADEMY_PROGRAM_TITLE_EN_REQUIRED":
      return {
        titleEn: "programs.form.validation.titleEnRequired",
      };
    case "ACADEMY_PROGRAM_DESCRIPTION_AR_REQUIRED":
      return {
        descriptionAr: "programs.form.validation.descriptionArRequired",
      };
    case "ACADEMY_PROGRAM_DESCRIPTION_EN_REQUIRED":
      return {
        descriptionEn: "programs.form.validation.descriptionEnRequired",
      };
    case "ACADEMY_PROGRAM_PRICE_EGP_REQUIRED":
      return {
        priceEgp: "programs.form.validation.priceEgpRequired",
      };
    case "ACADEMY_PROGRAM_PRICE_USD_REQUIRED":
      return {
        priceUsd: "programs.form.validation.priceUsdRequired",
      };
    case "ACADEMY_PROGRAM_START_AT_REQUIRED":
      return {
        startAt: "programs.form.validation.startAtRequired",
      };
    case "ACADEMY_PROGRAM_END_AT_REQUIRED":
      return {
        endAt: "programs.form.validation.endAtRequired",
      };
    case "ACADEMY_PROGRAM_INVALID_WINDOW":
      return {
        endAt: "programs.form.validation.invalidWindow",
      };
    case "ACADEMY_PROGRAM_INVALID_DATE":
      return {
        startAt: "programs.form.validation.invalidDate",
        endAt: "programs.form.validation.invalidDate",
      };
    case "ACADEMY_PROGRAM_INVALID_PRICE":
      return {
        priceEgp: "programs.form.validation.invalidPrice",
        priceUsd: "programs.form.validation.invalidPrice",
      };
    case "ACADEMY_PROGRAM_MISSING_SLUG_SOURCE":
      return {
        titleAr: "programs.form.validation.titleArRequired",
      };
    default:
      return {};
  }
}

function buildLectureFieldErrorMap(code: string | null): AcademyProgramFormErrorKeyMap {
  switch (code) {
    case "ACADEMY_PROGRAM_INVALID_WINDOW":
      return {
        endsAt: "programs.sessionForm.validation.invalidWindow",
      };
    case "ACADEMY_PROGRAM_INVALID_DATE":
      return {
        startsAt: "programs.sessionForm.validation.invalidDate",
        endsAt: "programs.sessionForm.validation.invalidDate",
      };
    default:
      return {};
  }
}

export function getAcademyProgramCourseFieldErrorKeys(error: unknown): AcademyProgramFormErrorKeyMap {
  const appError = toAppError(error);
  return buildCourseFieldErrorMap(appError.code ?? null);
}

export function getAcademyProgramLectureFieldErrorKeys(error: unknown): AcademyProgramFormErrorKeyMap {
  const appError = toAppError(error);
  return buildLectureFieldErrorMap(appError.code ?? null);
}
