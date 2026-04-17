import type { PatientAssessmentsHistoryParams } from "../types/assessments.types";

export const assessmentsQueryKeys = {
  all: ["assessments"] as const,
  catalog: () => [...assessmentsQueryKeys.all, "catalog"] as const,
  history: () => [...assessmentsQueryKeys.all, "history"] as const,
  historyList: (params?: PatientAssessmentsHistoryParams) =>
    [...assessmentsQueryKeys.history(), params] as const,
  submissions: () => [...assessmentsQueryKeys.all, "submissions"] as const,
  submission: (submissionId: string) =>
    [...assessmentsQueryKeys.submissions(), submissionId] as const,
};
