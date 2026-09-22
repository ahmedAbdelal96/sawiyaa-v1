import { SessionMode, SessionStatus } from '@prisma/client';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { SessionMapper } from '../mappers/session.mapper';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { GetSessionDetailsUseCase } from './get-session-details.use-case';

describe('session professional content localization', () => {
  const operational = {
    state: SessionStatus.UPCOMING,
    timelineBucket: 'ACTIONABLE' as const,
    reasonCode: 'LIFECYCLE_STATUS' as const,
    join: {
      allowed: false,
      reasonCode: null,
      canPrepareRuntime: false,
      opensAt: null,
      closesAt: null,
    },
    actions: {
      canJoin: false,
      canPrepareRuntime: false,
      canCancel: false,
      canPay: false,
      canReview: false,
      canMarkPatientNoShow: false,
      noShowReasonCode: null,
    },
    attendance: {
      patientTrustedAttendance: false,
      practitionerTrustedAttendance: false,
      reconciliationStatus: 'NOT_AVAILABLE' as const,
      outcomeRecommendation: null,
    },
    room: { state: 'NOT_APPLICABLE' as const, closedAt: null },
    resolution: { required: false, finalDecision: null },
    replacement: { replacesSessionId: null },
  };

  const session = {
    id: 'session-1',
    sessionCode: 'S-1',
    status: SessionStatus.UPCOMING,
    flowType: 'SCHEDULED',
    sessionMode: SessionMode.VIDEO,
    durationMinutes: 30,
    createdAt: new Date('2026-08-17T08:00:00.000Z'),
    scheduledStartAt: new Date('2026-08-18T09:00:00.000Z'),
    scheduledEndAt: new Date('2026-08-18T09:30:00.000Z'),
    expiresAt: null,
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    expiredAt: null,
    timezoneSnapshot: 'Asia/Riyadh',
    videoRoomClosedAt: null,
    videoRoomCloseReason: null,
    videoRoomCloseNote: null,
    paymentCoverageType: 'DIRECT_PAYMENT',
    provider: null,
    providerRoomId: null,
    providerSessionRef: null,
    patient: {
      id: 'patient-1',
      dateOfBirth: null,
      gender: null,
      user: { displayName: 'Patient' },
      country: null,
    },
    practitioner: {
      id: 'practitioner-1',
      publicSlug: 'mona-hassan',
      professionalTitle: 'Legacy title',
      avatarUrl: null,
      user: { displayName: 'Mona Hassan' },
      specialties: [],
    },
    packagePurchase: null,
    payments: [],
    conversations: [],
    events: [],
    corporateSponsorship: null,
    reviews: [],
  };

  function buildUseCase() {
    const sessionRepository = {
      findByIdWithRichDetails: jest.fn().mockResolvedValue(session),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
    };
    const professionalContentRepository = {
      findByPractitionerProfileId: jest.fn().mockResolvedValue({
        primaryContentLocale: 'en',
        professionalTitle: 'Legacy title',
        bio: null,
        professionalContentTranslations: [
          {
            locale: 'ar',
            professionalTitle: 'أخصائي نفسي إكلينيكي',
            bio: null,
          },
          {
            locale: 'en',
            professionalTitle: 'Clinical Psychologist',
            bio: null,
          },
        ],
      }),
    };
    const useCase = new GetSessionDetailsUseCase(
      sessionRepository as never,
      {
        findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      } as never,
      { findByUserId: jest.fn() } as never,
      new SessionMapper(),
      new SessionAccessPolicy(),
      { resolveOne: jest.fn().mockResolvedValue(undefined) } as never,
      { interpret: jest.fn().mockResolvedValue(operational) } as never,
      { resolve: jest.fn().mockResolvedValue(undefined) } as never,
      { resolve: jest.fn().mockReturnValue({ available: true }) } as never,
      professionalContentRepository as never,
      new PractitionerProfessionalContentResolver(),
    );

    return { useCase, sessionRepository, professionalContentRepository };
  }

  async function read(locale: 'ar' | 'en') {
    const { useCase } = buildUseCase();
    return useCase.execute({
      userId: 'patient-user-1',
      locale,
      sessionId: 'session-1',
      actorType: 'PATIENT',
    });
  }

  it('changes only the existing professionalTitle presentation field between AR and EN', async () => {
    const [ar, en] = await Promise.all([read('ar'), read('en')]);

    expect(ar.item.practitionerDetails?.professionalTitle).toBe(
      'أخصائي نفسي إكلينيكي',
    );
    expect(en.item.practitionerDetails?.professionalTitle).toBe(
      'Clinical Psychologist',
    );

    const withoutTitle = (item: typeof ar.item) => ({
      ...item,
      practitionerDetails: item.practitionerDetails
        ? { ...item.practitionerDetails, professionalTitle: null }
        : null,
    });

    expect(withoutTitle(ar.item)).toEqual(withoutTitle(en.item));
    expect(ar.item.operational).toEqual(en.item.operational);
    expect(ar.item.id).toBe(en.item.id);
    expect(ar.item.scheduledStartAt).toBe(en.item.scheduledStartAt);
    expect(ar.item.durationMinutes).toBe(en.item.durationMinutes);
    expect(ar.item.paymentCoverageType).toBe(en.item.paymentCoverageType);
  });

  it('preserves the legacy title when no live content record exists', async () => {
    const { useCase, professionalContentRepository } = buildUseCase();
    professionalContentRepository.findByPractitionerProfileId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      userId: 'patient-user-1',
      locale: 'ar',
      sessionId: 'session-1',
      actorType: 'PATIENT',
    });

    expect(result.item.practitionerDetails?.professionalTitle).toBe(
      'Legacy title',
    );
  });
});
