import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { GetSessionDetailsUseCase } from './get-session-details.use-case';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionStatus, SessionMode, SessionFlowType, PaymentStatus, PaymentPurpose } from '@prisma/client';

describe('Practitioner Session Details API Contract & Authorization', () => {
  const mockSession = {
    id: 'session-id-123',
    sessionCode: 'SES-2026-000123',
    status: SessionStatus.READY_TO_JOIN,
    flowType: SessionFlowType.SCHEDULED,
    sessionMode: SessionMode.VIDEO,
    durationMinutes: 60,
    createdAt: new Date('2026-07-26T10:00:00.000Z'),
    updatedAt: new Date('2026-07-26T10:05:00.000Z'),
    scheduledStartAt: new Date('2026-07-26T12:00:00.000Z'),
    scheduledEndAt: new Date('2026-07-26T13:00:00.000Z'),
    timezoneSnapshot: 'Asia/Riyadh',
    notesInternal: 'Practitioner internal notes',
    patient: {
      id: 'patient-id-456',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'FEMALE',
      user: {
        id: 'user-id-pat',
        displayName: 'Sarah Ahmed',
        defaultLocale: 'ar',
      },
      country: {
        id: 'country-id-sa',
        isoCode: 'SA',
        name: 'Saudi Arabia',
        nativeName: 'المملكة العربية السعودية',
      },
    },
    practitioner: {
      id: 'prac-id-789',
      publicSlug: 'dr-ahmed',
      professionalTitle: 'Consultant',
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
      user: {
        id: 'user-id-prac',
        displayName: 'Dr. Ahmed',
      },
      specialties: [
        {
          isPrimary: true,
          specialty: {
            id: 'spec-id-1',
            nameAr: 'العلاج النفسي',
            nameEn: 'Psychotherapy',
          },
        },
      ],
    },
    packagePurchase: {
      id: 'package-purchase-1',
      packagePlanId: 'plan-id-1',
      packagePlan: {
        id: 'plan-id-1',
        code: 'PKG-PSY',
        title: 'Psychotherapy Pack',
        discountPercent: 10,
      },
    },
    payments: [
      {
        id: 'pay-id-1',
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        status: PaymentStatus.CAPTURED,
        amountTotal: 150.0,
        currencyCode: 'USD',
        provider: 'STRIPE',
        initiatedAt: new Date('2026-07-26T10:01:00.000Z'),
      },
    ],
    conversations: [
      {
        id: 'conv-id-123',
        status: 'OPEN',
        conversationRef: 'REF123',
      },
    ],
    events: [
      {
        id: 'event-id-1',
        eventType: 'SESSION_CREATED',
        occurredAt: new Date('2026-07-26T10:00:00.000Z'),
        createdAt: new Date('2026-07-26T10:00:00.000Z'),
        actorType: 'PATIENT',
        reason: null,
      },
      {
        id: 'event-id-2',
        eventType: 'PAYMENT_CONFIRMED',
        occurredAt: new Date('2026-07-26T10:01:00.000Z'),
        createdAt: new Date('2026-07-26T10:01:00.000Z'),
        actorType: 'SYSTEM',
        reason: null,
      },
    ],
    reviews: [],
  };

  function setupTestContext(sessionMockVal: any = mockSession) {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(sessionMockVal),
      findByIdWithRichDetails: jest.fn().mockResolvedValue(sessionMockVal),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
    };
    const sessionPatientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-id-456' }),
    };
    const sessionPractitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'prac-id-789' }),
    };
    const sessionMapper = new SessionMapper();
    const resolvePatientSessionActionsService = {
      resolveOne: jest.fn().mockResolvedValue({}),
    };

    const useCase = new GetSessionDetailsUseCase(
      sessionRepository as any,
      sessionPatientRepository as any,
      sessionPractitionerRepository as any,
      sessionMapper,
      new SessionAccessPolicy(),
      resolvePatientSessionActionsService as any,
      { interpret: jest.fn().mockResolvedValue({ state: 'UPCOMING', actions: {}, join: {}, room: {} }) } as any,
      { resolve: jest.fn().mockResolvedValue({ canMarkPatientNoShow: false, noShowReasonCode: null }) } as any,
      { resolve: jest.fn().mockReturnValue({ available: true }) } as any,
    );

    return { useCase, sessionRepository, sessionPractitionerRepository };
  }

  it('1. Practitioner can retrieve their own session details with rich metadata', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.id).toBe('session-id-123');
    expect(result.item.sessionCode).toBe('SES-2026-000123');
  });

  it('2. Practitioner cannot retrieve another practitioner’s session (ForbiddenException)', async () => {
    const { useCase, sessionPractitionerRepository } = setupTestContext();
    // Practitioner requesting is 'prac-id-other'
    sessionPractitionerRepository.findByUserId.mockResolvedValue({ id: 'prac-id-other' });

    await expect(
      useCase.execute({
        userId: 'user-id-other-prac',
        locale: 'ar',
        sessionId: 'session-id-123',
        actorType: 'PRACTITIONER',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('3. Patient-private fields are excluded or scoped correctly (e.g. user emails/phones excluded)', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    // Excluded fields should not be present in the returned payload
    expect(result.item.patientDetails).not.toHaveProperty('email');
    expect(result.item.patientDetails).not.toHaveProperty('phone');
  });

  it('4. Booking data is returned (flowType, durationMinutes)', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.flowType).toBe('SCHEDULED');
    expect(result.item.durationMinutes).toBe(60);
  });

  it('5. & 6. Payment snapshot is returned correctly and currency remains authoritative', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.paymentDetails).toBeDefined();
    expect(result.item.paymentDetails?.amountTotal).toBe(150);
    expect(result.item.paymentDetails?.currencyCode).toBe('USD');
  });

  it('7. Package relation is included when present', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.packagePurchase).toBeDefined();
    expect(result.item.packagePurchase?.packagePlan.code).toBe('PKG-PSY');
  });

  it('8. Chat CTA availability is returned from the Session Details projection', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.sessionChat).toEqual({ available: true });
  });

  it('9. Conversation metadata is returned when present', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.conversationId).toBe('conv-id-123');
  });

  it('10. Completion status is mapped correctly', async () => {
    const completedSessionMock = {
      ...mockSession,
      status: SessionStatus.COMPLETED,
      completedAt: new Date('2026-07-26T13:02:00.000Z'),
    };
    const { useCase } = setupTestContext(completedSessionMock);
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.status).toBe('COMPLETED');
    expect(result.item.completedAt).toBeDefined();
  });

  it('11. Missing optional relations do not break response', async () => {
    const minimalSessionMock = {
      ...mockSession,
      packagePurchase: null,
      payments: [],
      conversations: [],
      events: [],
    };
    const { useCase } = setupTestContext(minimalSessionMock);
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.packagePurchase).toBeNull();
    expect(result.item.paymentDetails).toBeNull();
    expect(result.item.conversationId).toBeNull();
    expect(result.item.timeline).toEqual([]);
  });

  it('12. Session timeline uses real timestamps only', async () => {
    const { useCase } = setupTestContext();
    const result = await useCase.execute({
      userId: 'user-id-prac',
      locale: 'ar',
      sessionId: 'session-id-123',
      actorType: 'PRACTITIONER',
    });

    expect(result.item.timeline.length).toBe(2);
    expect(result.item.timeline[0].eventType).toBe('SESSION_CREATED');
    expect(result.item.timeline[0].occurredAt).toBe('2026-07-26T10:00:00.000Z');
  });
});
