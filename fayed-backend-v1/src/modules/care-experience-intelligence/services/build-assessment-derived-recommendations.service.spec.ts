import { AssessmentResultBand } from '@prisma/client';
import { InterpretAssessmentCareIntentService } from './interpret-assessment-care-intent.service';
import { BuildAssessmentDerivedRecommendationsService } from './build-assessment-derived-recommendations.service';

describe('BuildAssessmentDerivedRecommendationsService', () => {
  const interpretService = new InterpretAssessmentCareIntentService();
  const service = new BuildAssessmentDerivedRecommendationsService();

  it('produces deterministic recommendations from identical interpreted input', () => {
    const interpretation = interpretService.interpret({
      latestAssessmentBand: AssessmentResultBand.MILD,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });

    expect(
      service.build({
        interpretation,
        patientProfileId: 'patient-1',
      }),
    ).toEqual(
      service.build({
        interpretation,
        patientProfileId: 'patient-1',
      }),
    );
  });

  it('maps interpreted payment-blocked action to COMPLETE_PAYMENT recommendation', () => {
    const interpretation = interpretService.interpret({
      latestAssessmentBand: AssessmentResultBand.HIGH,
      hasCompletedAssessment: true,
      hasUpcomingSession: true,
      hasPendingPayment: true,
    });

    const recommendations = service.build({
      interpretation,
      patientProfileId: 'patient-1',
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].type).toBe('COMPLETE_PAYMENT');
    expect(recommendations[0].reasonCode).toBe('PENDING_PAYMENT_ACTION_BLOCK');
    expect(recommendations[0].action.type).toBe('OPEN_PENDING_PAYMENT');
  });

  it('propagates assessment reason codes into recommendation explainability', () => {
    const interpretation = interpretService.interpret({
      latestAssessmentBand: AssessmentResultBand.MODERATE,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });

    const recommendations = service.build({
      interpretation,
      patientProfileId: 'patient-1',
    });

    expect(recommendations[0].reasonCode).toBe('ASSESSMENT_BAND_MODERATE');
    expect(recommendations[0].reasonText).toBeTruthy();
  });

  it('emits at most one assessment-derived recommendation to avoid contradictory assessment outputs', () => {
    const interpretation = interpretService.interpret({
      latestAssessmentBand: AssessmentResultBand.LOW,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });

    const recommendations = service.build({
      interpretation,
      patientProfileId: 'patient-1',
    });

    expect(recommendations).toHaveLength(1);
  });
});
