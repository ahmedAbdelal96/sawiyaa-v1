import { ConfigService } from '@nestjs/config';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { NotificationIntentWriterService } from '@modules/notifications/services/notification-intent-writer.service';
import { ResolveSessionJoinReadinessService } from './resolve-session-join-readiness.service';
import { SessionJoinAvailableNotificationSweeperService } from './session-join-available-notification-sweeper.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionVideoProviderRegistryService } from './session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from './session-video-provider-resolver.service';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';

type JoinCandidate = {
  id: string;
  status: SessionStatus;
  sessionMode: SessionMode;
  joinOpenAt: Date | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  packageSessionIndex?: number | null;
  packageSessionCount?: number | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  patient: {
    user: {
      id: string;
      defaultLocale: 'en' | 'ar';
      emails: Array<{ email: string; isVerified: boolean }>;
    };
  };
  practitioner: {
    user: {
      id: string;
      defaultLocale: 'en' | 'ar';
      emails: Array<{ email: string; isVerified: boolean }>;
    };
  };
  packagePurchase?: {
    id: string;
    packagePlanId: string | null;
    packagePlan: {
      id: string;
      code: string;
      title: string;
      discountPercent: number;
    } | null;
  } | null;
};

type JoinNotificationWriteInput = {
  slug: string;
  userId: string;
  locale?: 'en' | 'ar' | null;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  scheduledFor?: Date | null;
  idempotencyKey?: string | null;
  category?: string;
};

type JoinEmailNotificationWriteInput = {
  slug: string;
  userId: string;
  email?: string | null;
  locale?: 'en' | 'ar' | null;
  subject: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  scheduledFor?: Date | null;
  idempotencyKey?: string | null;
  category?: string;
};

