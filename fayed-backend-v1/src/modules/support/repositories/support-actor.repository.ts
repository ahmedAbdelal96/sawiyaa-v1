import { Injectable } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SupportActorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPatientProfileByUserId(userId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  findPractitionerProfileByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  findUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: {
        userId,
      },
      select: {
        role: true,
      },
    });
  }

  isSupportAssignableUser(userId: string) {
    return this.prisma.userRole.count({
      where: {
        userId,
        role: {
          in: [UserRoleType.ADMIN, UserRoleType.SUPPORT],
        },
      },
    });
  }
}
