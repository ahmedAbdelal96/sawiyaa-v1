import { serverGet } from "@/lib/api/server-http-client";
import type {
  AssessmentDefinitionResponse,
  AssessmentsCatalogResponse,
} from "../types/assessments.types";

export async function fetchPublicAssessments(
  locale: string,
): Promise<AssessmentsCatalogResponse> {
  return serverGet<AssessmentsCatalogResponse>("/assessments", { locale });
}

export async function fetchPublicAssessmentDefinition(
  slug: string,
  locale: string,
): Promise<AssessmentDefinitionResponse | null> {
  try {
    return await serverGet<AssessmentDefinitionResponse>(`/assessments/${slug}`, {
      locale,
    });
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}
