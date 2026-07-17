import { toAppError } from "@/lib/api/errors";

export function getAdminSessionRuntimeErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "SESSION_NOT_FOUND":
      return "errors.notFound";
    default:
      return "errors.generic";
  }
}

export function getAdminSessionAttendanceErrorKey(error: unknown) {
  const appError = toAppError(error);

  switch (appError.code) {
    case "SESSION_NOT_FOUND":
      return "attendance.states.error.notFound";
    default:
      return "attendance.states.error.generic";
  }
}

export function getAdminSessionPackageEntitlementErrorKey(error: unknown) {
  const appError = toAppError(error);
  const code = appError.messageKey ?? appError.code ?? "";

  switch (code) {
    case "sessions.errors.packageEntitlementDecisionNotPackageSession":
    case "SESSION_PACKAGE_ENTITLEMENT_DECISION_NOT_PACKAGE_SESSION":
      return "inspector.packageEntitlement.errors.notPackageSession";
    case "sessions.errors.packageEntitlementDecisionNotAllowedStatus":
    case "SESSION_PACKAGE_ENTITLEMENT_DECISION_NOT_ALLOWED_STATUS":
      return "inspector.packageEntitlement.errors.notAllowedStatus";
    case "sessions.errors.packageEntitlementDecisionInvalidCombination":
    case "SESSION_PACKAGE_ENTITLEMENT_DECISION_INVALID_COMBINATION":
      return "inspector.packageEntitlement.errors.invalidCombination";
    case "sessions.errors.packageEntitlementDecisionAlreadyExists":
    case "SESSION_PACKAGE_ENTITLEMENT_DECISION_ALREADY_EXISTS":
      return "inspector.packageEntitlement.errors.alreadyExists";
    case "sessions.errors.packageEntitlementDecisionReviewUnavailable":
    case "SESSION_PACKAGE_ENTITLEMENT_DECISION_REVIEW_UNAVAILABLE":
      return "inspector.packageEntitlement.errors.reviewUnavailable";
    case "FORBIDDEN":
    case "403":
      return "inspector.packageEntitlement.errors.forbidden";
    case "UNAUTHORIZED":
    case "401":
      return "inspector.packageEntitlement.errors.unauthorized";
    default:
      return "inspector.packageEntitlement.errors.generic";
  }
}
