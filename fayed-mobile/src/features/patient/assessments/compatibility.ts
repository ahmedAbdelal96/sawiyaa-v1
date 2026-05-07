import { AssessmentDefinitionDetails } from "./types";

export type AssessmentCompatibilityReason =
  | "NO_QUESTIONS"
  | "UNSUPPORTED_INPUT_TYPE"
  | "QUESTION_WITHOUT_OPTIONS";

export type AssessmentCompatibility = {
  isCompatible: boolean;
  supportedQuestionCount: number;
  unsupportedQuestionCount: number;
  totalQuestionCount: number;
  reason: AssessmentCompatibilityReason | null;
};

export function getAssessmentCompatibility(
  definition: AssessmentDefinitionDetails | null | undefined,
): AssessmentCompatibility {
  const questions = definition?.questions ?? [];

  if (questions.length === 0) {
    return {
      isCompatible: false,
      supportedQuestionCount: 0,
      unsupportedQuestionCount: 0,
      totalQuestionCount: 0,
      reason: "NO_QUESTIONS",
    };
  }

  let supportedQuestionCount = 0;
  let unsupportedQuestionCount = 0;

  for (const question of questions) {
    if (question.inputType !== "SINGLE_CHOICE") {
      unsupportedQuestionCount += 1;
      continue;
    }

    if (!question.options.length) {
      return {
        isCompatible: false,
        supportedQuestionCount,
        unsupportedQuestionCount,
        totalQuestionCount: questions.length,
        reason: "QUESTION_WITHOUT_OPTIONS",
      };
    }

    supportedQuestionCount += 1;
  }

  if (unsupportedQuestionCount > 0) {
    return {
      isCompatible: false,
      supportedQuestionCount,
      unsupportedQuestionCount,
      totalQuestionCount: questions.length,
      reason: "UNSUPPORTED_INPUT_TYPE",
    };
  }

  return {
    isCompatible: true,
    supportedQuestionCount,
    unsupportedQuestionCount,
    totalQuestionCount: questions.length,
    reason: null,
  };
}