describe('SessionJoinAvailableNotificationSweeperService', () => {
  function buildService(options?: { candidates?: JoinCandidate[] }) {
    const get = jest.fn((key: string) => {
      if (key === 'session.runtimePrepareLeadMinutes') {
        return 24 * 60;
      }

      if (key === 'session.joinLeadMinutes') {
        return 15;
      }

      if (key === 'session.joinLagMinutes') {
        return 120;
      }

      return undefined;
    });
    const configService = { get } as unknown as ConfigService;

    let currentSession: JoinCandidate = options?.candidates?.[0] ?? {
      id: 'session_1',
      status: SessionStatus.CONFIRMED,
      sessionMode: SessionMode.VIDEO,
      joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
      scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
      scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
      provider: SessionProvider.NONE,
      providerRoomId: null,
      providerSessionRef: null,
      packageSessionIndex: null,
      packageSessionCount: null,
      packagePurchase: null,
      patient: {
        user: {
          id: 'patient-user-1',
          defaultLocale: 'ar',
          emails: [{ email: 'patient@example.com', isVerified: true }],
        },
      },
      practitioner: {
        user: {
          id: 'practitioner-user-1',
          defaultLocale: 'en',
          emails: [{ email: 'pr@example.com', isVerified: true }],
        },
      },
    };

    const listJoinNotificationCandidates = jest.fn(() =>
      Promise.resolve(options?.candidates ?? [currentSession]),
    );

    const updateStatus = jest.fn(
      (
        _sessionId: string,
        data: Partial<
          Pick<
            JoinCandidate,
            'status' | 'provider' | 'providerRoomId' | 'providerSessionRef'
          >
        >,
      ) => {
        currentSession = {
          ...currentSession,
          ...data,
        };

        return Promise.resolve(currentSession);
      },
    );

    const updateRuntimeIfMissing = jest.fn((_, data) => {
      currentSession = {
        ...currentSession,
        ...(data as Partial<JoinCandidate>),
      };

      return Promise.resolve({
        count: 1,
      });
    });

    const createEvent = jest.fn(() => Promise.resolve({}));

    const sessionRepository = {
      listJoinNotificationCandidates,
      updateStatus,
      updateRuntimeIfMissing,
      createEvent,
      findById: jest.fn(() => Promise.resolve(currentSession)),
    } as unknown as SessionRepository;

    const prisma = {
      $transaction: jest.fn((handler: (tx: never) => unknown) => {
        if (typeof handler === 'function') {
          return handler({} as never);
        }

        return Promise.resolve(handler);
      }),
    } as unknown as PrismaService;

    const adapterCreateRoom = jest.fn(() =>
      Promise.resolve({
        roomId: 'daily-room-1',
        roomUrl: 'https://provider.example/room',
      }),
    );

    const resolvePreparedProviderForSession = jest.fn(
      () => SessionProvider.DAILY,
    );
    const sessionVideoProviderResolverService = {
      resolvePreparedProviderForSession,
    } as unknown as SessionVideoProviderResolverService;

    const getProviderAdapter = jest.fn(() => ({
      provider: SessionProvider.DAILY,
      createRoom: adapterCreateRoom,
    }));
    const sessionVideoProviderRegistryService = {
      get: getProviderAdapter,
    } as unknown as SessionVideoProviderRegistryService;

    const assertCanTransition = jest.fn();
    const validateSessionStatusTransitionService = {
      assertCanTransition,
    } as unknown as ValidateSessionStatusTransitionService;

    const seenIdempotencyKeys = new Set<string>();
    const seenEmailIdempotencyKeys = new Set<string>();
    const notificationWrites: JoinNotificationWriteInput[] = [];
    const emailNotificationWrites: JoinEmailNotificationWriteInput[] = [];
    const createInAppNotification = jest.fn(
      (input: JoinNotificationWriteInput) => {
        if (
          input.idempotencyKey &&
          seenIdempotencyKeys.has(input.idempotencyKey)
        ) {
          return Promise.resolve(null);
        }

        if (input.idempotencyKey) {
          seenIdempotencyKeys.add(input.idempotencyKey);
        }

        notificationWrites.push(input);
        return Promise.resolve({
          id: `notification_${notificationWrites.length}`,
        });
      },
    );
    const createEmailNotification = jest.fn(
      (input: JoinEmailNotificationWriteInput) => {
        if (
          input.idempotencyKey &&
          seenEmailIdempotencyKeys.has(input.idempotencyKey)
        ) {
          return Promise.resolve(null);
        }

        if (input.idempotencyKey) {
          seenEmailIdempotencyKeys.add(input.idempotencyKey);
        }

        emailNotificationWrites.push(input);
        return Promise.resolve({
          id: `email_notification_${emailNotificationWrites.length}`,
        });
      },
    );
    const notificationIntentWriterService = {
      createInAppNotification,
      createEmailNotification,
    } as unknown as NotificationIntentWriterService;

    const t = jest.fn((key: string, locale: 'en' | 'ar') => {
      if (key === 'sessions.notifications.sessionJoinAvailableTitle') {
        return locale === 'ar' ? 'جلستك جاهزة للدخول' : 'Session ready to join';
      }

      if (key === 'sessions.notifications.sessionJoinAvailableBody') {
        return locale === 'ar'
          ? 'تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان.'
          : 'Your session starts soon. Open the session page to join securely.';
      }

      return key;
    });
    const i18nService = { t } as unknown as I18nService;

    const info = jest.fn();
    const error = jest.fn();
    const logger = { info, error } as unknown as AppLoggerService;

    const resolveSessionJoinReadinessService =
      new ResolveSessionJoinReadinessService(configService);

    const service = new SessionJoinAvailableNotificationSweeperService(
      configService,
      prisma,
      sessionRepository,
      resolveSessionJoinReadinessService,
      sessionVideoProviderRegistryService,
      sessionVideoProviderResolverService,
      validateSessionStatusTransitionService,
      notificationIntentWriterService,
      i18nService,
      logger,
    );

    return {
      service,
      listJoinNotificationCandidates,
      updateStatus,
      updateRuntimeIfMissing,
      createEvent,
      adapterCreateRoom,
      resolvePreparedProviderForSession,
      getProviderAdapter,
      assertCanTransition,
      createInAppNotification,
      createEmailNotification,
      notificationWrites,
      emailNotificationWrites,
      seenIdempotencyKeys,
      seenEmailIdempotencyKeys,
      info,
      error,
      currentSessionRef: () => currentSession,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates patient and practitioner join notifications with internal links and safe payloads', async () => {
    const setup = buildService();

    const handled = await setup.service.sweepOnce(
      new Date('2026-05-01T10:00:00.000Z'),
    );

    expect(handled).toBe(1);
    expect(setup.resolvePreparedProviderForSession).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: SessionProvider.NONE,
      }),
    );
    expect(setup.adapterCreateRoom).toHaveBeenCalledWith({
      sessionId: 'session_1',
      startsAt: new Date('2026-05-01T10:15:00.000Z'),
      endsAt: new Date('2026-05-01T10:45:00.000Z'),
    });
    expect(setup.assertCanTransition).toHaveBeenCalledWith(
      SessionStatus.CONFIRMED,
      SessionStatus.READY_TO_JOIN,
    );

    expect(setup.createInAppNotification).toHaveBeenCalledTimes(2);
    expect(setup.createEmailNotification).toHaveBeenCalledTimes(2);
    const patientNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'patient-user-1',
    );
    const practitionerNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'practitioner-user-1',
    );
    const patientEmailNotification = setup.emailNotificationWrites.find(
      (entry) => entry.userId === 'patient-user-1',
    );
    const practitionerEmailNotification = setup.emailNotificationWrites.find(
      (entry) => entry.userId === 'practitioner-user-1',
    );

    expect(patientNotification).toBeDefined();
    expect(practitionerNotification).toBeDefined();
    expect(patientEmailNotification).toBeDefined();
    expect(practitionerEmailNotification).toBeDefined();

    expect(patientNotification).toMatchObject({
      slug: 'sessions.session-join-available',
      userId: 'patient-user-1',
      locale: 'ar',
      idempotencyKey:
        'sessions.session-join-available:session_1:patient-user-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      payload: {
        sessionId: 'session_1',
        recipientRole: 'PATIENT',
        routePath: '/ar/patient/sessions/session_1',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
      },
    });
    expect(patientNotification?.payload).not.toHaveProperty(
      'packagePurchaseId',
    );
    expect(practitionerNotification).toMatchObject({
      slug: 'sessions.session-join-available',
      userId: 'practitioner-user-1',
      locale: 'en',
      idempotencyKey:
        'sessions.session-join-available:session_1:practitioner-user-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      payload: {
        sessionId: 'session_1',
        recipientRole: 'PRACTITIONER',
        routePath: '/en/practitioner/sessions/session_1',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
      },
    });

    expect(patientEmailNotification).toMatchObject({
      slug: 'sessions.session-join-available',
      userId: 'patient-user-1',
      email: 'patient@example.com',
      locale: 'ar',
      idempotencyKey:
        'sessions.session-join-available:email:session_1:patient-user-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      payload: {
        sessionId: 'session_1',
        recipientRole: 'PATIENT',
        routePath: '/ar/patient/sessions/session_1',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
      },
    });
    expect(practitionerEmailNotification).toMatchObject({
      slug: 'sessions.session-join-available',
      userId: 'practitioner-user-1',
      email: 'pr@example.com',
      locale: 'en',
      idempotencyKey:
        'sessions.session-join-available:email:session_1:practitioner-user-1',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      payload: {
        sessionId: 'session_1',
        recipientRole: 'PRACTITIONER',
        routePath: '/en/practitioner/sessions/session_1',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
      },
    });

    for (const write of setup.notificationWrites) {
      expect(write).not.toHaveProperty('providerRoomUrl');
      expect(write).not.toHaveProperty('providerRoomId');
      expect(write).not.toHaveProperty('providerRuntime');
      expect(write).not.toHaveProperty('joinToken');
    }
    for (const write of setup.emailNotificationWrites) {
      expect(write).not.toHaveProperty('providerRoomUrl');
      expect(write).not.toHaveProperty('providerRoomId');
      expect(write).not.toHaveProperty('providerRuntime');
      expect(write).not.toHaveProperty('joinToken');
    }

    expect(setup.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PROVIDER_ROOM_CREATED',
      }),
      expect.anything(),
    );
    expect(setup.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SESSION_READY_TO_JOIN',
      }),
      expect.anything(),
    );
  });

  it('includes package context for package-linked join notifications', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'session_1',
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.VIDEO,
          joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
          scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
          packageSessionIndex: 2,
          packageSessionCount: 4,
          provider: SessionProvider.NONE,
          providerRoomId: null,
          providerSessionRef: null,
          packagePurchase: {
            id: 'purchase_1',
            packagePlanId: 'plan_1',
            packagePlan: {
              id: 'plan_1',
              code: 'SESSIONS_4',
              title: '4 sessions',
              discountPercent: 10,
            },
          },
          patient: {
            user: {
              id: 'patient-user-1',
              defaultLocale: 'ar',
              emails: [{ email: 'patient@example.com', isVerified: true }],
            },
          },
          practitioner: {
            user: {
              id: 'practitioner-user-1',
              defaultLocale: 'en',
              emails: [{ email: 'pr@example.com', isVerified: true }],
            },
          },
        },
      ],
    });

    const handled = await setup.service.sweepOnce(
      new Date('2026-05-01T10:00:00.000Z'),
    );

    expect(handled).toBe(1);
    const patientNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'patient-user-1',
    );
    const practitionerNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'practitioner-user-1',
    );

    expect(patientNotification?.payload).toMatchObject({
      packagePurchaseId: 'purchase_1',
      packagePlanCode: 'SESSIONS_4',
      packagePlanTitle: '4 sessions',
      packageSessionIndex: 2,
      packageSessionCount: 4,
      packageDiscountPercent: 10,
    });
    expect(practitionerNotification?.payload).toMatchObject({
      packagePurchaseId: 'purchase_1',
      packagePlanCode: 'SESSIONS_4',
      packagePlanTitle: '4 sessions',
      packageSessionIndex: 2,
      packageSessionCount: 4,
      packageDiscountPercent: 10,
    });
  });

  it('does not notify cancelled or non-video sessions', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'session_cancelled',
          status: SessionStatus.CANCELLED,
          sessionMode: SessionMode.VIDEO,
          joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
          scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
          provider: SessionProvider.NONE,
          providerRoomId: null,
          providerSessionRef: null,
          patient: {
            user: {
              id: 'patient-user-2',
              defaultLocale: 'en',
              emails: [{ email: 'patient2@example.com', isVerified: true }],
            },
          },
          practitioner: {
            user: {
              id: 'practitioner-user-2',
              defaultLocale: 'en',
              emails: [{ email: 'pr2@example.com', isVerified: true }],
            },
          },
        },
        {
          id: 'session_audio',
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.AUDIO,
          joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
          scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
          provider: SessionProvider.NONE,
          providerRoomId: null,
          providerSessionRef: null,
          patient: {
            user: {
              id: 'patient-user-3',
              defaultLocale: 'en',
              emails: [],
            },
          },
          practitioner: {
            user: {
              id: 'practitioner-user-3',
              defaultLocale: 'en',
              emails: [],
            },
          },
        },
      ],
    });

    const handled = await setup.service.sweepOnce(
      new Date('2026-05-01T10:00:00.000Z'),
    );

    expect(handled).toBe(0);
    expect(setup.createInAppNotification).not.toHaveBeenCalled();
    expect(setup.createEmailNotification).not.toHaveBeenCalled();
    expect(setup.updateStatus).not.toHaveBeenCalled();
    expect(setup.updateRuntimeIfMissing).not.toHaveBeenCalled();
    expect(setup.createEvent).not.toHaveBeenCalled();
  });

  it('includes package context for package-linked join notifications', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'session_1',
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.VIDEO,
          joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
          scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
          packageSessionIndex: 2,
          packageSessionCount: 4,
          provider: SessionProvider.NONE,
          providerRoomId: null,
          providerSessionRef: null,
          packagePurchase: {
            id: 'purchase_1',
            packagePlanId: 'plan_1',
            packagePlan: {
              id: 'plan_1',
              code: 'SESSIONS_4',
              title: '4 sessions',
              discountPercent: 10,
            },
          },
          patient: {
            user: {
              id: 'patient-user-1',
              defaultLocale: 'ar',
              emails: [{ email: 'patient@example.com', isVerified: true }],
            },
          },
          practitioner: {
            user: {
              id: 'practitioner-user-1',
              defaultLocale: 'en',
              emails: [{ email: 'pr@example.com', isVerified: true }],
            },
          },
        },
      ],
    });

    const handled = await setup.service.sweepOnce(
      new Date('2026-05-01T10:00:00.000Z'),
    );

    expect(handled).toBe(1);
    const patientNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'patient-user-1',
    );
    const practitionerNotification = setup.notificationWrites.find(
      (entry) => entry.userId === 'practitioner-user-1',
    );

    expect(patientNotification?.payload).toMatchObject({
      packagePurchaseId: 'purchase_1',
      packagePlanCode: 'SESSIONS_4',
      packagePlanTitle: '4 sessions',
      packageSessionIndex: 2,
      packageSessionCount: 4,
      packageDiscountPercent: 10,
    });
    expect(practitionerNotification?.payload).toMatchObject({
      packagePurchaseId: 'purchase_1',
      packagePlanCode: 'SESSIONS_4',
      packagePlanTitle: '4 sessions',
      packageSessionIndex: 2,
      packageSessionCount: 4,
      packageDiscountPercent: 10,
    });
  });

  it('skips email for a recipient with no usable address while still creating in-app notifications', async () => {
    const setup = buildService({
      candidates: [
        {
          id: 'session_missing_email',
          status: SessionStatus.CONFIRMED,
          sessionMode: SessionMode.VIDEO,
          joinOpenAt: new Date('2026-05-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-05-01T10:15:00.000Z'),
          scheduledEndAt: new Date('2026-05-01T10:45:00.000Z'),
          provider: SessionProvider.NONE,
          providerRoomId: null,
          providerSessionRef: null,
          patient: {
            user: {
              id: 'patient-user-4',
              defaultLocale: 'en',
              emails: [],
            },
          },
          practitioner: {
            user: {
              id: 'practitioner-user-4',
              defaultLocale: 'en',
              emails: [{ email: 'pr4@example.com', isVerified: true }],
            },
          },
        },
      ],
    });

    await setup.service.sweepOnce(new Date('2026-05-01T10:00:00.000Z'));
    expect(setup.createInAppNotification).toHaveBeenCalledTimes(2);
    expect(setup.createEmailNotification).toHaveBeenCalledTimes(1);
    expect(setup.emailNotificationWrites).toHaveLength(1);
    expect(setup.emailNotificationWrites[0]).toMatchObject({
      userId: 'practitioner-user-4',
      email: 'pr4@example.com',
      payload: {
        sessionId: 'session_missing_email',
        recipientRole: 'PRACTITIONER',
        routePath: '/en/practitioner/sessions/session_missing_email',
      },
    });
  });

  it('is safe to run repeatedly because idempotency keys stay stable', async () => {
    const setup = buildService();

    await setup.service.sweepOnce(new Date('2026-05-01T10:00:00.000Z'));
    await setup.service.sweepOnce(new Date('2026-05-01T10:01:00.000Z'));

    expect(setup.seenIdempotencyKeys).toEqual(
      new Set([
        'sessions.session-join-available:session_1:patient-user-1',
        'sessions.session-join-available:session_1:practitioner-user-1',
      ]),
    );
    expect(setup.seenEmailIdempotencyKeys).toEqual(
      new Set([
        'sessions.session-join-available:email:session_1:patient-user-1',
        'sessions.session-join-available:email:session_1:practitioner-user-1',
      ]),
    );
    expect(setup.notificationWrites).toHaveLength(2);
    expect(setup.emailNotificationWrites).toHaveLength(2);
  });
});
