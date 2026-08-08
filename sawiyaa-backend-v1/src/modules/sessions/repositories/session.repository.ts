import { Injectable } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  SessionAdminDecisionType,
  SessionEventType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { sessionCodeSearchFilter } from '../utils/session-code-search.util';
import { AdminSessionsSortDto } from '../dto/list-admin-sessions.dto';
import { SessionPresentationFilter } from '../types/session-video.types';
import { buildSessionPresentationFilterWhere } from '../utils/session-join-policy.util';
import {
  SessionCodeGenerationError,
  SessionCodeGeneratorService,
} from '../services/session-code-generator.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const sessionJoinNotificationCandidateSelect = {
  id: true,
  status: true,
  sessionMode: true,
  joinOpenAt: true,
  joinCloseAt: true,
  schedulePolicySnapshotJson: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  provider: true,
  providerRoomId: true,
  providerSessionRef: true,
  videoRoomClosedAt: true,
  packagePurchaseId: true,
  packageSessionIndex: true,
  packageSessionCount: true,
  packagePurchase: {
    select: {
      id: true,
      packagePlanId: true,
      packagePlan: {
        select: {
          id: true,
          code: true,
          title: true,
          discountPercent: true,
        },
      },
    },
  },
  patient: {
    select: {
      user: {
        select: {
          id: true,
          defaultLocale: true,
          timezone: true,
          emails: {
            where: {
              isPrimary: true,
            },
            take: 1,
            select: {
              email: true,
              isVerified: true,
            },
          },
        },
      },
    },
  },
  practitioner: {
    select: {
      user: {
        select: {
          id: true,
          defaultLocale: true,
          timezone: true,
          emails: {
            where: {
              isPrimary: true,
            },
            take: 1,
            select: {
              email: true,
              isVerified: true,
            },
          },
        },
      },
    },
  },
} as const;

export type SessionJoinNotificationCandidate = Prisma.SessionGetPayload<{
  select: typeof sessionJoinNotificationCandidateSelect;
}>;

const sessionReminderNotificationCandidateSelect = {
  id: true,
  status: true,
  scheduledStartAt: true,
  patient: {
    select: {
      id: true,
    },
  },
  practitioner: {
    select: {
      id: true,
    },
  },
} as const;

const sessionSummaryCandidateSelect = {
  id: true,
  status: true,
  flowType: true,
  sessionMode: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  joinOpenAt: true,
  joinCloseAt: true,
  expiresAt: true,
  provider: true,
  providerRoomId: true,
  providerSessionRef: true,
  videoRoomClosedAt: true,
  originalSessionId: true,
} as const;

export type SessionReminderNotificationCandidate = Prisma.SessionGetPayload<{
  select: typeof sessionReminderNotificationCandidateSelect;
}>;

export type SessionSummaryCandidate = Prisma.SessionGetPayload<{
  select: typeof sessionSummaryCandidateSelect;
}>;

