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
      },
    });
  }
}
