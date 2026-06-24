import {
  AssessmentResultBand,
  AssessmentSubmissionStatus,
} from '@prisma/client';

export type AssessmentBandThreshold = {
  band: AssessmentResultBand;
  minInclusive: number;
  maxInclusive: number;
};

export type AssessmentScoringConfig = {
  thresholds?: AssessmentBandThreshold[];
};

export type SubmittedAssessmentAnswer = {
  questionKey: string;
  selectedOptionKey: string;
};

export type AssessmentResultPayload = {
  score: number;
  band: AssessmentResultBand;
  summary: string;
  nextSteps: string[];
};

export type PatientAssessmentHistoryQuery = {
  page: number;
  limit: number;
  status?: AssessmentSubmissionStatus;
};
