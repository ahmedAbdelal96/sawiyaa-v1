import { AssessmentResultBand } from '@prisma/client';
import { InterpretAssessmentCareIntentService } from './interpret-assessment-care-intent.service';

describe('InterpretAssessmentCareIntentService', () => {
  const service = new InterpretAssessmentCareIntentService();

  it('maps assessment bands to deterministic care-intent outputs', () => {
    const low = service.interpret({
      latestAssessmentBand: AssessmentResultBand.LOW,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });
    const high = service.interpret({
      latestAssessmentBand: AssessmentResultBand.HIGH,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });

    expect(low.careIntentLevel).toBe('SELF_GUIDED');
    expect(low.actionCategory).toBe('MONITOR_AND_SUPPORT');
    expect(high.careIntentLevel).toBe('BOOK_PRIORITY');
    expect(high.actionCategory).toBe('BOOK_PRIORITY_CONSULTATION');
  });

  it('resolves conflicting interpretation signals with explicit precedence', () => {
    const result = service.interpret({
      latestAssessmentBand: AssessmentResultBand.HIGH,
      hasCompletedAssessment: true,
      hasUpcomingSession: true,
      hasPendingPayment: true,
    });

    expect(result.careIntentLevel).toBe('BOOK_PRIORITY');
    expect(result.actionCategory).toBe('COMPLETE_PAYMENT');
    expect(result.reasonCodes).toEqual([
      'ASSESSMENT_BAND_HIGH',
      'UPCOMING_SESSION_CONTINUITY_OVERRIDE',
      'PENDING_PAYMENT_ACTION_BLOCK',
    ]);
    expect(result.isActionBlockedByPayment).toBe(true);
  });

  it('returns no-assessment interpretation baseline when assessment is missing', () => {
    const result = service.interpret({
      latestAssessmentBand: null,
      hasCompletedAssessment: false,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    });

    expect(result.careIntentLevel).toBe('NO_ASSESSMENT');
    expect(result.actionCategory).toBe('TAKE_ASSESSMENT');
    expect(result.reasonCodes).toEqual(['ASSESSMENT_MISSING']);
  });

  it('produces identical output for repeated identical input', () => {
    const input = {
      latestAssessmentBand: AssessmentResultBand.MILD,
      hasCompletedAssessment: true,
      hasUpcomingSession: false,
      hasPendingPayment: false,
    };

    expect(service.interpret(input)).toEqual(service.interpret(input));
  });
});

