import {
  AssessmentResultBand,
  PaymentStatus,
  SessionStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { CareSignalContextRepository } from '../repositories/care-signal-context.repository';
import { BuildNormalizedCareSignalContextService } from './build-normalized-care-signal-context.service';
import { InterpretAssessmentCareIntentService } from './interpret-assessment-care-intent.service';

describe('BuildNormalizedCareSignalContextService', () => {
  const repository = {
    readSnapshot: jest.fn(),
  } as unknown as CareSignalContextRepository;

  const service = new BuildNormalizedCareSignalContextService(
    repository,
    new InterpretAssessmentCareIntentService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes snapshot deterministically', () => {
    const result = service.buildFromSnapshot({
      patientProfileId: 'patient_1',
      userId: 'user_1',
      patientCountryIsoCode: 'eg',
      userTimezone: 'Africa/Cairo',
      latestAssessmentCompletedAt: new Date('2026-03-01T10:00:00.000Z'),
      latestAssessmentBand: AssessmentResultBand.MODERATE,
      upcomingSessionStatus: SessionStatus.UPCOMING,
      hasPastSession: true,
      pendingPaymentStatus: null,
      hasRecentMatchingSession: true,
      hasOpenSupportTicket: false,
      latestSupportTicketStatus: null,
      hasActiveTrainingEnrollment: false,
    });

    expect(result.profile.countryCode).toBe('EG');
    expect(result.continuity.stage).toBe('UPCOMING_SESSION');
    expect(result.continuity.rulesApplied).toContain(
      'UPCOMING_SESSION_HAS_PRIORITY',
    );
    expect(result.assessments.interpretation.careIntentLevel).toBe('BOOK_SOON');
    expect(result.assessments.interpretation.actionCategory).toBe(
      'CONTINUE_CURRENT_PLAN',
    );
  });

  it('applies precedence: pending payment overrides all other continuity signals', () => {
    const result = service.buildFromSnapshot({
      patientProfileId: 'patient_1',
      userId: 'user_1',
      patientCountryIsoCode: null,
      userTimezone: null,
      latestAssessmentCompletedAt: null,
      latestAssessmentBand: null,
      upcomingSessionStatus: SessionStatus.UPCOMING,
      hasPastSession: true,
      pendingPaymentStatus: PaymentStatus.PENDING,
      hasRecentMatchingSession: true,
      hasOpenSupportTicket: true,
      latestSupportTicketStatus: SupportTicketStatus.OPEN,
      hasActiveTrainingEnrollment: true,
    });

    expect(result.continuity.stage).toBe('PAYMENT_BLOCKED');
    expect(result.continuity.rulesApplied[0]).toBe(
      'PENDING_PAYMENT_BLOCKS_CONTINUITY',
    );
    expect(result.assessments.interpretation.actionCategory).toBe(
      'COMPLETE_PAYMENT',
    );
  });

  it('builds same context for repeated identical snapshot input', () => {
    const snapshot = {
      patientProfileId: 'patient_1',
      userId: 'user_1',
      patientCountryIsoCode: 'eg',
      userTimezone: 'Africa/Cairo',
      latestAssessmentCompletedAt: new Date('2026-03-01T10:00:00.000Z'),
      latestAssessmentBand: AssessmentResultBand.LOW,
      upcomingSessionStatus: null,
      hasPastSession: false,
      pendingPaymentStatus: null,
      hasRecentMatchingSession: false,
      hasOpenSupportTicket: false,
      latestSupportTicketStatus: null,
      hasActiveTrainingEnrollment: false,
    };

    expect(service.buildFromSnapshot(snapshot)).toEqual(
      service.buildFromSnapshot(snapshot),
    );
  });

  it('can build by repository snapshot source', async () => {
    (repository.readSnapshot as jest.Mock).mockResolvedValue({
      patientProfileId: 'patient_1',
      userId: 'user_1',
      patientCountryIsoCode: null,
      userTimezone: null,
      latestAssessmentCompletedAt: null,
      latestAssessmentBand: null,
      upcomingSessionStatus: null,
      hasPastSession: false,
      pendingPaymentStatus: null,
      hasRecentMatchingSession: false,
      hasOpenSupportTicket: false,
      latestSupportTicketStatus: null,
      hasActiveTrainingEnrollment: false,
    });

    const result = await service.buildFromRepository({
      patientProfileId: 'patient_1',
      userId: 'user_1',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(repository.readSnapshot).toHaveBeenCalledWith({
      patientProfileId: 'patient_1',
      userId: 'user_1',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });
    expect(result.continuity.stage).toBe('NEW');
  });
});
