import { ConflictException, Injectable } from '@nestjs/common';
import { AvailabilityWeekStatus, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const TERMINAL_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
];

export class PractitionerTimezoneChangeBlockedError extends ConflictException {
  constructor(details: {
    hasPublishedAvailability: boolean;
    hasFutureSessions: boolean;
  }) {
    super({
      messageKey: 'practitioners.errors.timezoneChangeBlocked',
      error: 'PRACTITIONER_TIMEZONE_CHANGE_BLOCKED',
      details,
    });
  }
}

/** Prevents changing a practitioner's timezone while existing scheduling data depends on it. */
@Injectable()
export class PractitionerTimezoneChangeGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanChange(input: {
    userId: string;
    requestedTimezone: string | null | undefined;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    if (input.requestedTimezone === undefined) return;

    const db = input.tx ?? this.prisma;
    const current = await db.user.findUnique({
      where: { id: input.userId },
      select: {
        timezone: true,
        practitionerProfile: { select: { id: true } },
      },
    });

    if (
      !current?.practitionerProfile ||
      current.timezone === input.requestedTimezone
    ) {
      return;
    }

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const [publishedAvailability, futureSession] = await Promise.all([
      db.practitionerAvailabilityWeek.findFirst({
        where: {
          practitionerId: current.practitionerProfile.id,
          status: AvailabilityWeekStatus.PUBLISHED,
          weekEndDate: { gte: todayUtc },
        },
        select: { id: true },
      }),
      db.session.findFirst({
        where: {
          practitionerId: current.practitionerProfile.id,
          scheduledStartAt: { gt: new Date() },
          status: { notIn: TERMINAL_SESSION_STATUSES },
        },
        select: { id: true },
      }),
    ]);

    if (!publishedAvailability && !futureSession) return;

    throw new PractitionerTimezoneChangeBlockedError({
      hasPublishedAvailability: Boolean(publishedAvailability),
      hasFutureSessions: Boolean(futureSession),
    });
  }
}
