import { Injectable } from '@nestjs/common';
import { CouponStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findPractitionerByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });
  }

  createCoupon(data: Prisma.CouponUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).coupon.create({ data });
  }

  findByCode(code: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).coupon.findUnique({
      where: { code },
    });
  }

  findBySlug(slug: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).coupon.findUnique({
      where: { slug },
    });
  }

  findById(couponId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).coupon.findUnique({
      where: { id: couponId },
    });
  }

  findOwnedById(
    couponId: string,
    ownerPractitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).coupon.findFirst({
      where: {
        id: couponId,
        ownerPractitionerId,
      },
    });
  }

  listOwnedCoupons(input: {
    practitionerId: string;
    page: number;
    limit: number;
    q?: string | null;
    status?: CouponStatus | null;
  }) {
    const normalizedQuery = input.q?.trim() ? input.q.trim() : null;
    const where: Prisma.CouponWhereInput = {
      ownerPractitionerId: input.practitionerId,
      status: input.status ?? undefined,
      ...(normalizedQuery
        ? {
            OR: [
              {
                code: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: normalizedQuery.toLowerCase(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: input.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);
  }

  countPatientRedemptions(
    couponId: string,
    patientId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).couponRedemption.count({
      where: {
        couponId,
        patientId,
      },
    });
  }

  countRedemptionsByCoupon(couponId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).couponRedemption.count({
      where: {
        couponId,
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

  updateById(
    couponId: string,
    data: Prisma.CouponUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).coupon.update({
      where: { id: couponId },
      data,
    });
  }

  updateOwnedCoupon(
    couponId: string,
    ownerPractitionerId: string,
    data: Prisma.CouponUpdateManyMutationInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).coupon.updateMany({
      where: {
        id: couponId,
        ownerPractitionerId,
      },
      data,
    });
  }

  findOwnedRedemptions(input: {
    couponId: string;
    ownerPractitionerId: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.CouponRedemptionWhereInput = {
      couponId: input.couponId,
      coupon: {
        is: {
          ownerPractitionerId: input.ownerPractitionerId,
        },
      },
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.couponRedemption.findMany({
        where,
        orderBy: [{ redeemedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: input.limit,
        select: {
          id: true,
          couponId: true,
          sessionId: true,
          paymentId: true,
          patientId: true,
          practitionerId: true,
          currencyCode: true,
          grossAmount: true,
          discountAmount: true,
          platformDiscountShare: true,
          practitionerDiscountShare: true,
          redeemedAt: true,
          createdAt: true,
          patient: {
            select: {
              id: true,
              displayName: true,
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.couponRedemption.count({ where }),
    ]);
  }

  async lockCouponForUpdate(
    couponId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = CAST(${couponId} AS uuid) FOR UPDATE`;
  }
}
