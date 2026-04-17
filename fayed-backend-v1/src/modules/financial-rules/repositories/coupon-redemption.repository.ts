import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CouponRedemptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByCouponAndSession(couponId: string, sessionId: string) {
    return this.prisma.couponRedemption.findFirst({
      where: {
        couponId,
        sessionId,
      },
    });
  }

  createRedemption(
    data: Prisma.CouponRedemptionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).couponRedemption.create({ data });
  }
}
