import { Injectable } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const impactStatuses: SessionStatus[] = [
  SessionStatus.PENDING_PAYMENT,
  SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
  SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
];

@Injectable()
export class AdminPractitionerPublicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPractitioner(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.practitionerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        publicSlug: true,
        professionalTitle: true,
        bio: true,
        status: true,
        isPublicProfilePublished: true,
        avatarUrl: true,
        user: { select: { id: true, status: true, displayName: true } },
        specialties: {
          where: { specialty: { isActive: true } },
          select: { id: true },
        },
      },
    });
  }

  async getImpact(
    practitionerId: string,
    now = new Date(),
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const sessions = await db.session.findMany({
      where: {
        practitionerId,
        status: { in: impactStatuses },
        OR: [{ scheduledEndAt: null }, { scheduledEndAt: { gte: now } }],
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { createdAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        status: true,
        sessionMode: true,
      },
    });
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const [activeUpcomingCount, scheduledTodayCount] = await Promise.all([
      db.session.count({
        where: {
          practitionerId,
          status: { in: impactStatuses },
          OR: [{ scheduledEndAt: null }, { scheduledEndAt: { gte: now } }],
        },
      }),
      db.session.count({
        where: {
          practitionerId,
          status: { in: impactStatuses },
          scheduledStartAt: { gte: todayStart, lt: todayEnd },
        },
      }),
    ]);
    return {
      activeUpcomingCount,
      scheduledTodayCount,
      nearestUpcomingAt:
        sessions
          .find((item) => item.scheduledStartAt)
          ?.scheduledStartAt?.toISOString() ?? null,
      upcomingBookings: sessions.map((item) => ({
        ...item,
        scheduledStartAt: item.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: item.scheduledEndAt?.toISOString() ?? null,
      })),
    };
  }

  updatePublication(
    id: string,
    isPublished: boolean,
    tx: Prisma.TransactionClient,
  ) {
    return tx.practitionerProfile.update({
      where: { id },
      data: { isPublicProfilePublished: isPublished },
      select: { id: true, isPublicProfilePublished: true },
    });
  }
}
