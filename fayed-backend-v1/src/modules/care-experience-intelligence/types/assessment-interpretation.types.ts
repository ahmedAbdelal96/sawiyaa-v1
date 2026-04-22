import { AssessmentResultBand } from '@prisma/client';

export const CARE_INTENT_LEVEL_VALUES = [
  'NO_ASSESSMENT',
  'SELF_GUIDED',
  'GUIDED_MATCHING',
  'BOOK_SOON',
  'BOOK_PRIORITY',
] as const;

export type CareIntentLevel = (typeof CARE_INTENT_LEVEL_VALUES)[number];

export const CARE_ACTION_CATEGORY_VALUES = [
  'NONE',
  'TAKE_ASSESSMENT',
  'MONITOR_AND_SUPPORT',
  'START_MATCHING',
  'BOOK_CONSULTATION',
  'BOOK_PRIORITY_CONSULTATION',
  'CONTINUE_CURRENT_PLAN',
  'COMPLETE_PAYMENT',
] as const;

export type CareActionCategory = (typeof CARE_ACTION_CATEGORY_VALUES)[number];

export type AssessmentInterpretationReasonCode =
  | 'ASSESSMENT_MISSING'
  | 'ASSESSMENT_BAND_LOW'
  | 'ASSESSMENT_BAND_MILD'
  | 'ASSESSMENT_BAND_MODERATE'
  | 'ASSESSMENT_BAND_HIGH'
  | 'UPCOMING_SESSION_CONTINUITY_OVERRIDE'
  | 'PENDING_PAYMENT_ACTION_BLOCK';

export type AssessmentCareIntentInterpretation = {
  hasAssessmentSignal: boolean;
  latestBand: AssessmentResultBand | null;
  severityScore: 0 | 1 | 2 | 3 | 4;
  careIntentLevel: CareIntentLevel;
  actionCategory: CareActionCategory;
  reasonCodes: AssessmentInterpretationReasonCode[];
  isActionBlockedByPayment: boolean;
};
