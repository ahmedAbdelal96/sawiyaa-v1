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
