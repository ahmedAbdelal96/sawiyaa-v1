import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SessionPractitionerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPublicSlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
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

  findByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            status: true,
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
}