@Injectable()
export class SessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionCodeGenerator: SessionCodeGeneratorService,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async createSession(
    data: Omit<Prisma.SessionUncheckedCreateInput, 'sessionCode'>,
    tx?: Prisma.TransactionClient,
    creationFlow = 'unknown',
  ): Promise<
    Prisma.SessionGetPayload<{
      include: typeof SessionRepository.prototype.sessionInclude;
    }>
  > {
    if (!tx) {
      return this.prisma.$transaction((transaction) =>
        this.createSession(data, transaction, creationFlow),
      );
    }

    const createdAt =
      data.createdAt instanceof Date
        ? data.createdAt
        : data.createdAt
          ? new Date(data.createdAt)
          : new Date();
    const savepoint = 'session_code_generation_retry';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await tx.$executeRawUnsafe(`SAVEPOINT ${savepoint}`);
      let allocation: Awaited<
        ReturnType<SessionCodeGeneratorService['reserveNextSessionCode']>
      > | null = null;

      try {
        allocation = await this.sessionCodeGenerator.reserveNextSessionCode(
          tx,
          createdAt,
          { creationFlow },
        );
        const session = await tx.session.create({
          data: {
            ...data,
            createdAt,
            sessionCode: allocation.code,
          },
          include: this.sessionInclude,
        });
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepoint}`);
        return session;
      } catch (error) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepoint}`);

        if (!this.isSessionCodeUniqueConflict(error) || !allocation) {
          throw error;
        }

        this.sessionCodeGenerator.logCollision({
          dateKey: allocation.dateKey,
          sequence: allocation.sequence,
          retryAttempt: attempt,
          context: { creationFlow },
        });
        if (attempt === 3) {
          throw new SessionCodeGenerationError(
            'SESSION_CODE_GENERATION_FAILED',
            'The session-code generator exhausted its collision retries.',
            {
              dateKey: allocation.dateKey,
              retryAttempt: attempt,
              creationFlow,
            },
          );
        }
        await this.sessionCodeGenerator.advanceAfterCollision(
          tx,
          allocation.dateKey,
        );
      }
    }

    throw new SessionCodeGenerationError(
      'SESSION_CODE_GENERATION_FAILED',
      'The session-code generator failed unexpectedly.',
      { creationFlow },
    );
  }

  private isSessionCodeUniqueConflict(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.includes('sessionCode');
    if (typeof target !== 'string') return false;
    return target.toLowerCase().includes('sessioncode');
  }

  findById(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });
  }

  findByIdWithRichDetails(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).session.findUnique({
      where: { id: sessionId },
      include: this.richDetailsInclude,
    });
  }

  /**
   * Phase 3 — Admin evidence enrichment.
   *
   * Loads a session with the minimum data needed to surface a participant
   * identity summary (displayName, primary email, primary phone) for both
   * the patient and the practitioner. Used only by the admin runtime
   * inspection and admin attendance endpoints, where identity is read by
   * support agents and admins with `SESSIONS_READ_ADMIN` permission.
   *
   * Kept separate from `findById` so the rest of the codebase does not
   * silently expand its data surface to include user contact details.
   */
  findByIdWithParticipants(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).session.findUnique({
      where: { id: sessionId },
      select: this.participantIdentityInclude,
    });
  }

  findByDailyRoomReference(input: {
    roomName: string | null;
    roomUrl: string | null;
  }) {
    const normalizedRoomUrl = input.roomUrl
      ? this.normalizeRoomUrl(input.roomUrl)
      : null;
    const candidates = [input.roomName, normalizedRoomUrl].filter(
      (value): value is string => Boolean(value?.trim()),
    );

    if (!candidates.length) {
      return Promise.resolve(null);
    }

    return this.prisma.session.findFirst({
      where: {
        provider: SessionProvider.DAILY,
        OR: [
          ...(input.roomName
            ? [{ providerRoomId: input.roomName.trim() }]
            : []),
          ...(normalizedRoomUrl
            ? [
                { providerSessionRef: normalizedRoomUrl },
                {
                  providerSessionRef:
                    this.stripTrailingSlash(normalizedRoomUrl),
                },
                {
                  providerSessionRef: `${this.stripTrailingSlash(normalizedRoomUrl)}/`,
                },
              ]
            : []),
        ],
      },
      include: this.sessionInclude,
    });
  }

  listJoinNotificationCandidates(input: {
    now: Date;
    windowStart?: Date;
    take: number;
  }): Promise<SessionJoinNotificationCandidate[]> {
    return this.prisma.session.findMany({
      where: {
        sessionMode: SessionMode.VIDEO,
        status: {
          in: [SessionStatus.UPCOMING, SessionStatus.READY_TO_JOIN],
        },
        joinOpenAt: {
          not: null,
          lte: input.now,
        },
        scheduledStartAt: {
          not: null,
        },
        videoRoomClosedAt: null,
        OR: [
          { joinCloseAt: { gte: input.now } },
          {
            joinCloseAt: null,
            scheduledEndAt: {
              not: null,
              ...(input.windowStart ? { gte: input.windowStart } : {}),
            },
          },
        ],
      },
      orderBy: [
        { joinOpenAt: 'asc' },
        { scheduledStartAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: input.take,
      select: sessionJoinNotificationCandidateSelect,
    });
  }

  listReminderNotificationCandidates(input: {
    now: Date;
    take: number;
  }): Promise<SessionReminderNotificationCandidate[]> {
    return this.prisma.session.findMany({
      where: {
        status: {
          in: [
            SessionStatus.UPCOMING,
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
          ],
        },
        scheduledStartAt: {
          not: null,
          gt: input.now,
        },
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { createdAt: 'asc' }],
      take: input.take,
      select: sessionReminderNotificationCandidateSelect,
    });
  }

  listPatientSessions(input: {
    patientId: string;
    status?: SessionStatus;
    presentationFilter?: SessionPresentationFilter;
    now?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.SessionWhereInput = {
      patientId: input.patientId,
      status: input.status,
    };
    const andFilters: Prisma.SessionWhereInput[] = [];

    if (input.presentationFilter) {
      andFilters.push(
        buildSessionPresentationFilterWhere({
          presentationFilter: input.presentationFilter,
          now: input.now,
        }),
      );
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return Promise.all([
      this.prisma.session.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [{ scheduledStartAt: 'desc' }, { createdAt: 'desc' }],
        include: this.sessionInclude,
      }),
      this.prisma.session.count({ where }),
    ]);
  }

  async countUnreadBySessionIdsForUser(input: {
    userId: string;
    sessionIds: string[];
  }): Promise<Map<string, number>> {
    const uniqueSessionIds = Array.from(new Set(input.sessionIds)).filter(
      Boolean,
    );
    if (uniqueSessionIds.length === 0) {
      return new Map<string, number>();
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        sessionId: { in: uniqueSessionIds },
        conversationType: 'SYSTEM',
        participants: {
          some: {
            userId: input.userId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        sessionId: true,
      },
    });

    const conversationIds = conversations.map((c) => c.id).filter(Boolean);
    if (conversationIds.length === 0) {
      return new Map<string, number>();
    }

    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderUserId: {
          not: input.userId,
        },
        status: {
          in: ['SENT', 'DELIVERED'],
        },
        deletedAt: null,
        visibility: 'NORMAL',
      },
      _count: {
        _all: true,
      },
    });

    const conversationIdToUnreadCount = new Map<string, number>(
      unreadCounts.map((row) => [row.conversationId, row._count._all]),
    );

    const sessionIdToUnreadCount = new Map<string, number>();
    for (const conv of conversations) {
      if (conv.sessionId) {
        const count = conversationIdToUnreadCount.get(conv.id) ?? 0;
        sessionIdToUnreadCount.set(conv.sessionId, count);
      }
    }

    return sessionIdToUnreadCount;
  }

  listPatientSessionSummaryCandidates(patientId: string) {
    return this.prisma.session.findMany({
      where: {
        patientId,
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { createdAt: 'asc' }],
      select: sessionSummaryCandidateSelect,
    });
  }

  listPendingPaymentSessionsDueForExpiry(input: { now: Date; take: number }) {
    return this.prisma.session.findMany({
      where: {
        status: SessionStatus.PENDING_PAYMENT,
        expiresAt: {
          lte: input.now,
        },
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      take: input.take,
      select: {
        id: true,
        sessionCode: true,
        expiresAt: true,
      },
    });
  }

  async summarizePatientSessions(patientId: string) {
    const [totalItems, grouped] = await Promise.all([
      this.prisma.session.count({ where: { patientId } }),
      this.prisma.session.groupBy({
        by: ['status'],
        where: { patientId },
        _count: { _all: true },
      }),
    ]);

    const counts = grouped.reduce<Record<SessionStatus, number>>(
      (acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      },
      {} as Record<SessionStatus, number>,
    );

    const getCount = (...statuses: SessionStatus[]) =>
      statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

    return {
      totalItems,
      pendingPayment: counts[SessionStatus.PENDING_PAYMENT] ?? 0,
      pendingPractitionerResponse:
        counts[SessionStatus.PENDING_PRACTITIONER_CONFIRMATION] ?? 0,
      confirmed: counts[SessionStatus.UPCOMING] ?? 0,
      upcoming: counts[SessionStatus.UPCOMING] ?? 0,
      readyToJoin: counts[SessionStatus.READY_TO_JOIN] ?? 0,
      inProgress: counts[SessionStatus.IN_PROGRESS] ?? 0,
      completed: counts[SessionStatus.COMPLETED] ?? 0,
      cancelled: counts[SessionStatus.CANCELLED] ?? 0,
      noShow: getCount(
        SessionStatus.PATIENT_NO_SHOW,
        SessionStatus.PRACTITIONER_NO_SHOW,
        SessionStatus.BOTH_NO_SHOW,
      ),
      expired: counts[SessionStatus.EXPIRED] ?? 0,
      refundPending: 0,
      refunded: 0,
      actionRequired: getCount(
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
        SessionStatus.READY_TO_JOIN,
      ),
      active: getCount(
        SessionStatus.UPCOMING,
        SessionStatus.UPCOMING,
        SessionStatus.READY_TO_JOIN,
        SessionStatus.IN_PROGRESS,
      ),
      history: getCount(
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.PATIENT_NO_SHOW,
        SessionStatus.PRACTITIONER_NO_SHOW,
        SessionStatus.BOTH_NO_SHOW,
        SessionStatus.EXPIRED,
      ),
      paymentExpired: counts[SessionStatus.EXPIRED] ?? 0,
    };
  }

  listPractitionerSessions(input: {
    practitionerId: string;
    status?: SessionStatus;
    presentationFilter?: SessionPresentationFilter;
    query?: string;
    scheduledFrom?: Date;
    scheduledTo?: Date;
    now?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.SessionWhereInput = {
      practitionerId: input.practitionerId,
    };
    const andFilters: Prisma.SessionWhereInput[] = [];

    if (input.status) {
      andFilters.push({ status: input.status });
    }

    if (input.presentationFilter) {
      andFilters.push(
        buildSessionPresentationFilterWhere({
          presentationFilter: input.presentationFilter,
          now: input.now,
        }),
      );
    }

    if (input.query?.trim()) {
      andFilters.push({
        sessionCode: {
          ...sessionCodeSearchFilter(input.query),
        },
      });
    }

    const scheduledFilter: Prisma.DateTimeFilter = {};
    if (input.scheduledFrom) {
      scheduledFilter.gte = input.scheduledFrom;
    }
    if (input.scheduledTo) {
      scheduledFilter.lte = input.scheduledTo;
    }

    if (Object.keys(scheduledFilter).length > 0) {
      andFilters.push({ scheduledStartAt: scheduledFilter });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return Promise.all([
      this.prisma.session.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [{ scheduledStartAt: 'desc' }, { createdAt: 'desc' }],
        include: this.sessionInclude,
      }),
      this.prisma.session.count({ where }),
    ]);
  }

  listPractitionerSessionSummaryCandidates(practitionerId: string) {
    return this.prisma.session.findMany({
      where: {
        practitionerId,
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { createdAt: 'asc' }],
      select: sessionSummaryCandidateSelect,
    });
  }

  listAdminSessions(input: {
    status?: SessionStatus;
    sort?: AdminSessionsSortDto;
    query?: string;
    practitionerId?: string;
    patientId?: string;
    scheduledFrom?: Date;
    scheduledTo?: Date;
    late?: boolean;
    missingAttendance?: boolean;
    now?: Date;
    skip: number;
    take: number;
  }) {
    const lateNow = input.now ?? new Date();
    const where: Prisma.SessionWhereInput = {};
    const andFilters: Prisma.SessionWhereInput[] = [];

    if (input.status) {
      andFilters.push({ status: input.status });
    }

    if (input.query?.trim()) {
      andFilters.push({
        sessionCode: {
          ...sessionCodeSearchFilter(input.query),
        },
      });
    }

    if (input.practitionerId) {
      andFilters.push({ practitionerId: input.practitionerId });
    }

    if (input.patientId) {
      andFilters.push({ patientId: input.patientId });
    }

    const scheduledFilter: Prisma.DateTimeFilter = {};
    if (input.scheduledFrom) {
      scheduledFilter.gte = input.scheduledFrom;
    }
    if (input.scheduledTo) {
      scheduledFilter.lte = input.scheduledTo;
    }

    if (input.late === true) {
      scheduledFilter.lt = lateNow;
      andFilters.push({
        status: {
          in: this.lateCandidateStatuses,
        },
      });
    }

    if (Object.keys(scheduledFilter).length > 0) {
      andFilters.push({ scheduledStartAt: scheduledFilter });
    }

    if (input.missingAttendance === true) {
      andFilters.push({
        attendanceEvents: {
          none: {},
        },
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }
    const orderBy =
      input.sort === AdminSessionsSortDto.OLDEST
        ? [{ scheduledStartAt: 'asc' as const }, { createdAt: 'asc' as const }]
        : [
            { scheduledStartAt: 'desc' as const },
            { createdAt: 'desc' as const },
          ];

    return Promise.all([
      this.prisma.session.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy,
        include: this.sessionInclude,
      }),
      this.prisma.session.count({ where }),
    ]);
  }

  updateStatus(
    sessionId: string,
    data: Prisma.SessionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.update({
      where: { id: sessionId },
      data,
      include: this.sessionInclude,
    });
  }

  updateRuntimeIfMissing(
    sessionId: string,
    data: Omit<
      Prisma.SessionUncheckedUpdateInput,
      'status' | 'completedAt' | 'cancelledAt' | 'expiredAt'
    >,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.updateMany({
      where: {
        id: sessionId,
        providerRoomId: null,
        providerSessionRef: null,
      },
      data,
    });
  }

  listSessionsInRangeForPractitioner(
    practitionerId: string,
    startsBefore: Date,
    endsAfter: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.findMany({
      where: {
        ...this.buildBlockingSessionWhere({
          practitionerId,
          startsBefore,
          endsAfter,
          now: new Date(),
        }),
      },
      include: this.sessionInclude,
    });
  }

  listBlockingSessionsInRangeForPractitioners(input: {
    practitionerIds: string[];
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
    tx?: Prisma.TransactionClient;
  }) {
    if (input.practitionerIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(input.tx).session.findMany({
      where: {
        practitionerId: {
          in: input.practitionerIds,
        },
        scheduledStartAt: {
          lt: input.startsBefore,
        },
        scheduledEndAt: {
          gt: input.endsAfter,
        },
        OR: [
          {
            status: {
              in: this.blockingStatuses.filter(
                (status) => status !== SessionStatus.PENDING_PAYMENT,
              ),
            },
          },
          {
            status: SessionStatus.PENDING_PAYMENT,
            expiresAt: {
              gt: input.now,
            },
          },
        ],
      },
      select: {
        practitionerId: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });
  }

  listBlockingSessionRangesInRangeForPractitioner(
    practitionerId: string,
    startsBefore: Date,
    endsAfter: Date,
    now: Date = new Date(),
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.findMany({
      where: {
        ...this.buildBlockingSessionWhere({
          practitionerId,
          startsBefore,
          endsAfter,
          now,
        }),
      },
      select: {
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });
  }

  countCompletedSessionsByPractitioners(practitionerIds: string[]) {
    if (practitionerIds.length === 0) {
      return Promise.resolve(new Map<string, number>());
    }

    return this.prisma.session
      .groupBy({
        by: ['practitionerId'],
        where: {
          practitionerId: {
            in: practitionerIds,
          },
          status: SessionStatus.COMPLETED,
        },
        _count: {
          _all: true,
        },
      })
      .then(
        (rows) =>
          new Map<string, number>(
            rows.map((row) => [row.practitionerId, row._count._all]),
          ),
      );
  }

  listExpiredPendingPaymentSessionsInRangeForPractitioner(input: {
    practitionerId: string;
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).session.findMany({
      where: {
        practitionerId: input.practitionerId,
        scheduledStartAt: {
          lt: input.startsBefore,
        },
        scheduledEndAt: {
          gt: input.endsAfter,
        },
        status: SessionStatus.PENDING_PAYMENT,
        expiresAt: {
          lte: input.now,
        },
      },
      include: this.sessionInclude,
    });
  }

  listSessionsInRangeForPatient(
    patientId: string,
    startsBefore: Date,
    endsAfter: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.findMany({
      where: {
        ...this.buildBlockingSessionWhere({
          patientId,
          startsBefore,
          endsAfter,
          now: new Date(),
        }),
      },
      include: this.sessionInclude,
    });
  }

  listExpiredPendingPaymentSessionsInRangeForPatient(input: {
    patientId: string;
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).session.findMany({
      where: {
        patientId: input.patientId,
        scheduledStartAt: {
          lt: input.startsBefore,
        },
        scheduledEndAt: {
          gt: input.endsAfter,
        },
        status: SessionStatus.PENDING_PAYMENT,
        expiresAt: {
          lte: input.now,
        },
      },
      include: this.sessionInclude,
    });
  }

  createEvent(
    data: Prisma.SessionEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEvent.create({ data });
  }

  findSessionEventByProviderEventRef(
    input: {
      sessionId: string;
      eventType: SessionEventType;
      providerEventRef: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEvent.findFirst({
      where: {
        sessionId: input.sessionId,
        eventType: input.eventType,
        metadataJson:
          input.providerEventRef === null
            ? { equals: Prisma.JsonNull }
            : {
                path: ['providerEventRef'],
                equals: input.providerEventRef,
              },
      },
    });
  }

  findAttendanceEventByIngestionKey(
    ingestionKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceEvent.findUnique({
      where: { ingestionKey },
    });
  }

  findAttendanceEventByProviderEventRef(
    input: {
      provider: SessionProvider;
      providerEventRef: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceEvent.findFirst({
      where: {
        provider: input.provider,
        providerEventRef: input.providerEventRef,
      },
      orderBy: [{ ingestedAt: 'desc' }],
    });
  }

  createAttendanceEvent(
    data: Prisma.SessionAttendanceEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceEvent.create({ data });
  }

  listAttendanceEventsBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceEvent.findMany({
      where: { sessionId },
      orderBy: [{ occurredAt: 'asc' }, { ingestedAt: 'asc' }],
    });
  }

  /** Updates runtime metadata without exposing the lifecycle status writer. */
  updateRuntimeFields(
    sessionId: string,
    data: Omit<
      Prisma.SessionUncheckedUpdateInput,
      'status' | 'completedAt' | 'cancelledAt' | 'expiredAt'
    >,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.update({
      where: { id: sessionId },
      data,
      include: this.sessionInclude,
    });
  }

  async findByIdForUpdate(sessionId: string, tx: Prisma.TransactionClient) {
    await tx.$queryRaw`
      SELECT "id" FROM "Session" WHERE "id" = ${sessionId}::uuid FOR UPDATE
    `;
    return this.findById(sessionId, tx);
  }

  listSessionsDueForCompletionConfirmation(input: {
    now: Date;
    take: number;
    excludeIds?: string[];
    cursor?: { scheduledEndAt: Date; id: string };
  }) {
    return this.prisma.session.findMany({
      where: {
        status: {
          in: [
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
            SessionStatus.IN_PROGRESS,
          ],
        },
        scheduledEndAt: { not: null, lte: input.now },
        ...(input.cursor
          ? {
              OR: [
                { scheduledEndAt: { gt: input.cursor.scheduledEndAt } },
                {
                  scheduledEndAt: input.cursor.scheduledEndAt,
                  id: { gt: input.cursor.id },
                },
              ],
            }
          : {}),
        ...(input.excludeIds?.length
          ? { id: { notIn: input.excludeIds } }
          : {}),
      },
      orderBy: [{ scheduledEndAt: 'asc' }, { id: 'asc' }],
      take: input.take,
      select: { id: true, status: true, scheduledEndAt: true },
    });
  }

  listSessionsAwaitingReconciliation(input: { take: number }) {
    return this.prisma.session.findMany({
      where: {
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        scheduledStartAt: { not: null },
        scheduledEndAt: { not: null },
        provider: SessionProvider.DAILY,
      },
      orderBy: [{ scheduledEndAt: 'asc' }, { id: 'asc' }],
      take: input.take,
      select: { id: true },
    });
  }

  async tryLockDueSessionForCompletionConfirmation(
    input: { sessionId: string; now: Date },
    tx: Prisma.TransactionClient,
  ): Promise<{
    id: string;
    status: SessionStatus;
    scheduledEndAt: Date;
  } | null> {
    const eligibleStatuses = [
      SessionStatus.UPCOMING,
      SessionStatus.READY_TO_JOIN,
      SessionStatus.IN_PROGRESS,
    ];
    const rows = await tx.$queryRaw<
      Array<{ id: string; status: SessionStatus; scheduledEndAt: Date }>
    >(
      Prisma.sql`
        SELECT "id", "status", "scheduledEndAt"
        FROM "Session"
        WHERE "id" = ${input.sessionId}::uuid
          AND "scheduledEndAt" IS NOT NULL
          AND "scheduledEndAt" <= ${input.now}
          AND "status" IN (${Prisma.join(
            eligibleStatuses.map(
              (status) => Prisma.sql`${status}::"SessionStatus"`,
            ),
          )})
        FOR UPDATE SKIP LOCKED
      `,
    );
    return rows[0] ?? null;
  }

  async findPatientSessionActionFacts(sessionIds: string[]) {
    const uniqueSessionIds = Array.from(new Set(sessionIds)).filter(Boolean);
    if (uniqueSessionIds.length === 0) {
      return {
        capturedPaymentSessionIds: new Set<string>(),
        reviewedSessionIds: new Set<string>(),
      };
    }

    const [capturedPayments, packageCoveredSessions, reviews] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: {
            sessionId: { in: uniqueSessionIds },
            status: PaymentStatus.CAPTURED,
          },
          select: { sessionId: true },
          distinct: ['sessionId'],
        }),
        this.prisma.session.findMany({
          where: {
            id: { in: uniqueSessionIds },
            paymentCoverageType: 'PACKAGE',
            packagePurchaseId: { not: null },
          },
          select: { id: true },
        }),
        this.prisma.sessionReview.findMany({
          where: { sessionId: { in: uniqueSessionIds } },
          select: { sessionId: true },
        }),
      ]);

    return {
      capturedPaymentSessionIds: new Set(
        capturedPayments
          .map((payment) => payment.sessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId)),
      ),
      reviewEligibleSessionIds: new Set([
        ...capturedPayments
          .map((payment) => payment.sessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId)),
        ...packageCoveredSessions.map((session) => session.id),
      ]),
      reviewedSessionIds: new Set(reviews.map((review) => review.sessionId)),
    };
  }

  async hasJoinAllowanceOrAttendanceBefore(input: {
    sessionId: string;
    userId: string;
    occurredBeforeOrAt: Date;
  }): Promise<boolean> {
    const [joinAllowedEvent, attendanceJoinEvent] = await Promise.all([
      this.prisma.sessionEvent.findFirst({
        where: {
          sessionId: input.sessionId,
          actorUserId: input.userId,
          eventType: SessionEventType.JOIN_ALLOWED,
          createdAt: {
            lte: input.occurredBeforeOrAt,
          },
        },
        select: {
          id: true,
        },
      }),
      this.prisma.sessionAttendanceEvent.findFirst({
        where: {
          sessionId: input.sessionId,
          participantUserId: input.userId,
          attendanceEventType: 'JOINED',
          occurredAt: {
            lte: input.occurredBeforeOrAt,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    return Boolean(joinAllowedEvent || attendanceJoinEvent);
  }

  listSessionEventsBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 4A — SessionAdminDecision repository
  // ---------------------------------------------------------------------------

  createSessionAdminDecision(
    data: Prisma.SessionAdminDecisionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAdminDecision.create({ data });
  }

  listSessionAdminDecisionsBySessionId(sessionId: string) {
    return this.prisma.sessionAdminDecision.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  findLatestSessionAdminDecision(sessionId: string) {
    return this.prisma.sessionAdminDecision.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestActiveSessionAdminDecision(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAdminDecision.findFirst({
      where: { sessionId, isFinal: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Batch fetch latest final decisions for multiple sessions.
   * Returns a map of sessionId -> decisionType (or null if no final decision).
   */
  findLatestActiveSessionAdminDecisionsForSessions(
    sessionIds: string[],
  ): Promise<Map<string, SessionAdminDecisionType>> {
    if (sessionIds.length === 0) {
      return Promise.resolve(new Map<string, SessionAdminDecisionType>());
    }
    return this.loadLatestActiveSessionAdminDecisions(sessionIds);
  }

  private async loadLatestActiveSessionAdminDecisions(
    sessionIds: string[],
  ): Promise<Map<string, SessionAdminDecisionType>> {
    const existing = await this.prisma.sessionAdminDecision.findFirst({
      where: { isFinal: true, sessionId: { in: sessionIds } },
      select: { id: true },
    });
    if (!existing) return new Map<string, SessionAdminDecisionType>();

    const decisions = await this.prisma.sessionAdminDecision.findMany({
      where: {
        isFinal: true,
        sessionId: { in: sessionIds },
      },
      orderBy: { createdAt: 'desc' },
    });
    const map = new Map<string, SessionAdminDecisionType>();
    for (const decision of decisions) {
      if (!map.has(decision.sessionId)) {
        map.set(decision.sessionId, decision.decisionType);
      }
    }
    return map;
  }

  findSessionAdminDecisionById(decisionId: string) {
    return this.prisma.sessionAdminDecision.findUnique({
      where: { id: decisionId },
      include: {
        adminUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  createSessionPackageEntitlementDecision(
    data: Prisma.SessionPackageEntitlementDecisionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionPackageEntitlementDecision.create({
      data,
      include: this.packageEntitlementDecisionInclude,
    });
  }

  findSessionPackageEntitlementDecisionBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionPackageEntitlementDecision.findUnique({
      where: { sessionId },
      include: this.packageEntitlementDecisionInclude,
    });
  }

  private readonly blockingStatuses: SessionStatus[] = [
    SessionStatus.PENDING_PAYMENT,
    SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
    SessionStatus.UPCOMING,
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
    SessionStatus.IN_PROGRESS,
  ];

  private buildBlockingSessionWhere(input: {
    practitionerId?: string;
    patientId?: string;
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
  }): Prisma.SessionWhereInput {
    return {
      ...(input.practitionerId ? { practitionerId: input.practitionerId } : {}),
      ...(input.patientId ? { patientId: input.patientId } : {}),
      scheduledStartAt: {
        lt: input.startsBefore,
      },
      scheduledEndAt: {
        gt: input.endsAfter,
      },
      OR: [
        {
          status: {
            in: this.blockingStatuses.filter(
              (status) => status !== SessionStatus.PENDING_PAYMENT,
            ),
          },
        },
        {
          status: SessionStatus.PENDING_PAYMENT,
          expiresAt: {
            gt: input.now,
          },
        },
      ],
    };
  }

  findOutcomePolicySnapshot(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).sessionOutcomePolicySnapshot.findUnique({
      where: { sessionId },
    });
  }

  findLatestAttendanceReconciliation(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceReconciliation.findFirst({
      where: { sessionId },
      orderBy: [{ observationVersion: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findDueAutomaticCompletionSessions(input: { now: Date; batchSize: number }) {
    return this.prisma.session.findMany({
      where: {
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        scheduledEndAt: { not: null, lte: input.now },
      },
      orderBy: [{ scheduledEndAt: 'asc' }, { id: 'asc' }],
      take: input.batchSize,
      select: { id: true, status: true, scheduledEndAt: true },
    });
  }

  upsertAttendanceReconciliation(
    data: Prisma.SessionAttendanceReconciliationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    return db.sessionAttendanceReconciliation.upsert({
      where: {
        sessionId_provider_observationVersion: {
          sessionId: data.sessionId,
          provider: data.provider,
          observationVersion: data.observationVersion,
        },
      },
      create: data,
      update: {
        status: data.status,
        roomFound: data.roomFound,
        meetingStarted: data.meetingStarted,
        meetingEnded: data.meetingEnded,
        patientIdentityConfirmed: data.patientIdentityConfirmed,
        patientJoined: data.patientJoined,
        patientTotalPresenceSeconds: data.patientTotalPresenceSeconds,
        patientFirstJoinedAt: data.patientFirstJoinedAt,
        patientLastLeftAt: data.patientLastLeftAt,
        practitionerIdentityConfirmed: data.practitionerIdentityConfirmed,
        practitionerJoined: data.practitionerJoined,
        practitionerTotalPresenceSeconds: data.practitionerTotalPresenceSeconds,
        practitionerFirstJoinedAt: data.practitionerFirstJoinedAt,
        practitionerLastLeftAt: data.practitionerLastLeftAt,
        unknownParticipantCount: data.unknownParticipantCount,
        providerMeetingId: data.providerMeetingId,
        reconciledAt: data.reconciledAt,
        providerDataObservedUntil: data.providerDataObservedUntil,
        confidence: data.confidence,
        reasonCodesJson: data.reasonCodesJson,
        attemptNumber: data.attemptNumber,
        requestStatus: data.requestStatus,
        failureCategory: data.failureCategory,
        eligibleForAutomaticFinalization: data.eligibleForAutomaticFinalization,
      },
    });
  }

  markAttendanceReconciliationStale(
    sessionId: string,
    occurredAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionAttendanceReconciliation.updateMany({
      where: {
        sessionId,
        evaluationStale: false,
        reconciledAt: { lt: occurredAt },
      },
      data: {
        evaluationStale: true,
        staleReason: 'LATE_TRUSTED_ATTENDANCE_EVENT',
      },
    });
  }

  private readonly lateCandidateStatuses: SessionStatus[] = [
    SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
    SessionStatus.UPCOMING,
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
  ];

  private readonly sessionInclude = {
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    },
    patient: {
      select: {
        id: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    },
    packagePurchase: {
      select: {
        id: true,
        packagePlanId: true,
        packagePlan: {
          select: {
            id: true,
            code: true,
            title: true,
            discountPercent: true,
          },
        },
      },
    },
  } satisfies Prisma.SessionInclude;

  private readonly richDetailsInclude = {
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        professionalTitle: true,
        avatarUrl: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        specialties: {
          select: {
            isPrimary: true,
            specialty: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
      },
    },
    patient: {
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
          },
        },
        country: {
          select: {
            id: true,
            isoCode: true,
            name: true,
            nativeName: true,
          },
        },
      },
    },
    packagePurchase: {
      select: {
        id: true,
        packagePlanId: true,
        packagePlan: {
          select: {
            id: true,
            code: true,
            title: true,
            discountPercent: true,
          },
        },
      },
    },
    payments: {
      select: {
        id: true,
        paymentPurpose: true,
        status: true,
        amountTotal: true,
        currencyCode: true,
        provider: true,
        initiatedAt: true,
      },
    },
    conversations: {
      select: {
        id: true,
        status: true,
        conversationRef: true,
      },
    },
    events: {
      select: {
        id: true,
        eventType: true,
        actorType: true,
        reason: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
    corporateSponsorship: {
      select: {
        id: true,
        coverageType: true,
        originalAmount: true,
        coveredAmount: true,
        patientPayAmount: true,
        currency: true,
        benefitPlan: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    reviews: {
      select: {
        id: true,
        ratingValue: true,
        reviewTitle: true,
        reviewText: true,
        submittedAt: true,
      },
    },
  } satisfies Prisma.SessionInclude;

  /**
   * Phase 3 — narrower include that explicitly opts the admin evidence
   * endpoints into reading user contact details. Only callers that use
   * `findByIdWithParticipants` will incur the extra joins.
   */
  private readonly participantIdentityInclude = {
    id: true,
    sessionCode: true,
    status: true,
    flowType: true,
    sessionMode: true,
    paymentCoverageType: true,
    scheduledStartAt: true,
    scheduledEndAt: true,
    cancelledAt: true,
    durationMinutes: true,
    joinOpenAt: true,
    joinCloseAt: true,
    expiresAt: true,
    originalSessionId: true,
    provider: true,
    providerRoomId: true,
    providerSessionRef: true,
    videoRoomClosedAt: true,
    videoRoomClosedByUserId: true,
    videoRoomCloseReason: true,
    videoRoomCloseNote: true,
    packageSessionIndex: true,
    packageSessionCount: true,
    patientId: true,
    practitionerId: true,
    packagePurchaseId: true,
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            id: true,
            displayName: true,
            emails: {
              where: { isVerified: true },
              select: { email: true, isPrimary: true },
            },
            phones: {
              where: { isVerified: true },
              select: { phone: true, isPrimary: true },
            },
          },
        },
      },
    },
    patient: {
      select: {
        id: true,
        user: {
          select: {
            id: true,
            displayName: true,
            emails: {
              where: { isVerified: true },
              select: { email: true, isPrimary: true },
            },
            phones: {
              where: { isVerified: true },
              select: { phone: true, isPrimary: true },
            },
          },
        },
      },
    },
    packagePurchase: {
      select: {
        id: true,
        status: true,
        selectedCurrencyCode: true,
        sessionCountSnapshot: true,
        patientPayableTotalSnapshot: true,
        packagePlan: {
          select: {
            id: true,
            code: true,
            title: true,
            sessionCount: true,
            discountPercent: true,
          },
        },
      },
    },
    packageEntitlementDecision: {
      select: {
        id: true,
        sessionId: true,
        packagePurchaseId: true,
        sessionStatusSnapshot: true,
        decisionType: true,
        reasonCode: true,
        adminNote: true,
        resultingSessionEarningReviewId: true,
        decidedAt: true,
        idempotencyKey: true,
        decidedByUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
        resultingSessionEarningReview: {
          select: {
            id: true,
          },
        },
      },
    },
  } satisfies Prisma.SessionSelect;

  private readonly packageEntitlementDecisionInclude = {
    decidedByUser: {
      select: {
        id: true,
        displayName: true,
      },
    },
    resultingSessionEarningReview: {
      select: {
        id: true,
      },
    },
    packagePurchase: {
      select: {
        id: true,
        status: true,
        selectedCurrencyCode: true,
        sessionCountSnapshot: true,
        patientPayableTotalSnapshot: true,
        packagePlan: {
          select: {
            id: true,
            code: true,
            title: true,
            sessionCount: true,
            discountPercent: true,
          },
        },
      },
    },
  } satisfies Prisma.SessionPackageEntitlementDecisionInclude;

  private normalizeRoomUrl(roomUrl: string): string {
    const trimmed = roomUrl.trim();

    if (!trimmed) {
      return trimmed;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return this.stripTrailingSlash(trimmed);
    }

    return this.stripTrailingSlash(`https://${trimmed}`);
  }

  private stripTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}
