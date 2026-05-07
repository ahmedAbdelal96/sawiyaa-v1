import { Injectable } from '@nestjs/common';
import { AcademyEnrollmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class OrchestrateAcademyEnrollmentPaymentStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async markEnrollmentActiveFromPayment(paymentId: string): Promise<void> {
    await this.prisma.academyEnrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: {
          in: [
            AcademyEnrollmentStatus.PENDING_PAYMENT,
            AcademyEnrollmentStatus.PAYMENT_FAILED,
          ],
        },
      },
      data: {
        enrollmentStatus: AcademyEnrollmentStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        confirmedAt: new Date(),
      },
    });
  }

  async markEnrollmentPaymentFailed(paymentId: string): Promise<void> {
    await this.prisma.academyEnrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: {
          in: [
            AcademyEnrollmentStatus.PENDING_PAYMENT,
            AcademyEnrollmentStatus.PAID,
          ],
        },
      },
      data: {
        enrollmentStatus: AcademyEnrollmentStatus.PAYMENT_FAILED,
        paymentStatus: PaymentStatus.FAILED,
        failedAt: new Date(),
      },
    });
  }

  async markEnrollmentPaymentExpired(paymentId: string): Promise<void> {
    await this.prisma.academyEnrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: {
          in: [
            AcademyEnrollmentStatus.PENDING_PAYMENT,
            AcademyEnrollmentStatus.PAID,
          ],
        },
      },
      data: {
        enrollmentStatus: AcademyEnrollmentStatus.PAYMENT_FAILED,
        paymentStatus: PaymentStatus.EXPIRED,
        failedAt: new Date(),
      },
    });
  }
}
