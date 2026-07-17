import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionOverrideEffect, UserRoleType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SecurityAuditOutcome } from '@prisma/client';
import { PermissionOverrideOperationDto } from '../dto/update-admin-user-permission-overrides.dto';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

const ADMIN_USER_CONTROL_KEYS: ReadonlySet<PermissionKey> = new Set([
  PermissionKey.ADMIN_USERS_READ,
  PermissionKey.ADMIN_USERS_CREATE,
  PermissionKey.ADMIN_USERS_UPDATE,
  PermissionKey.ADMIN_USERS_STATUS_UPDATE,
  PermissionKey.ADMIN_USERS_ROLES_UPDATE,
  PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ,
  PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE,
  PermissionKey.ADMIN_USERS_SESSIONS_REVOKE,
  PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE,
]);

@Injectable()
export class UpdateAdminUserPermissionOverridesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
    private readonly policy: AdminUserManagementPolicy,
    private readonly permissionResolver: PermissionResolverService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    actor: AuthenticatedUser;
    userId: string;
    operations: PermissionOverrideOperationDto[];
  }) {
    this.policy.assertNotSelf(input.actor.id, input.userId);

    const target = await this.repo.findInternalUserById(input.userId);
    if (!target) {
      throw new NotFoundException({
        messageKey: 'admin.adminUsers.errors.userNotFound',
        error: 'ADMIN_USER_NOT_FOUND',
      });
    }

    const hasSuperAdmin = target.roles.some(
      (r) => r.role === UserRoleType.SUPER_ADMIN,
    );
    if (hasSuperAdmin) {
      const count = await this.repo.countSuperAdmins();
      const isLast = count <= 1;
      if (isLast) {
        const hasBlockingDeny = input.operations.some(
          (op) =>
            op.effect === PermissionOverrideEffect.DENY &&
            ADMIN_USER_CONTROL_KEYS.has(op.permissionKey),
        );
        if (hasBlockingDeny) {
          throw new ForbiddenException({
            messageKey: 'admin.adminUsers.errors.lastSuperAdminProtected',
            error: 'ADMIN_USERS_LAST_SUPER_ADMIN_PROTECTED',
          });
        }
      }
    }

    // If a non-super-admin is allowed to update overrides (unlikely by default),
    // do not allow granting ALLOW overrides for permissions they do not effectively have.
    if (!input.actor.roles.includes(AppRole.SUPER_ADMIN)) {
      const allowKeys = input.operations
        .filter((op) => op.effect === PermissionOverrideEffect.ALLOW)
        .map((op) => op.permissionKey);

      if (allowKeys.length > 0) {
        const ok = await this.permissionResolver.hasPermissions({
          userId: input.actor.id,
          roles: input.actor.roles,
          requiredPermissions: allowKeys,
        });
        if (!ok) {
          throw new ForbiddenException({
            message:
              'Cannot grant permission overrides above your effective permissions',
            error: 'ADMIN_USERS_OVERRIDE_ESCALATION_BLOCKED',
          });
        }
      }
    }

    const operations = input.operations.slice(0, 100);

    await this.prisma.$transaction(async (tx) => {
      for (const op of operations) {
        const permission = await tx.permission.findUnique({
          where: { key: op.permissionKey as unknown as string },
          select: { id: true, key: true },
        });

        if (!permission) {
          throw new NotFoundException({
            messageKey: 'admin.adminUsers.errors.permissionNotFound',
            error: 'ADMIN_USERS_PERMISSION_NOT_FOUND',
          });
        }

        if (
          op.effect === PermissionOverrideEffect.ALLOW ||
          op.effect === PermissionOverrideEffect.DENY
        ) {
          await this.repo.upsertPermissionOverride(
            {
              userId: input.userId,
              permissionId: permission.id,
              effect: op.effect,
              reason: op.reason ?? null,
            },
            tx,
          );
        } else {
          await this.repo.deletePermissionOverride(
            { userId: input.userId, permissionId: permission.id },
            tx,
          );
        }
      }

      await this.securityAuditService.recordRequired(tx, {
        action: 'security.adminUsers.permissionOverrides.update.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'User',
        resourceId: input.userId,
        targetUserId: input.userId,
        metadata: {
          operations: operations.map((op) => ({
            permissionKey: op.permissionKey,
            effect: op.effect ?? null,
          })),
          operationsCount: operations.length,
        },
      });
    });

    return {
      message: this.i18nService.t(
        'admin.adminUsers.success.permissionOverridesUpdated',
        input.locale,
      ),
      operationsCount: operations.length,
    };
  }
}
