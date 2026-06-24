import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PaymentSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientOwnedSession(sessionId: string, userId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        patient: {
          userId,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            countryId: true,
            country: {
              select: {
                isoCode: true,
              },
            },
            user: {
              select: {
                id: true,
                displayName: true,
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
            sessionPrice30Egp: true,
            sessionPrice30Usd: true,
            sessionPrice60Egp: true,
            sessionPrice60Usd: true,
            instantBookingPrice30Egp: true,
            instantBookingPrice30Usd: true,
            instantBookingPrice60Egp: true,
            instantBookingPrice60Usd: true,
            countryId: true,
            country: {
              select: {
                isoCode: true,
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
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
        payments: {
          select: {
            amountSubtotal: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 1,
        },
        instantBookingRequest: {
          select: {
            metadataJson: true,
          },
        },
      },
    });
  }
}
