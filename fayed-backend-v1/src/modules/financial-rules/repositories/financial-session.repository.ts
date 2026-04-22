import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Financial session reads deliberately fetch only the fields needed for pricing,
 * commission resolution, coupon validation, and ownership checks.
 */
@Injectable()
export class FinancialSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
    patient: {
      select: {
        id: true,
        countryId: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    },
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        sessionPrice30: true,
        sessionPrice60: true,
        countryId: true,
        country: {
          select: {
            currencyCode: true,
          },
        },
        specialties: {
          select: {
            specialtyId: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: 'desc' }],
        },
      },
    },
    payments: {
      select: {
        amountSubtotal: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 1,
    },
  });

  findPatientOwnedSession(sessionId: string, userId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        patient: {
          userId,
        },
      },
      include: this.sessionInclude,
    });
  }

  findById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: this.sessionInclude,
    });
  }
}
