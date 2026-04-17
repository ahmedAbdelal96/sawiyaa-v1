import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Practitioner profile summaries are intentionally small in Users Module.
 * We expose only linkage and a read-only state snapshot, not onboarding or editable profile details.
 */
@Injectable()
export class PractitionerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLinkedProfile(userId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
      },
    });
  }
}
