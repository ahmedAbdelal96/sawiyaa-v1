import { Injectable } from '@nestjs/common';
import { Prisma, UserRoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const INTERNAL_ROLE_TYPES: UserRoleType[] = [
  UserRoleType.SUPER_ADMIN,
  UserRoleType.ADMIN,
  UserRoleType.SUPPORT,
  UserRoleType.FINANCE_STAFF,
  UserRoleType.CONTENT_REVIEWER,
  UserRoleType.PRACTITIONER_REVIEWER,
  UserRoleType.PATIENT_OPERATIONS,
  UserRoleType.MARKETING_STAFF,
];

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  internalRoleTypes(): UserRoleType[] {
    return [...INTERNAL_ROLE_TYPES];
  }

  async isInternalUser(userId: string): Promise<boolean> {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { in: INTERNAL_ROLE_TYPES },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async countSuperAdmins(): Promise<number> {
    const rows = await this.prisma.userRole.findMany({
      where: { role: UserRoleType.SUPER_ADMIN },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.length;
  }

  async list(input: {
    skip: number;
    take: number;
    q?: string;
    role?: UserRoleType;
    status?: UserStatus;
  }) {
    const q = input.q?.trim();
    const roleFilter =
      input.role && INTERNAL_ROLE_TYPES.includes(input.role)
        ? input.role
        : null;

    return this.prisma.user.findMany({
      where: {
        status: input.status,
        roles: {
          some: {
            role: roleFilter ? roleFilter : { in: INTERNAL_ROLE_TYPES },
          },
        },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                {
                  emails: {
                    some: { email: { contains: q, mode: 'insensitive' } },
                  },
                },
                {
                  phones: {
                    some: { phone: { contains: q, mode: 'insensitive' } },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
      select: {
        id: true,
        displayName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: { email: true, isVerified: true },
        },
        phones: {
          where: { isPrimary: true },
          take: 1,
          select: { phone: true, isVerified: true },
        },
        roles: {
          select: { role: true },
        },
      },
    });
  }

  async count(input: { q?: string; role?: UserRoleType; status?: UserStatus }) {
    const q = input.q?.trim();
    const roleFilter =
      input.role && INTERNAL_ROLE_TYPES.includes(input.role)
        ? input.role
        : null;

    return this.prisma.user.count({
      where: {
        status: input.status,
        roles: {
          some: {
            role: roleFilter ? roleFilter : { in: INTERNAL_ROLE_TYPES },
          },
        },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                {
                  emails: {
                    some: { email: { contains: q, mode: 'insensitive' } },
                  },
                },
                {
                  phones: {
                    some: { phone: { contains: q, mode: 'insensitive' } },
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  async findInternalUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        roles: { some: { role: { in: INTERNAL_ROLE_TYPES } } },
      },
      select: {
        id: true,
        displayName: true,
        status: true,
        tokenVersion: true,
        defaultLocale: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        emails: {
          orderBy: { isPrimary: 'desc' },
          select: { email: true, isPrimary: true, isVerified: true },
        },
        phones: {
          orderBy: { isPrimary: 'desc' },
          select: { phone: true, isPrimary: true, isVerified: true },
        },
        roles: {
          select: { role: true },
        },
      },
    });
  }

  async upsertPermissionByKey(key: string, description?: string) {
    return this.prisma.permission.upsert({
      where: { key },
      create: { key, description },
      update: { description },
      select: { id: true, key: true },
    });
  }

  async listPermissionOverrides(userId: string) {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId },
      select: {
        effect: true,
        reason: true,
        createdAt: true,
        updatedAt: true,
        permission: { select: { key: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertPermissionOverride(
    input: {
      userId: string;
      permissionId: string;
      effect: 'ALLOW' | 'DENY';
      reason?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).userPermissionOverride.upsert({
      where: {
        userId_permissionId: {
          userId: input.userId,
          permissionId: input.permissionId,
        },
      },
      create: {
        userId: input.userId,
        permissionId: input.permissionId,
        effect: input.effect as any,
        reason: input.reason ?? null,
      },
      update: {
        effect: input.effect as any,
        reason: input.reason ?? null,
      },
      select: { id: true },
    });
  }

  async deletePermissionOverride(
    input: { userId: string; permissionId: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).userPermissionOverride.deleteMany({
      where: { userId: input.userId, permissionId: input.permissionId },
    });
  }

  async setUserRoles(
    input: { userId: string; roles: UserRoleType[] },
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);

    // Only mutate internal/admin-class roles. Do not touch patient/practitioner roles.
    await db.userRole.deleteMany({
      where: {
        userId: input.userId,
        role: { in: INTERNAL_ROLE_TYPES },
      },
    });
    await db.userRole.createMany({
      data: input.roles.map((role) => ({ userId: input.userId, role })),
      skipDuplicates: true,
    });
  }

  async updateUserStatus(
    userId: string,
    status: UserStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async patchUser(
    input: {
      userId: string;
      displayName?: string;
      defaultLocale?: string;
      timezone?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).user.update({
      where: { id: input.userId },
      data: {
        displayName: input.displayName,
        defaultLocale: input.defaultLocale,
        timezone: input.timezone,
      },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        timezone: true,
      },
    });
  }

  async revokeAllActiveSessions(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await this.db(tx).userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return result.count;
  }

  async bumpTokenVersion(userId: string, tx?: Prisma.TransactionClient) {
    return this.db(tx).user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: { id: true, tokenVersion: true },
    });
  }
}
