import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createCoupon(data: Prisma.CouponUncheckedCreateInput) {
    return this.prisma.coupon.create({ data });
  }

  findByCode(code: string) {
    return this.prisma.coupon.findUnique({
      where: { code },
    });
  }

  countPatientRedemptions(couponId: string, patientId: string) {
    return this.prisma.couponRedemption.count({
      where: {
        couponId,
        patientId,
      },
    });
  }

  incrementUsageCount(couponId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).coupon.update({
      where: { id: couponId },
      data: {
        currentUsageCount: {
          increment: 1,
        },
      },
    });
  }
}
