import { Injectable } from '@nestjs/common';
import { PractitionerStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * AvailabilityPractitionerRepository reads only the practitioner/account fields required by Availability.
 * It intentionally avoids importing profile/business concerns that belong to Practitioners or Auth modules.
 */
@Injectable()
export class AvailabilityPractitionerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            displayName: true,
            timezone: true,
          },
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          select: {
            specialtyId: true,
          },
        },
      },
    });
  }

  findByPublicSlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            displayName: true,
            timezone: true,
          },
        },
        specialties: {
          where: {
            specialty: {
              isActive: true,
            },
          },
          select: {
            specialtyId: true,
          },
        },
      },
    });
  }

  findApprovedReminderCandidates() {
    return this.prisma.practitionerProfile.findMany({
      where: {
        status: PractitionerStatus.APPROVED,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
            timezone: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });
  }
}
