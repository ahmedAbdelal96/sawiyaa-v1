import type {
  PractitionerApplicationCompletionStepKey,
  PractitionerApplicationCompletionViewModel,
} from "../types/practitioners.types";

const KNOWN_COMPLETION_STEP_KEYS = new Set<PractitionerApplicationCompletionStepKey>([
  "basicProfile",
  "professionalDetails",
  "pricing",
  "qualifications",
  "documents",
  "payoutDetails",
  "reviewSubmit",
]);

function isUsableCompletion(
  value: unknown
): value is PractitionerApplicationCompletionViewModel {
  if (!value || typeof value !== "object") return false;

  const candidate = value as { steps?: unknown };
  if (!Array.isArray(candidate.steps)) return false;
  if (candidate.steps.length === 0) return false;

  return candidate.steps.some((step: any) => KNOWN_COMPLETION_STEP_KEYS.has(step?.key));
}

type AnyApiPayload = Record<string, any> | null | undefined;

/**
 * Extracts practitioner application completion view model from multiple possible API envelope shapes.
 *
 * Supported shapes:
 * - { readiness: { completion } }
 * - { application: { completion } }
 * - { completion }
 * - { data: { readiness: { completion } } }
 * - { data: { application: { completion } } }
 * - { data: { completion } }
 * - already-unwrapped readiness object
 * - already-unwrapped application object
 *
 * We only return completion when it matches the expected shape (has an array `steps`).
 */
export function extractPractitionerCompletion(
  applicationQueryData: AnyApiPayload,
  readinessQueryData: AnyApiPayload,
): PractitionerApplicationCompletionViewModel | null {
  const candidates: Array<{ source: "readiness" | "application"; value: unknown }> = [
    // Prefer readiness completion as primary source of truth.
    { source: "readiness", value: readinessQueryData?.readiness?.completion },
    { source: "readiness", value: readinessQueryData?.data?.readiness?.completion },
    { source: "readiness", value: readinessQueryData?.completion },
    { source: "readiness", value: readinessQueryData?.data?.completion },

    // Only fall back to application completion when it's actually usable.
    { source: "application", value: applicationQueryData?.application?.completion },
    { source: "application", value: applicationQueryData?.data?.application?.completion },
    { source: "application", value: applicationQueryData?.completion },
    { source: "application", value: applicationQueryData?.data?.completion },
  ];

  const found = candidates.find((candidate) => isUsableCompletion(candidate.value));
  return (found?.value as PractitionerApplicationCompletionViewModel | undefined) ?? null;
}

export function extractPractitionerCompletionDebug(
  applicationQueryData: AnyApiPayload,
  readinessQueryData: AnyApiPayload,
): {
  completion: PractitionerApplicationCompletionViewModel | null;
  source: "readiness" | "application" | "none";
  readinessStepsCount: number | null;
  applicationStepsCount: number | null;
} {
  const readinessCompletion =
    (readinessQueryData?.readiness?.completion as any) ??
    (readinessQueryData?.data?.readiness?.completion as any) ??
    (readinessQueryData?.completion as any) ??
    (readinessQueryData?.data?.completion as any) ??
    null;

  const applicationCompletion =
    (applicationQueryData?.application?.completion as any) ??
    (applicationQueryData?.data?.application?.completion as any) ??
    (applicationQueryData?.completion as any) ??
    (applicationQueryData?.data?.completion as any) ??
    null;

  const readinessStepsCount = Array.isArray(readinessCompletion?.steps)
    ? readinessCompletion.steps.length
    : null;
  const applicationStepsCount = Array.isArray(applicationCompletion?.steps)
    ? applicationCompletion.steps.length
    : null;

  const completion = extractPractitionerCompletion(applicationQueryData, readinessQueryData);

  let source: "readiness" | "application" | "none" = "none";
  if (completion && readinessCompletion && completion === readinessCompletion) source = "readiness";
  if (completion && applicationCompletion && completion === applicationCompletion) source = "application";
  if (completion && source === "none") {
    // If we got a usable completion but not referentially equal (e.g. normalized elsewhere),
    // infer source by usability.
    source = isUsableCompletion(readinessCompletion) ? "readiness" : "application";
  }

  return {
    completion,
    source,
    readinessStepsCount,
    applicationStepsCount,
  };
}
