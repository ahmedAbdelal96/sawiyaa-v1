import { toAppError } from "@/lib/api/errors";

const ERROR_KEYS: Record<string, string> = {
  FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND: "errors.practitionerNotFound",
  FINANCIAL_OPS_INVALID_FILTER: "errors.invalidFilter",
  FINANCIAL_OPS_FORBIDDEN_SCOPE: "errors.forbidden",
  FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE: "errors.notFound",
};

export function getPractitionerWalletErrorKey(error: unknown): string {
  const appError = toAppError(error);
  if (appError.code && ERROR_KEYS[appError.code]) {
    return ERROR_KEYS[appError.code];
  }

  if (appError.statusCode === 404) {
    return ERROR_KEYS.FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE;
  }

  return "errors.generic";
}

export function getPractitionerLedgerErrorKey(error: unknown): string {
  const appError = toAppError(error);
  if (appError.code && ERROR_KEYS[appError.code]) {
    return ERROR_KEYS[appError.code];
  }

  if (appError.statusCode === 404) {
    return ERROR_KEYS.FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE;
  }

  return "errors.generic";
}

export function getPractitionerSettlementsErrorKey(error: unknown): string {
  const appError = toAppError(error);
  if (appError.code && ERROR_KEYS[appError.code]) {
    return ERROR_KEYS[appError.code];
  }

  if (appError.statusCode === 404) {
    return ERROR_KEYS.FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE;
  }

  return "errors.generic";
}
