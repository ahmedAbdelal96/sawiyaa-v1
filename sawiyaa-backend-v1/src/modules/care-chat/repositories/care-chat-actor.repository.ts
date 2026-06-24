import { Injectable } from '@nestjs/common';
import { PractitionerStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class CareChatActorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });
  }

  findPractitionerProfileByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });
  }

  findEligiblePractitionerBySlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
        status: PractitionerStatus.APPROVED,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        userId: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });
  }
}
