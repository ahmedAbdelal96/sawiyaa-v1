import { toAppError } from "@/lib/api/errors";

export function getAdminFinanceOperationsErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code === "FINANCIAL_OPS_INVALID_FILTER") {
    return "errors.invalidFilter";
  }

  if (appError.code === "FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE") {
    return "errors.notFound";
  }

  if (appError.code === "FINANCIAL_OPS_FORBIDDEN_SCOPE") {
    return "errors.forbidden";
  }

  if (appError.statusCode === 404) {
    return "errors.notFound";
  }

  return "errors.generic";
}
