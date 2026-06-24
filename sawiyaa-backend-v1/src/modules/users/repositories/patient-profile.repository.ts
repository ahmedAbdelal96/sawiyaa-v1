import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Patient profile lookups stay read-only here.
 * Users Module only needs to know whether a linked profile exists and what its id is.
 */
@Injectable()
export class PatientProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLinkedProfile(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: {
        id: true,
      },
    });
  }
}
