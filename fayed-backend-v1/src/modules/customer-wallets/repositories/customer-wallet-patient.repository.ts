import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class CustomerWalletPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: {
        id: true,
      },
    });
  }

  findById(patientId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        id: true,
      },
    });
  }
}
