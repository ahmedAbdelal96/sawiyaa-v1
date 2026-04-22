import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * UserRepository owns the user-centered read queries for Users Module.
 * It exposes only the columns needed for current-user read models, not full auth or profile payloads.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrentUserBasics(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        status: true,
        createdAt: true,
        emails: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            email: true,
            isPrimary: true,
            isVerified: true,
          },
        },
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            phone: true,
            isPrimary: true,
            isVerified: true,
          },
        },
      },
    });
  }

  async patchCurrentUserProfile(input: {
    userId: string;
    displayName?: string;
  }): Promise<{ id: string; displayName: string | null } | null> {
    const existing = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!existing) return null;

    return this.prisma.user.update({
      where: { id: input.userId },
      data: {
        displayName:
          input.displayName === undefined ? undefined : input.displayName,
      },
      select: {
        id: true,
        displayName: true,
      },
    });
  }
}
