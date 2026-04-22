import { Injectable } from '@nestjs/common';
import { CustomerWalletReservationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomerWalletReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByPaymentId(paymentId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).customerWalletReservation.findUnique({
      where: { paymentId },
    });
  }

  createReservation(
    data: Prisma.CustomerWalletReservationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWalletReservation.create({
      data,
    });
  }

  markCaptured(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).customerWalletReservation.update({
      where: { id },
      data: {
        status: CustomerWalletReservationStatus.CAPTURED,
        capturedAt: new Date(),
      },
    });
  }

  markReleased(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).customerWalletReservation.update({
      where: { id },
      data: {
        status: CustomerWalletReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });
  }
}
