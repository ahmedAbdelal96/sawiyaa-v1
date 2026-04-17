export type AssessmentDefinitionStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type AssessmentQuestionInputType = "SINGLE_CHOICE";

export type AssessmentSubmissionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export type AssessmentResultBand = "LOW" | "MILD" | "MODERATE" | "HIGH";

export interface AssessmentOption {
  key: string;
  label: string;
}

export interface AssessmentQuestion {
  key: string;
  prompt: string;
  description: string | null;
  inputType: AssessmentQuestionInputType;
  isRequired: boolean;
  options: AssessmentOption[];
}

export interface AssessmentDefinition {
  slug: string;
  title: string;
  description: string | null;
  category: string;
  introText: string | null;
  outroText: string | null;
  estimatedDurationMinutes: number | null;
  status: AssessmentDefinitionStatus;
}

export interface AssessmentDefinitionDetails extends AssessmentDefinition {
  questions: AssessmentQuestion[];
}

export interface AssessmentsCatalogResponse {
  items: AssessmentDefinition[];
}

export interface AssessmentDefinitionResponse {
  item: AssessmentDefinitionDetails;
}

export interface SubmitAssessmentAnswer {
  questionKey: string;
  selectedOptionKey: string;
}

export interface SubmitAssessmentRequest {
  answers: SubmitAssessmentAnswer[];
}

export interface AssessmentResult {
  score: number;
  band: AssessmentResultBand;
  summary: string;
  nextSteps: string[];
}

export interface AssessmentSummary {
  slug: string;
  title: string;
}

export interface AssessmentSubmissionResult {
  submissionId: string;
  assessment: AssessmentSummary;
  result: AssessmentResult;
}

export interface PatientAssessmentHistoryItem {
  submissionId: string;
  assessmentSlug: string;
  assessmentTitle: string;
  status: AssessmentSubmissionStatus;
  totalScore: number | null;
  resultBand: AssessmentResultBand | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PatientAssessmentsPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PatientAssessmentsHistory {
  items: PatientAssessmentHistoryItem[];
  pagination: PatientAssessmentsPagination;
}

export interface PatientAssessmentSubmissionDetails {
  submissionId: string;
  assessment: AssessmentSummary;
  status: AssessmentSubmissionStatus;
  completedAt: string | null;
  result: AssessmentResult | null;
}

export interface PatientAssessmentsHistoryParams {
  page?: number;
  limit?: number;
  status?: AssessmentSubmissionStatus;
}
