import { Injectable } from '@nestjs/common';
import { AcademyProgramEnrollmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class OrchestrateAcademyProgramEnrollmentPaymentStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async markEnrollmentConfirmedFromPayment(paymentId: string) {
    await this.prisma.academyProgramEnrollment.updateMany({
      where: {
        paymentId,
        status: {
          in: [
            AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
          ],
        },
      },
      data: {
        status: AcademyProgramEnrollmentStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CAPTURED,
        lockedAt: new Date(),
        confirmedAt: new Date(),
        cancelledAt: null,
        expiredAt: null,
        seatReservationExpiresAt: null,
      },
    });
  }

  async markEnrollmentPaymentFailed(paymentId: string) {
    await this.prisma.academyProgramEnrollment.updateMany({
      where: {
        paymentId,
        status: {
          in: [
            AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
          ],
        },
      },
      data: {
        status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.FAILED,
        lockedAt: null,
        confirmedAt: null,
        expiredAt: null,
        seatReservationExpiresAt: new Date(),
      },
    });
  }

  async markEnrollmentPaymentExpired(paymentId: string) {
    await this.prisma.academyProgramEnrollment.updateMany({
      where: {
        paymentId,
        status: {
          in: [
            AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
          ],
        },
      },
      data: {
        status: AcademyProgramEnrollmentStatus.EXPIRED,
        paymentStatus: PaymentStatus.EXPIRED,
        lockedAt: null,
        confirmedAt: null,
        expiredAt: new Date(),
        seatReservationExpiresAt: null,
      },
    });
  }
}
