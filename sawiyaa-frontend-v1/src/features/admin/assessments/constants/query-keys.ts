import type { AdminAssessmentsListParams } from "../types/admin-assessments.types";

export const adminAssessmentsQueryKeys = {
  all: ["admin-assessments"] as const,
  list: (params: AdminAssessmentsListParams) =>
    [...adminAssessmentsQueryKeys.all, "list", params] as const,
  details: (id: string) => [...adminAssessmentsQueryKeys.all, "details", id] as const,
};
