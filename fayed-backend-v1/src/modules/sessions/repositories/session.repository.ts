import { Injectable } from '@nestjs/common';
import { Prisma, SessionProvider, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminSessionsSortDto } from '../dto/list-admin-sessions.dto';

type DbClient = PrismaService | Prisma.TransactionClient;

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

  findById(sessionId: string) {
    return this.prisma.session.findUnique({
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

  listPractitionerSessions(input: {
    practitionerId: string;
    status?: SessionStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.SessionWhereInput = {
      practitionerId: input.practitionerId,
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

  listSessionsInRangeForPractitioner(
    practitionerId: string,
    startsBefore: Date,
    endsAfter: Date,
  ) {
    return this.prisma.session.findMany({
      where: {
        practitionerId,
        scheduledStartAt: {
          lt: startsBefore,
        },
        scheduledEndAt: {
          gt: endsAfter,
        },
        status: {
          in: this.blockingStatuses,
        },
      },
      include: this.sessionInclude,
    });
  }

  listSessionsInRangeForPatient(
    patientId: string,
    startsBefore: Date,
    endsAfter: Date,
  ) {
    return this.prisma.session.findMany({
      where: {
        patientId,
        scheduledStartAt: {
          lt: startsBefore,
        },
        scheduledEndAt: {
          gt: endsAfter,
        },
        status: {
          in: this.blockingStatuses,
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
