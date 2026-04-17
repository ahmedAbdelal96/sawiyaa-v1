import { Injectable } from '@nestjs/common';
import { AssessmentResultBand } from '@prisma/client';
import {
  AssessmentCareIntentInterpretation,
  AssessmentInterpretationReasonCode,
} from '../types/assessment-interpretation.types';

@Injectable()
export class InterpretAssessmentCareIntentService {
  interpret(input: {
    latestAssessmentBand: AssessmentResultBand | null;
    hasCompletedAssessment: boolean;
    hasUpcomingSession: boolean;
    hasPendingPayment: boolean;
  }): AssessmentCareIntentInterpretation {
    const reasonCodes: AssessmentInterpretationReasonCode[] = [];

    let severityScore: AssessmentCareIntentInterpretation['severityScore'] = 0;
    let careIntentLevel: AssessmentCareIntentInterpretation['careIntentLevel'] =
      'NO_ASSESSMENT';
    let actionCategory: AssessmentCareIntentInterpretation['actionCategory'] =
      'TAKE_ASSESSMENT';

    if (input.hasCompletedAssessment && input.latestAssessmentBand) {
      const mapped = this.mapBand(input.latestAssessmentBand);
      severityScore = mapped.severityScore;
      careIntentLevel = mapped.careIntentLevel;
      actionCategory = mapped.actionCategory;
      reasonCodes.push(mapped.reasonCode);
    } else {
      reasonCodes.push('ASSESSMENT_MISSING');
    }

    if (input.hasUpcomingSession) {
      actionCategory = 'CONTINUE_CURRENT_PLAN';
      reasonCodes.push('UPCOMING_SESSION_CONTINUITY_OVERRIDE');
    }

    if (input.hasPendingPayment) {
      actionCategory = 'COMPLETE_PAYMENT';
      reasonCodes.push('PENDING_PAYMENT_ACTION_BLOCK');
    }

    return {
      hasAssessmentSignal: input.hasCompletedAssessment,
      latestBand: input.latestAssessmentBand,
      severityScore,
      careIntentLevel,
      actionCategory,
      reasonCodes,
      isActionBlockedByPayment: input.hasPendingPayment,
    };
  }

  private mapBand(band: AssessmentResultBand): {
    severityScore: AssessmentCareIntentInterpretation['severityScore'];
    careIntentLevel: AssessmentCareIntentInterpretation['careIntentLevel'];
    actionCategory: AssessmentCareIntentInterpretation['actionCategory'];
    reasonCode: AssessmentInterpretationReasonCode;
  } {
    switch (band) {
      case AssessmentResultBand.LOW:
        return {
          severityScore: 1,
          careIntentLevel: 'SELF_GUIDED',
          actionCategory: 'MONITOR_AND_SUPPORT',
          reasonCode: 'ASSESSMENT_BAND_LOW',
        };
      case AssessmentResultBand.MILD:
        return {
          severityScore: 2,
          careIntentLevel: 'GUIDED_MATCHING',
          actionCategory: 'START_MATCHING',
          reasonCode: 'ASSESSMENT_BAND_MILD',
        };
      case AssessmentResultBand.MODERATE:
        return {
          severityScore: 3,
          careIntentLevel: 'BOOK_SOON',
          actionCategory: 'BOOK_CONSULTATION',
          reasonCode: 'ASSESSMENT_BAND_MODERATE',
        };
      case AssessmentResultBand.HIGH:
      default:
        return {
          severityScore: 4,
          careIntentLevel: 'BOOK_PRIORITY',
          actionCategory: 'BOOK_PRIORITY_CONSULTATION',
          reasonCode: 'ASSESSMENT_BAND_HIGH',
        };
    }
  }
}

