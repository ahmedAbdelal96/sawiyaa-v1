import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PatientJourneyPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });
  }
}
