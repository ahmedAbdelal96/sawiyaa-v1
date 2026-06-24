import { ConflictException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ValidateAvailabilitySessionConflictsService } from './validate-availability-session-conflicts.service';

describe('ValidateAvailabilitySessionConflictsService', () => {
  const prisma = {
    session: {
      findMany: jest.fn(),
    },
  };

  const service = new ValidateAvailabilitySessionConflictsService(
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows availability changes when no blocking session exists', async () => {
    prisma.session.findMany.mockResolvedValue([]);

    await expect(
      service.assertNoBlockingSessionConflict({
        practitionerId: 'practitioner-1',
        startsAtUtc: new Date('2026-05-18T10:00:00Z'),
        endsAtUtc: new Date('2026-05-18T11:00:00Z'),
      }),
    ).resolves.toBeUndefined();

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          practitionerId: 'practitioner-1',
          status: {
            in: expect.arrayContaining([
              SessionStatus.CONFIRMED,
              SessionStatus.UPCOMING,
              SessionStatus.READY_TO_JOIN,
            ]),
          },
        }),
      }),
    );
  });

  it('blocks availability changes that overlap a booked session', async () => {
    prisma.session.findMany.mockResolvedValue([{ id: 'session-1' }]);

    await expect(
      service.assertNoBlockingSessionConflict({
        practitionerId: 'practitioner-1',
        startsAtUtc: new Date('2026-05-18T10:00:00Z'),
        endsAtUtc: new Date('2026-05-18T11:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
