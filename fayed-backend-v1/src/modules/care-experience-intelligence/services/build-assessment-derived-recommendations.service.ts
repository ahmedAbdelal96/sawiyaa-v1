import { Injectable } from '@nestjs/common';
import { CareRecommendationType } from '../dto/shared-recommendation.dto';
import { AssessmentCareIntentInterpretation } from '../types/assessment-interpretation.types';

export type CareRecommendationItem = {
  type: CareRecommendationType;
  priority: number;
  reasonCode: string;
  reasonText: string;
  action: {
    type: string;
    targetType: string | null;
    targetId: string | null;
  };
  entityRefs: Array<{
    entityType: string;
    entityId: string;
  }>;
  expiresAt: string | null;
  label: string | null;
};

@Injectable()
export class BuildAssessmentDerivedRecommendationsService {
  build(input: {
    interpretation: AssessmentCareIntentInterpretation;
    patientProfileId: string;
  }): CareRecommendationItem[] {
    const mapped = this.mapActionCategory({
      interpretation: input.interpretation,
      patientProfileId: input.patientProfileId,
    });

    if (!mapped) {
      return [];
    }

    return [mapped];
  }

  private mapActionCategory(input: {
    interpretation: AssessmentCareIntentInterpretation;
    patientProfileId: string;
  }): CareRecommendationItem | null {
    const reasonCode = this.resolveReasonCode(input.interpretation);

    switch (input.interpretation.actionCategory) {
      case 'NONE':
        return null;
      case 'COMPLETE_PAYMENT':
        return {
          type: 'COMPLETE_PAYMENT',
          priority: 100,
          reasonCode,
          reasonText:
            'Your pending payment must be completed before proceeding with new care actions.',
          action: {
            type: 'OPEN_PENDING_PAYMENT',
            targetType: 'PAYMENT',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Complete pending payment',
        };
      case 'CONTINUE_CURRENT_PLAN':
        return {
          type: 'JOIN_UPCOMING_SESSION',
          priority: 90,
          reasonCode,
          reasonText:
            'You already have an upcoming session, so continuity should focus on the current plan.',
          action: {
            type: 'OPEN_UPCOMING_SESSION',
            targetType: 'SESSION',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Join upcoming session',
        };
      case 'TAKE_ASSESSMENT':
        return {
          type: 'TAKE_ASSESSMENT',
          priority: 50,
          reasonCode,
          reasonText:
            'A completed assessment is needed to produce more tailored care recommendations.',
          action: {
            type: 'OPEN_ASSESSMENTS',
            targetType: 'ASSESSMENT',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Take assessment',
        };
      case 'START_MATCHING':
        return {
          type: 'START_GUIDED_MATCHING',
          priority: 60,
          reasonCode,
          reasonText:
            'Your assessment signals suggest guided matching as the best next care step.',
          action: {
            type: 'OPEN_MATCHING',
            targetType: 'MATCHING_SESSION',
            targetId: null,
          },
          entityRefs: [
            {
              entityType: 'PATIENT_PROFILE',
              entityId: input.patientProfileId,
            },
          ],
          expiresAt: null,
          label: 'Start guided matching',
        };
      case 'MONITOR_AND_SUPPORT':
        return {
          type: 'START_GUIDED_MATCHING',
          priority: 55,
          reasonCode,
          reasonText:
            'Current assessment signals are low-intensity; guided matching remains available for supportive continuity.',
          action: {
            type: 'OPEN_MATCHING',
            targetType: 'MATCHING_SESSION',
            targetId: null,
          },
          entityRefs: [
            {
              entityType: 'PATIENT_PROFILE',
              entityId: input.patientProfileId,
            },
          ],
          expiresAt: null,
          label: 'Explore guided matching',
        };
      case 'BOOK_CONSULTATION':
        return {
          type: 'BOOK_NEXT_SESSION',
          priority: 70,
          reasonCode,
          reasonText:
            'Assessment interpretation indicates booking a consultation soon is recommended.',
          action: {
            type: 'OPEN_BOOKING',
            targetType: 'SESSION',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Book consultation',
        };
      case 'BOOK_PRIORITY_CONSULTATION':
        return {
          type: 'BOOK_NEXT_SESSION',
          priority: 75,
          reasonCode,
          reasonText:
            'Assessment interpretation indicates prioritizing a consultation booking.',
          action: {
            type: 'OPEN_BOOKING',
            targetType: 'SESSION',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Book priority consultation',
        };
      default:
        return null;
    }
  }

  private resolveReasonCode(
    interpretation: AssessmentCareIntentInterpretation,
  ): string {
    if (interpretation.reasonCodes.includes('PENDING_PAYMENT_ACTION_BLOCK')) {
      return 'PENDING_PAYMENT_ACTION_BLOCK';
    }
    if (
      interpretation.reasonCodes.includes(
        'UPCOMING_SESSION_CONTINUITY_OVERRIDE',
      )
    ) {
      return 'UPCOMING_SESSION_CONTINUITY_OVERRIDE';
    }
    return interpretation.reasonCodes[0] ?? 'ASSESSMENT_INTERPRETATION';
  }
}
