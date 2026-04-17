import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PaymentPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
            emails: {
              where: {
                isPrimary: true,
              },
              select: {
                email: true,
              },
              take: 1,
            },
          },
        },
      },
    });
  }
}
