import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * PresencePractitionerRepository reads only practitioner fields required for presence ownership and public visibility checks.
 */
@Injectable()
export class PresencePractitionerRepository {
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
}
