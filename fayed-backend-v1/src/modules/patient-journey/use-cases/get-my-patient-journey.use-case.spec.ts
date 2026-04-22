import { NotFoundException } from '@nestjs/common';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import { SessionStatus } from '@prisma/client';
import { PatientJourneyMapper } from '../mappers/patient-journey.mapper';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientJourneyReadRepository } from '../repositories/patient-journey-read.repository';
import { BuildPatientJourneyLinkedContentService } from '../services/build-patient-journey-linked-content.service';
import { BuildPatientJourneyNextStepsService } from '../services/build-patient-journey-next-steps.service';
import { GetMyPatientJourneyUseCase } from './get-my-patient-journey.use-case';

describe('GetMyPatientJourneyUseCase', () => {
  it('throws not found when patient profile is missing', async () => {
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue(null),
    } as unknown as PatientJourneyPatientRepository;

    const useCase = new GetMyPatientJourneyUseCase(
      patientRepository,
      {} as PatientJourneyReadRepository,
      {} as BuildNormalizedCareSignalContextService,
      {} as BuildAssessmentDerivedRecommendationsService,
      new BuildPatientJourneyNextStepsService(
        new RecommendationPrecedenceService(),
      ),
      {
        build: jest.fn().mockResolvedValue([]),
      } as unknown as BuildPatientJourneyLinkedContentService,
      new PatientJourneyMapper(),
    );

    await expect(
      useCase.execute({ userId: 'missing-user' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns curated journey payload for owned patient data', async () => {
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as PatientJourneyPatientRepository;

    const readRepository = {
      findUpcomingSession: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.UPCOMING,
        scheduledStartAt: new Date('2026-04-01T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-01T11:00:00.000Z'),
        practitioner: {
          publicSlug: 'dr-one',
          user: { displayName: 'Dr One' },
        },
      }),
      findPendingInstantBookingRequest: jest.fn().mockResolvedValue(null),
      findLatestAssessment: jest.fn().mockResolvedValue(null),
      findLatestMatchingSession: jest.fn().mockResolvedValue(null),
      findLatestOpenSupportTicket: jest.fn().mockResolvedValue(null),
      listRecentPastSessions: jest.fn().mockResolvedValue([]),
      listRecentAssessments: jest.fn().mockResolvedValue([]),
      listRecentMatchingSessions: jest.fn().mockResolvedValue([]),
      listRecentPayments: jest.fn().mockResolvedValue([]),
      findPendingPayment: jest.fn().mockResolvedValue(null),
    } as unknown as PatientJourneyReadRepository;
    const normalizedContextBuilder = {
      buildFromRepository: jest.fn().mockResolvedValue({
        profile: {
          patientProfileId: 'patient-1',
          userId: 'user-1',
          countryCode: 'EG',
          timezone: 'Africa/Cairo',
        },
        assessments: {
          hasCompletedAssessment: false,
          latestBand: null,
          latestCompletedAt: null,
          interpretation: {
            hasAssessmentSignal: false,
            latestBand: null,
            severityScore: 0,
            careIntentLevel: 'NO_ASSESSMENT',
            actionCategory: 'TAKE_ASSESSMENT',
            reasonCodes: ['ASSESSMENT_MISSING'],
            isActionBlockedByPayment: false,
          },
        },
        sessions: {
          hasUpcomingSession: true,
          upcomingStatus: SessionStatus.UPCOMING,
          hasPastSession: false,
        },
        payments: { hasPendingPayment: false, pendingStatus: null },
        matching: { hasRecentSession: false },
        training: { hasActiveEnrollment: false },
        support: { hasOpenTicket: false, latestOpenTicketStatus: null },
        continuity: {
          stage: 'UPCOMING_SESSION',
          rulesApplied: ['UPCOMING_SESSION_HAS_PRIORITY'],
        },
      }),
    } as unknown as BuildNormalizedCareSignalContextService;
    const assessmentRecommendationsBuilder = {
      build: jest.fn().mockReturnValue([]),
    } as unknown as BuildAssessmentDerivedRecommendationsService;
    const linkedContentBuilder = {
      build: jest.fn().mockResolvedValue([]),
    } as unknown as BuildPatientJourneyLinkedContentService;

    const useCase = new GetMyPatientJourneyUseCase(
      patientRepository,
      readRepository,
      normalizedContextBuilder,
      assessmentRecommendationsBuilder,
      new BuildPatientJourneyNextStepsService(
        new RecommendationPrecedenceService(),
      ),
      linkedContentBuilder,
      new PatientJourneyMapper(),
    );

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.item.summary.hasUpcomingSession).toBe(true);
    expect(result.item.summary.suggestedNextAction).toBe(
      'JOIN_UPCOMING_SESSION',
    );
    expect(result.item.upcoming.session?.id).toBe('session-1');
    expect(normalizedContextBuilder.buildFromRepository).toHaveBeenCalledWith({
      patientProfileId: 'patient-1',
      userId: 'user-1',
      now: expect.any(Date),
    });
    expect(assessmentRecommendationsBuilder.build).toHaveBeenCalledWith({
      interpretation: expect.any(Object),
      patientProfileId: 'patient-1',
    });
    expect(linkedContentBuilder.build).toHaveBeenCalledWith({
      normalizedContext: expect.any(Object),
      suggestedNextAction: 'JOIN_UPCOMING_SESSION',
    });
  });
});
