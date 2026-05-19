import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminSessionsSortDto } from '../dto/list-admin-sessions.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

const sessionJoinNotificationCandidateSelect = {
  id: true,
  status: true,
  sessionMode: true,
  joinOpenAt: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  provider: true,
  providerRoomId: true,
  providerSessionRef: true,
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

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createSession(
    data: Prisma.SessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).session.create({
      data,
      include: this.sessionInclude,
    });
  }

  findById(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
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
    windowStart: Date;
    take: number;
  }): Promise<SessionJoinNotificationCandidate[]> {
    return this.prisma.session.findMany({
      where: {
        sessionMode: SessionMode.VIDEO,
        status: {
          in: [
            SessionStatus.CONFIRMED,
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
          ],
        },
        joinOpenAt: {
          not: null,
          lte: input.now,
        },
        scheduledStartAt: {
          not: null,
        },
        scheduledEndAt: {
          not: null,
          gte: input.windowStart,
        },
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

  listPatientSessions(input: {
    patientId: string;
    status?: SessionStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.SessionWhereInput = {
      patientId: input.patientId,
      status: input.status,
    };

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
        counts[SessionStatus.PENDING_PRACTITIONER_RESPONSE] ?? 0,
      confirmed: counts[SessionStatus.CONFIRMED] ?? 0,
      upcoming: counts[SessionStatus.UPCOMING] ?? 0,
      readyToJoin: counts[SessionStatus.READY_TO_JOIN] ?? 0,
      inProgress: counts[SessionStatus.IN_PROGRESS] ?? 0,
      completed: counts[SessionStatus.COMPLETED] ?? 0,
      cancelled: counts[SessionStatus.CANCELLED] ?? 0,
      noShow: counts[SessionStatus.NO_SHOW] ?? 0,
      expired: counts[SessionStatus.EXPIRED] ?? 0,
      refundPending: counts[SessionStatus.REFUND_PENDING] ?? 0,
      refunded: counts[SessionStatus.REFUNDED] ?? 0,
      actionRequired: getCount(
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.PENDING_PRACTITIONER_RESPONSE,
        SessionStatus.READY_TO_JOIN,
      ),
      active: getCount(
        SessionStatus.CONFIRMED,
        SessionStatus.UPCOMING,
        SessionStatus.READY_TO_JOIN,
        SessionStatus.IN_PROGRESS,
      ),
      history: getCount(
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
        SessionStatus.EXPIRED,
        SessionStatus.REFUND_PENDING,
        SessionStatus.REFUNDED,
      ),
      paymentExpired: counts[SessionStatus.EXPIRED] ?? 0,
    };
  }

  listPractitionerSessions(input: {
    practitionerId: string;
    status?: SessionStatus;
    query?: string;
    scheduledFrom?: Date;
    scheduledTo?: Date;
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

    if (input.query?.trim()) {
      andFilters.push({
        sessionCode: {
          contains: input.query.trim(),
          mode: 'insensitive',
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
          contains: input.query.trim(),
          mode: 'insensitive',
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
    data: Prisma.SessionUncheckedUpdateInput,
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

  expirePendingPaymentSessionsInRangeForPractitioner(input: {
    practitionerId: string;
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).session.updateMany({
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
      data: {
        status: SessionStatus.EXPIRED,
        expiredAt: input.now,
      },
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

  expirePendingPaymentSessionsInRangeForPatient(input: {
    patientId: string;
    startsBefore: Date;
    endsAfter: Date;
    now: Date;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).session.updateMany({
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
      data: {
        status: SessionStatus.EXPIRED,
        expiredAt: input.now,
      },
    });
  }

  createEvent(
    data: Prisma.SessionEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionEvent.create({ data });
  }

  findAttendanceEventByIngestionKey(ingestionKey: string) {
    return this.prisma.sessionAttendanceEvent.findUnique({
      where: { ingestionKey },
    });
  }

  findAttendanceEventByProviderEventRef(input: {
    provider: SessionProvider;
    providerEventRef: string;
  }) {
    return this.prisma.sessionAttendanceEvent.findFirst({
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

  async reserveNextSessionCode(
    referenceDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const db = this.getDb(tx);
    const year = referenceDate.getUTCFullYear();
    const prefix = `SES-${year}-`;

    await db.$executeRaw`SELECT pg_advisory_xact_lock(${year}::bigint)`;

    const latest = await db.session.findFirst({
      where: {
        sessionCode: {
          startsWith: prefix,
        },
      },
      orderBy: [{ sessionCode: 'desc' }],
      select: {
        sessionCode: true,
      },
    });

    const lastSequence = latest
      ? Number.parseInt(latest.sessionCode.slice(prefix.length), 10)
      : 0;
    const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `${prefix}${nextSequence.toString().padStart(6, '0')}`;
  }

  listAttendanceEventsBySessionId(sessionId: string) {
    return this.prisma.sessionAttendanceEvent.findMany({
      where: { sessionId },
      orderBy: [{ occurredAt: 'asc' }, { ingestedAt: 'asc' }],
    });
  }

  private readonly blockingStatuses: SessionStatus[] = [
    SessionStatus.PENDING_PAYMENT,
    SessionStatus.PENDING_PRACTITIONER_RESPONSE,
    SessionStatus.CONFIRMED,
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

  private readonly lateCandidateStatuses: SessionStatus[] = [
    SessionStatus.PENDING_PRACTITIONER_RESPONSE,
    SessionStatus.CONFIRMED,
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
