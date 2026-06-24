import { toAppError } from "@/lib/api/errors";

export function getPractitionerReviewsErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code === "PUBLIC_PRACTITIONER_NOT_FOUND" || appError.statusCode === 404) {
    return "states.notPublicYet.note";
  }

  return "states.error.note";
}
