export type AdminAssessmentStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type AdminAssessmentQuestionInputType = "SINGLE_CHOICE";
export type AdminAssessmentResultBand = "LOW" | "MILD" | "MODERATE" | "HIGH";

export type AdminAssessmentsListParams = {
  page?: number;
  limit?: number;
  status?: AdminAssessmentStatus;
  isPublished?: boolean;
  search?: string;
  slug?: string;
};

export type AdminAssessmentPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminAssessmentOption = {
  id: string;
  assessmentQuestionId: string;
  key: string;
  label: string;
  scoreValue: number;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentQuestion = {
  id: string;
  assessmentDefinitionId: string;
  key: string;
  prompt: string;
  description: string | null;
  order: number;
  inputType: AdminAssessmentQuestionInputType;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
  options: AdminAssessmentOption[];
};

export type AdminAssessmentDefinition = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  status: AdminAssessmentStatus;
  version: number;
  introText: string | null;
  outroText: string | null;
  isPublished: boolean;
  estimatedDurationMinutes: number | null;
  scoringConfigJson: {
    thresholds: Array<{
      band: AdminAssessmentResultBand;
      minInclusive: number;
      maxInclusive: number;
    }>;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAssessmentDefinitionDetails = AdminAssessmentDefinition & {
  questions: AdminAssessmentQuestion[];
};

export type AdminAssessmentsListResponseData = {
  items: AdminAssessmentDefinition[];
  pagination: AdminAssessmentPagination;
};

export type AdminAssessmentDetailsResponseData = {
  item: AdminAssessmentDefinitionDetails;
};

export type CreateAdminAssessmentInput = {
  slug: string;
  title: string;
  description?: string;
  category: string;
  introText?: string;
  outroText?: string;
  estimatedDurationMinutes?: number;
  scoringConfig?: {
    thresholds: Array<{
      band: AdminAssessmentResultBand;
      minInclusive: number;
      maxInclusive: number;
    }>;
  };
};

export type UpdateAdminAssessmentMetadataInput = {
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  introText?: string;
  outroText?: string;
  estimatedDurationMinutes?: number | null;
};

export type CreateAdminAssessmentQuestionInput = {
  key: string;
  prompt: string;
  description?: string;
  inputType?: AdminAssessmentQuestionInputType;
  isRequired?: boolean;
  order?: number;
};

export type UpdateAdminAssessmentQuestionInput = {
  key?: string;
  prompt?: string;
  description?: string | null;
  inputType?: AdminAssessmentQuestionInputType;
  isRequired?: boolean;
};

export type ReorderAdminAssessmentQuestionsInput = {
  questionIds: string[];
};

export type CreateAdminAssessmentOptionInput = {
  key: string;
  label: string;
  scoreValue: number;
  order?: number;
};

export type UpdateAdminAssessmentOptionInput = {
  key?: string;
  label?: string;
  scoreValue?: number;
};

export type ReorderAdminAssessmentOptionsInput = {
  optionIds: string[];
};

export type UpdateAdminAssessmentScoringConfigInput = {
  thresholds: Array<{
    band: AdminAssessmentResultBand;
    minInclusive: number;
    maxInclusive: number;
  }>;
};

export type PreviewAdminAssessmentAnswerInput = {
  questionKey: string;
  selectedOptionKey: string;
};

export type PreviewAdminAssessmentScoreInput = {
  answers: PreviewAdminAssessmentAnswerInput[];
};

export type PreviewAdminAssessmentScoreResponseData = {
  score: number;
  maxScore: number;
  band: AdminAssessmentResultBand;
  summaryPreview: string;
  nextStepsPreview: string[];
};
