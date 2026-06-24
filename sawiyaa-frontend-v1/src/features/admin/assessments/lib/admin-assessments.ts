import { toAppError } from "@/lib/api/errors";
import type {
  AdminAssessmentResultBand,
  AdminAssessmentStatus,
} from "../types/admin-assessments.types";

export const ADMIN_ASSESSMENT_STATUS_STYLES: Record<AdminAssessmentStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 dark:bg-slate-600/25 dark:text-slate-200",
};

export const ADMIN_ASSESSMENT_BAND_ORDER: AdminAssessmentResultBand[] = [
  "LOW",
  "MILD",
  "MODERATE",
  "HIGH",
];

const ERROR_KEY_MAP: Record<string, string> = {
  ADMIN_ASSESSMENT_NOT_FOUND: "assessmentsAdmin.errors.notFound",
  ADMIN_ASSESSMENT_NOT_DRAFT: "assessmentsAdmin.errors.notDraft",
  ADMIN_ASSESSMENT_FORK_REQUIRES_PUBLISHED_ACTIVE:
    "assessmentsAdmin.errors.forkRequiresPublishedActive",
  ADMIN_ASSESSMENT_PUBLISH_REQUIRES_DRAFT: "assessmentsAdmin.errors.publishRequiresDraft",
  ADMIN_ASSESSMENT_UNPUBLISH_REQUIRES_ACTIVE:
    "assessmentsAdmin.errors.unpublishRequiresActive",
  ADMIN_ASSESSMENT_IMMUTABLE_PUBLISHED_VERSION:
    "assessmentsAdmin.errors.immutablePublished",
  ADMIN_ASSESSMENT_SLUG_ALREADY_EXISTS: "assessmentsAdmin.errors.slugExists",
  ADMIN_ASSESSMENT_DRAFT_FORK_ALREADY_EXISTS:
    "assessmentsAdmin.errors.draftForkExists",
  ADMIN_ASSESSMENT_CANONICAL_SLUG_COLLISION:
    "assessmentsAdmin.errors.canonicalSlugCollision",
  ADMIN_ASSESSMENT_QUESTION_KEY_EXISTS: "assessmentsAdmin.errors.questionKeyExists",
  ADMIN_ASSESSMENT_OPTION_KEY_EXISTS: "assessmentsAdmin.errors.optionKeyExists",
  ADMIN_ASSESSMENT_INVALID_QUESTION_ORDER:
    "assessmentsAdmin.errors.invalidQuestionOrder",
  ADMIN_ASSESSMENT_INVALID_OPTION_ORDER: "assessmentsAdmin.errors.invalidOptionOrder",
  ADMIN_ASSESSMENT_QUESTION_NOT_FOUND: "assessmentsAdmin.errors.questionNotFound",
  ADMIN_ASSESSMENT_OPTION_NOT_FOUND: "assessmentsAdmin.errors.optionNotFound",
  ADMIN_ASSESSMENT_INVALID_QUESTION_REORDER_PAYLOAD:
    "assessmentsAdmin.errors.invalidQuestionReorder",
  ADMIN_ASSESSMENT_INVALID_OPTION_REORDER_PAYLOAD:
    "assessmentsAdmin.errors.invalidOptionReorder",
  ADMIN_ASSESSMENT_PUBLISH_METADATA_INCOMPLETE:
    "assessmentsAdmin.errors.publishMetadataIncomplete",
  ADMIN_ASSESSMENT_PUBLISH_NO_QUESTIONS:
    "assessmentsAdmin.errors.publishNoQuestions",
  ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_QUESTION_KEY:
    "assessmentsAdmin.errors.publishDuplicateQuestionKey",
  ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_OPTION_KEY:
    "assessmentsAdmin.errors.publishDuplicateOptionKey",
  ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_QUESTION_ORDER:
    "assessmentsAdmin.errors.publishDuplicateQuestionOrder",
  ADMIN_ASSESSMENT_PUBLISH_DUPLICATE_OPTION_ORDER:
    "assessmentsAdmin.errors.publishDuplicateOptionOrder",
  ADMIN_ASSESSMENT_PUBLISH_EMPTY_OPTIONS:
    "assessmentsAdmin.errors.publishEmptyOptions",
  ADMIN_ASSESSMENT_SCORING_DUPLICATE_BAND:
    "assessmentsAdmin.errors.scoringDuplicateBand",
  ADMIN_ASSESSMENT_SCORING_INVALID_RANGE:
    "assessmentsAdmin.errors.scoringInvalidRange",
  ADMIN_ASSESSMENT_SCORING_OVERLAPPING_RANGE:
    "assessmentsAdmin.errors.scoringOverlappingRange",
};

export function getAdminAssessmentsErrorKey(error: unknown) {
  const appError = toAppError(error);
  if (appError.code && ERROR_KEY_MAP[appError.code]) {
    return ERROR_KEY_MAP[appError.code];
  }
  const normalizedMessage = appError.message.toLowerCase();
  if (normalizedMessage.includes("has no options")) {
    return "assessmentsAdmin.errors.publishEmptyOptions";
  }
  return "assessmentsAdmin.errors.generic";
}
