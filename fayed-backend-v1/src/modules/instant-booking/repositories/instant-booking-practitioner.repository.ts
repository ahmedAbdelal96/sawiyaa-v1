import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class InstantBookingPractitionerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      include: this.practitionerInclude,
    });
  }

  findByPublicSlug(slug: string) {
    return this.prisma.practitionerProfile.findFirst({
      where: {
        publicSlug: slug.trim().toLowerCase(),
      },
      include: this.practitionerInclude,
    });
  }

  private readonly practitionerInclude = {
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
  } as const;
}
