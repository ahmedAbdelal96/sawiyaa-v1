import { toAppError } from "@/lib/api/errors";

export function getAdminPractitionerPayoutErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND":
      return "errors.practitionerNotFound";
    case "FINANCIAL_OPERATIONS_PAYOUT_AMOUNT_INVALID":
      return "errors.amountInvalid";
    case "FINANCIAL_OPERATIONS_PAYOUT_AMOUNT_EXCEEDS_DUE":
      return "errors.amountExceedsDue";
    case "FINANCIAL_OPERATIONS_MANUAL_PAYOUT_ALREADY_RECORDED":
      return "errors.duplicateReference";
    default:
      return "errors.generic";
  }
}
