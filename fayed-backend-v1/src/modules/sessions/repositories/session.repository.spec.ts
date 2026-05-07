import { SessionMode, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from './session.repository';

describe('SessionRepository', () => {
  const findMany = jest.fn();
  const prisma = {
    session: {
      findMany,
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
      SessionStatus.CONFIRMED,
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
});
