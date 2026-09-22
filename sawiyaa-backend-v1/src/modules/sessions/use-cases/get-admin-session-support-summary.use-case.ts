import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class GetAdminSessionSupportSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionCode: true,
        status: true,
        durationMinutes: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        sessionMode: true,
        patientId: true,
        practitioner: { select: { publicSlug: true, user: { select: { displayName: true } } } },
        payments: { orderBy: [{ createdAt: 'desc' }], take: 1, select: { status: true } },
        cancellationRecord: { select: { createdAt: true } },
      },
    });
    if (!session) throw new NotFoundException({ error: 'SESSION_NOT_FOUND' });
    return {
      item: {
        id: session.id,
        sessionCode: session.sessionCode,
        status: session.status,
        durationMinutes: session.durationMinutes,
        scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
        sessionMode: session.sessionMode,
        patientId: session.patientId,
        practitionerName: session.practitioner.user?.displayName ?? session.practitioner.publicSlug,
        paymentStatus: session.payments[0]?.status ?? null,
        cancellationState: session.cancellationRecord ? 'CANCELLED' : 'NOT_CANCELLED',
      },
    };
  }
}
