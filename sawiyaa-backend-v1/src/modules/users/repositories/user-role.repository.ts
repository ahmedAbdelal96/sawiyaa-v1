import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Roles are queried separately because role lists are a first-class read concern for this module.
 * This keeps role endpoints decoupled from profile and identity lookups.
 */
@Injectable()
export class UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCurrentUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        role: true,
      },
    });
  }
}
