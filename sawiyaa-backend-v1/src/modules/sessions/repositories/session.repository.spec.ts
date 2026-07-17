import { SessionMode, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from './session.repository';
import { SessionPresentationFilter } from '../types/session-video.types';

describe('SessionRepository', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const prisma = {
    session: {
      findMany,
      count,
    },
  } as unknown as PrismaService;

  const repository = new SessionRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists bounded join-available notification candidates', async () => {
    findMany.mockResolvedValue([]);

    await repository.listJoinNotificationCandidates({
      now: new Date('2026-05-01T10:00:00.000Z'),
      windowStart: new Date('2026-05-01T08:00:00.000Z'),
      take: 50,
    });

    type JoinNotificationQuery = {
      where: {
        sessionMode: SessionMode;
        status: {
          in: SessionStatus[];
        };
        joinOpenAt: {
          not: null;
          lte: Date;
        };
        scheduledStartAt: {
          not: null;
        };
        scheduledEndAt: {
          not: null;
          gte: Date;
        };
      };
      take: number;
    };
    const callArg = (findMany.mock.calls as JoinNotificationQuery[][])[0][0];

    expect(callArg.where.sessionMode).toBe(SessionMode.VIDEO);
    expect(callArg.where.status.in).toEqual([
      SessionStatus.UPCOMING,
      SessionStatus.READY_TO_JOIN,
    ]);
    expect(callArg.where.joinOpenAt).toEqual({
      not: null,
      lte: new Date('2026-05-01T10:00:00.000Z'),
    });
    expect(callArg.where.scheduledStartAt).toEqual({
      not: null,
    });
    expect(callArg.where.scheduledEndAt).toEqual({
      not: null,
      gte: new Date('2026-05-01T08:00:00.000Z'),
    });
    expect(callArg.take).toBe(50);
  });

  it('filters pending payment reservations by expiry when listing blocking ranges', async () => {
    findMany.mockResolvedValue([]);

    await repository.listBlockingSessionRangesInRangeForPractitioner(
      'practitioner-1',
      new Date('2026-05-19T10:00:00.000Z'),
      new Date('2026-05-19T09:00:00.000Z'),
      new Date('2026-05-19T08:30:00.000Z'),
    );

    const callArg = findMany.mock.calls[0][0] as {
      where: {
        practitionerId: string;
        scheduledStartAt: { lt: Date };
        scheduledEndAt: { gt: Date };
        OR: Array<
          | {
              status: {
                in: SessionStatus[];
              };
            }
          | {
              status: SessionStatus;
              expiresAt: { gt: Date };
            }
        >;
      };
    };

    expect(callArg.where.practitionerId).toBe('practitioner-1');
    expect(callArg.where.scheduledStartAt.lt).toEqual(
      new Date('2026-05-19T10:00:00.000Z'),
    );
    expect(callArg.where.scheduledEndAt.gt).toEqual(
      new Date('2026-05-19T09:00:00.000Z'),
    );
    expect(callArg.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: SessionStatus.PENDING_PAYMENT,
          expiresAt: {
            gt: new Date('2026-05-19T08:30:00.000Z'),
          },
        }),
        expect.objectContaining({
          status: {
            in: expect.arrayContaining([
              SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
              SessionStatus.UPCOMING,
              SessionStatus.READY_TO_JOIN,
              SessionStatus.IN_PROGRESS,
            ]),
          },
        }),
      ]),
    );
  });

  it('lists practitioner sessions using presentation filters on the server side', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await repository.listPractitionerSessions({
      practitionerId: 'practitioner-1',
      presentationFilter: SessionPresentationFilter.JOINABLE,
      query: 'SES-2026',
      scheduledFrom: new Date('2026-05-01T08:00:00.000Z'),
      scheduledTo: new Date('2026-05-01T10:00:00.000Z'),
      now: new Date('2026-05-01T09:58:30.000Z'),
      skip: 20,
      take: 10,
    });

    const findCall = (findMany.mock.calls as Array<[unknown]>)[0][0] as {
      where: {
        practitionerId: string;
        AND: Array<Record<string, unknown>>;
      };
      skip: number;
      take: number;
    };
    const countCall = (count.mock.calls as Array<[unknown]>)[0][0] as {
      where: {
        practitionerId: string;
        AND: Array<Record<string, unknown>>;
      };
    };

    expect(findCall.where.practitionerId).toBe('practitioner-1');
    expect(countCall.where).toEqual(findCall.where);
    expect(findCall.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: {
            in: [
              SessionStatus.UPCOMING,
              SessionStatus.READY_TO_JOIN,
            ],
          },
        }),
        expect.objectContaining({
          sessionCode: {
            contains: 'SES-2026',
            mode: 'insensitive',
          },
        }),
        expect.objectContaining({
          scheduledStartAt: {
            gte: new Date('2026-05-01T08:00:00.000Z'),
            lte: new Date('2026-05-01T10:00:00.000Z'),
          },
        }),
        expect.objectContaining({
          sessionMode: SessionMode.VIDEO,
        }),
      ]),
    );
    expect(findCall.skip).toBe(20);
    expect(findCall.take).toBe(10);
  });

  it('keeps the live presentation filter inside the actual session window', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await repository.listPractitionerSessions({
      practitionerId: 'practitioner-1',
      presentationFilter: SessionPresentationFilter.LIVE,
      now: new Date('2026-05-01T09:58:30.000Z'),
      skip: 0,
      take: 20,
    });

    const findCall = (findMany.mock.calls as Array<[unknown]>)[0][0] as {
      where: {
        practitionerId: string;
        AND: Array<Record<string, unknown>>;
      };
    };

    expect(findCall.where.practitionerId).toBe('practitioner-1');
    expect(findCall.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionMode: SessionMode.VIDEO,
          status: SessionStatus.IN_PROGRESS,
          scheduledStartAt: {
            not: null,
            lte: new Date('2026-05-01T09:58:30.000Z'),
          },
          scheduledEndAt: {
            not: null,
            gte: new Date('2026-05-01T09:58:30.000Z'),
          },
        }),
      ]),
    );
  });

  it('lists only accepted elapsed statuses with a deterministic cursor', async () => {
    findMany.mockResolvedValue([]);
    const scheduledEndAt = new Date('2026-05-01T10:00:00.000Z');

    await repository.listSessionsDueForCompletionConfirmation({
      now: new Date('2026-05-01T10:30:00.000Z'),
      take: 25,
      cursor: { scheduledEndAt, id: 'session-9' },
    });

    const callArg = findMany.mock.calls[0][0] as {
      where: {
        status: { in: SessionStatus[] };
        OR: Array<Record<string, unknown>>;
      };
      take: number;
    };
    expect(callArg.where.status.in).toEqual([
      SessionStatus.UPCOMING,
      SessionStatus.READY_TO_JOIN,
    ]);
    expect(callArg.where.OR).toEqual([
      { scheduledEndAt: { gt: scheduledEndAt } },
      { scheduledEndAt, id: { gt: 'session-9' } },
    ]);
    expect(callArg.take).toBe(25);
  });
});
