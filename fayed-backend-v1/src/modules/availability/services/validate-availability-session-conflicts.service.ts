import { ConflictException, Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Availability exceptions must not be created or shifted across booked sessions.
 * This keeps practitioner edits honest and avoids silently hiding existing appointments.
 */
@Injectable()
export class ValidateAvailabilitySessionConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNoBlockingSessionConflict(input: {
    practitionerId: string;
    startsAtUtc: Date;
    endsAtUtc: Date;
  }): Promise<void> {
    const conflicts = await this.prisma.session.findMany({
      where: {
        practitionerId: input.practitionerId,
        scheduledStartAt: {
          lt: input.endsAtUtc,
        },
        scheduledEndAt: {
          gt: input.startsAtUtc,
        },
        status: {
          in: this.blockingStatuses,
        },
      },
      select: {
        id: true,
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException({
        messageKey: 'sessions.errors.practitionerTimeConflict',
        error: 'SESSION_PRACTITIONER_TIME_CONFLICT',
      });
    }
  }

  private readonly blockingStatuses: SessionStatus[] = [
    SessionStatus.PENDING_PAYMENT,
    SessionStatus.PENDING_PRACTITIONER_RESPONSE,
    SessionStatus.CONFIRMED,
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
    SessionStatus.IN_PROGRESS,
  ];
}
