import { NotFoundException } from '@nestjs/common';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { CreateMatchingSessionUseCase } from './create-matching-session.use-case';
import { MatchingPatientRepository } from '../repositories/matching-patient.repository';
import { MatchingSessionRepository } from '../repositories/matching-session.repository';
import { MatchingCandidateRepository } from '../repositories/matching-candidate.repository';
import { NormalizeMatchingInputService } from '../services/normalize-matching-input.service';
import { ScorePractitionerMatchService } from '../services/score-practitioner-match.service';
import { BuildMatchingRationaleService } from '../services/build-matching-rationale.service';
import { MatchingPresenter } from '../presenters/matching.presenter';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { CreateMatchingSessionDto } from '../dto/create-matching-session.dto';

describe('CreateMatchingSessionUseCase', () => {
  const matchingPatientRepository = {
    findByUserId: jest.fn(),
  } as unknown as MatchingPatientRepository;
  const matchingSessionRepository = {
    createCompletedSession: jest.fn(),
  } as unknown as MatchingSessionRepository;
  const matchingCandidateRepository = {
    listPublicCandidates: jest.fn(),
  } as unknown as MatchingCandidateRepository;
  const normalizeMatchingInputService = {
    normalize: jest.fn(),
  } as unknown as NormalizeMatchingInputService;
  const buildNormalizedCareSignalContextService = {
    buildFromRepository: jest.fn(),
  } as unknown as BuildNormalizedCareSignalContextService;
  const buildAssessmentDerivedRecommendationsService = {
    build: jest.fn(),
  } as unknown as BuildAssessmentDerivedRecommendationsService;
  const scorePractitionerMatchService = {
    score: jest.fn(),
  } as unknown as ScorePractitionerMatchService;
  const buildMatchingRationaleService = {
    build: jest.fn(),
  } as unknown as BuildMatchingRationaleService;
  const matchingPresenter = {
    presentSession: jest.fn(),
  } as unknown as MatchingPresenter;
  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn().mockReturnValue({ isVisible: true }),
  } as unknown as PublicPractitionerVisibilityPolicy;

  const useCase = new CreateMatchingSessionUseCase(
    matchingPatientRepository,
    matchingSessionRepository,
    matchingCandidateRepository,
    normalizeMatchingInputService,
    buildNormalizedCareSignalContextService,
    buildAssessmentDerivedRecommendationsService,
    scorePractitionerMatchService,
    buildMatchingRationaleService,
    matchingPresenter,
    publicPractitionerVisibilityPolicy,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates matching session and persists ranked recommendations', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue({
      id: 'patient-1',
    });
    normalizeMatchingInputService.normalize = jest.fn().mockReturnValue({
      normalized: {
        preferredSpecialtySlug: 'anxiety',
        preferredLanguage: 'ar',
        urgency: 'FLEXIBLE',
        preferInstantBooking: false,
      },
      answers: [{ key: 'PRIMARY_CONCERN', valueJson: 'anxiety' }],
    });
    buildNormalizedCareSignalContextService.buildFromRepository = jest
      .fn()
      .mockResolvedValue({
        profile: { countryCode: 'EG', timezone: 'Africa/Cairo' },
        assessments: {
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
      });
    buildAssessmentDerivedRecommendationsService.build = jest
      .fn()
      .mockReturnValue([]);
    matchingCandidateRepository.listPublicCandidates = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'pr-1',
          status: 'APPROVED',
          isPublicProfilePublished: true,
          publicSlug: 'dr-one',
          professionalTitle: 'Psychologist',
          bio: 'bio',
          practitionerType: 'PSYCHOLOGIST',
          sessionPrice30: 400,
          sessionPrice60: 700,
          yearsOfExperience: 5,
          createdAt: new Date('2026-01-01'),
          user: { status: 'ACTIVE', displayName: 'Dr One' },
          specialties: [{ specialty: { slug: 'anxiety', translations: [] } }],
          languages: [{ language: { code: 'ar' } }],
          presence: { status: 'ONLINE', isInstantBookingEnabled: true },
          availabilityWeeks: [{ id: 'week-1' }],
        },
      ]);
    scorePractitionerMatchService.score = jest.fn().mockReturnValue({
      score: 88,
      signals: {
        matchedSpecialty: true,
        matchedLanguage: true,
        matchedGenderPreference: true,
        matchedSessionMode: true,
        matchedBudget: true,
        matchedUrgency: true,
        matchedProviderType: true,
        matchedInstantBooking: true,
        matchedFirstTimePreference: true,
      },
      breakdown: {
        specialty: { earned: 24, max: 24 },
        language: { earned: 16, max: 16 },
        budget: { earned: 18, max: 18 },
        urgency: { earned: 10, max: 10 },
        providerType: { earned: 8, max: 8 },
        instantBooking: { earned: 5, max: 5 },
        firstTime: { earned: 5, max: 5 },
        sessionMode: { earned: 4, max: 4 },
        experienceDepth: { earned: 4, max: 6 },
        availabilityReadiness: { earned: 3, max: 4 },
        total: 88,
      },
    });
    buildMatchingRationaleService.build = jest.fn().mockReturnValue({
      matchedSpecialty: true,
      matchedLanguage: true,
      matchedGenderPreference: true,
      matchedSessionMode: true,
      matchedBudget: true,
      matchedUrgency: true,
      matchedProviderType: true,
      matchedInstantBooking: true,
      scoreBreakdown: { total: 88 },
      notes: ['good fit'],
    });
    matchingSessionRepository.createCompletedSession = jest
      .fn()
      .mockResolvedValue({
        id: 'session-1',
        answers: [],
        recommendations: [],
      });
    matchingPresenter.presentSession = jest.fn().mockReturnValue({
      sessionId: 'session-1',
      answers: {},
      items: [],
    });

    const payload: CreateMatchingSessionDto = {};
    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'ar',
      payload,
    });

    expect(result.sessionId).toBe('session-1');

    const createCalls = (
      matchingSessionRepository as unknown as {
        createCompletedSession: jest.Mock;
      }
    ).createCompletedSession.mock.calls;
    expect(createCalls.length).toBeGreaterThan(0);

    const normalizeCalls = (
      normalizeMatchingInputService as unknown as { normalize: jest.Mock }
    ).normalize.mock.calls;
    expect(normalizeCalls[0]).toEqual([
      payload,
      {
        countryCode: 'EG',
        timezone: 'Africa/Cairo',
      },
    ]);

    const assessmentCalls = (
      buildAssessmentDerivedRecommendationsService as unknown as {
        build: jest.Mock;
      }
    ).build.mock.calls;
    const firstAssessmentCall = assessmentCalls[0] as [Record<string, unknown>];
    expect(firstAssessmentCall[0]).toEqual({
      interpretation: {
        hasAssessmentSignal: false,
        latestBand: null,
        severityScore: 0,
        careIntentLevel: 'NO_ASSESSMENT',
        actionCategory: 'TAKE_ASSESSMENT',
        reasonCodes: ['ASSESSMENT_MISSING'],
        isActionBlockedByPayment: false,
      },
      patientProfileId: 'patient-1',
    });
  });

  it('throws if patient profile is missing', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        payload: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes hasAnyAvailability=false when candidate has no published availability weeks', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue({
      id: 'patient-1',
    });
    normalizeMatchingInputService.normalize = jest.fn().mockReturnValue({
      normalized: {},
      answers: [],
    });
    buildNormalizedCareSignalContextService.buildFromRepository = jest
      .fn()
      .mockResolvedValue({
        profile: { countryCode: 'EG', timezone: 'Africa/Cairo' },
        assessments: { interpretation: null },
      });
    buildAssessmentDerivedRecommendationsService.build = jest
      .fn()
      .mockReturnValue([]);
    matchingCandidateRepository.listPublicCandidates = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'pr-2',
          status: 'APPROVED',
          isPublicProfilePublished: true,
          publicSlug: 'dr-two',
          professionalTitle: 'Psychologist',
          bio: 'bio',
          practitionerType: 'PSYCHOLOGIST',
          sessionPrice30: 400,
          sessionPrice60: 700,
          yearsOfExperience: 5,
          createdAt: new Date('2026-01-01'),
          user: { status: 'ACTIVE', displayName: 'Dr Two' },
          specialties: [],
          languages: [],
          presence: { status: 'OFFLINE', isInstantBookingEnabled: false },
          availabilityWeeks: [],
        },
      ]);
    scorePractitionerMatchService.score = jest.fn().mockReturnValue({
      score: 51,
      signals: {
        matchedSpecialty: false,
        matchedLanguage: false,
        matchedGenderPreference: false,
        matchedSessionMode: false,
        matchedBudget: false,
        matchedUrgency: false,
        matchedProviderType: false,
        matchedInstantBooking: false,
        matchedFirstTimePreference: false,
      },
      breakdown: {
        specialty: { earned: 0, max: 24 },
        language: { earned: 0, max: 16 },
        budget: { earned: 0, max: 18 },
        urgency: { earned: 0, max: 10 },
        providerType: { earned: 0, max: 8 },
        instantBooking: { earned: 0, max: 5 },
        firstTime: { earned: 0, max: 5 },
        sessionMode: { earned: 0, max: 4 },
        experienceDepth: { earned: 1, max: 6 },
        availabilityReadiness: { earned: 0, max: 4 },
        total: 51,
      },
    });
    buildMatchingRationaleService.build = jest.fn().mockReturnValue({
      matchedSpecialty: false,
      matchedLanguage: false,
      matchedGenderPreference: false,
      matchedSessionMode: false,
      matchedBudget: false,
      matchedUrgency: false,
      matchedProviderType: false,
      matchedInstantBooking: false,
      scoreBreakdown: { total: 51 },
      notes: [],
    });
    matchingSessionRepository.createCompletedSession = jest
      .fn()
      .mockResolvedValue({
        id: 'session-2',
        answers: [],
        recommendations: [],
      });
    matchingPresenter.presentSession = jest.fn().mockReturnValue({
      sessionId: 'session-2',
      answers: {},
      items: [],
    });

    await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      payload: {},
    });

    expect(scorePractitionerMatchService.score).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: expect.objectContaining({
          hasAnyAvailability: false,
        }),
      }),
    );
  });
});
