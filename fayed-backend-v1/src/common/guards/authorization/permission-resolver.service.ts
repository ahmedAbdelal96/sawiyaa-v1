import { Injectable } from '@nestjs/common';
import { PermissionOverrideEffect, UserRoleType } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermissions(input: {
    userId: string;
    roles: AppRole[];
    requiredPermissions: PermissionKey[];
  }): Promise<boolean> {
    const requiredPermissions = [...new Set(input.requiredPermissions)];

    if (requiredPermissions.length === 0) {
      return true;
    }

    // SUPER_ADMIN remains a first-class role with full permission bypass.
    if (input.roles.includes(AppRole.SUPER_ADMIN)) {
      return true;
    }

    const roleTypes = this.mapAppRolesToUserRoleTypes(input.roles);

    const [rolePermissions, userOverrides] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: {
          role: {
            in: roleTypes,
          },
          permission: {
            key: {
              in: requiredPermissions,
            },
          },
        },
        select: {
          permission: {
            select: {
              key: true,
            },
          },
        },
      }),
      this.prisma.userPermissionOverride.findMany({
        where: {
          userId: input.userId,
          permission: {
            key: {
              in: requiredPermissions,
            },
          },
        },
        select: {
          effect: true,
          permission: {
            select: {
              key: true,
            },
          },
        },
      }),
    ]);

    const grantedByRole = new Set(
      rolePermissions.map((entry) => entry.permission.key as PermissionKey),
    );
    const overrideByPermission = new Map<
      PermissionKey,
      PermissionOverrideEffect
    >(
      userOverrides.map((entry) => [
        entry.permission.key as PermissionKey,
        entry.effect,
      ]),
    );

    for (const permission of requiredPermissions) {
      const override = overrideByPermission.get(permission);

      if (override === PermissionOverrideEffect.DENY) {
        return false;
      }

      if (override === PermissionOverrideEffect.ALLOW) {
        continue;
      }

      if (!grantedByRole.has(permission)) {
        return false;
      }
    }

    return true;
  }

  private mapAppRolesToUserRoleTypes(roles: AppRole[]): UserRoleType[] {
    const roleTypes = new Set<UserRoleType>();

    for (const role of roles) {
      switch (role) {
        case AppRole.SUPER_ADMIN:
          roleTypes.add(UserRoleType.SUPER_ADMIN);
          break;
        case AppRole.ADMIN:
          roleTypes.add(UserRoleType.ADMIN);
          break;
        case AppRole.FINANCE_STAFF:
          roleTypes.add(UserRoleType.FINANCE_STAFF);
          break;
        case AppRole.MARKETING_STAFF:
          roleTypes.add(UserRoleType.MARKETING_STAFF);
          break;
        case AppRole.PRACTITIONER_REVIEWER:
          roleTypes.add(UserRoleType.PRACTITIONER_REVIEWER);
          break;
        case AppRole.PATIENT_OPERATIONS:
          roleTypes.add(UserRoleType.PATIENT_OPERATIONS);
          break;
        case AppRole.SUPPORT_AGENT:
          roleTypes.add(UserRoleType.SUPPORT);
          break;
        case AppRole.CONTENT_REVIEWER:
          roleTypes.add(UserRoleType.CONTENT_REVIEWER);
          break;
        case AppRole.PATIENT:
          roleTypes.add(UserRoleType.PATIENT);
          break;
        case AppRole.PRACTITIONER:
          roleTypes.add(UserRoleType.PRACTITIONER);
          break;
      }
    }

    return [...roleTypes];
  }
}
