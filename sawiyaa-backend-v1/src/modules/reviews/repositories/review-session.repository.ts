import { Injectable } from '@nestjs/common';
import { PaymentStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class ReviewSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedSessionForReview(sessionId: string, patientId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        patientId,
      },
      select: {
        id: true,
        status: true,
        patientId: true,
        practitionerId: true,
      },
    });
  }

  hasCapturedPaymentForSession(sessionId: string, patientId: string) {
    return this.prisma.payment.count({
      where: {
        sessionId,
        patientId,
        status: PaymentStatus.CAPTURED,
      },
      take: 1,
    });
  }

  isSessionCompleted(status: SessionStatus) {
    return status === SessionStatus.COMPLETED;
  }
}
