import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordHashService } from '@modules/auth/services/password-hash.service';
import { HashPasswordUseCase } from '@modules/auth/use-cases/hash-password.use-case';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminUserManagementPolicy } from './policies/admin-user-management.policy';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { CreateAdminUserUseCase } from './use-cases/create-admin-user.use-case';
import { GetAdminUserUseCase } from './use-cases/get-admin-user.use-case';
import { InvalidateAdminUserTokensUseCase } from './use-cases/invalidate-admin-user-tokens.use-case';
import { ListAdminUserPermissionOverridesUseCase } from './use-cases/list-admin-user-permission-overrides.use-case';
import { ListAdminUsersUseCase } from './use-cases/list-admin-users.use-case';
import { PatchAdminUserUseCase } from './use-cases/patch-admin-user.use-case';
import { RevokeAdminUserSessionsUseCase } from './use-cases/revoke-admin-user-sessions.use-case';
import { UpdateAdminUserPermissionOverridesUseCase } from './use-cases/update-admin-user-permission-overrides.use-case';
import { UpdateAdminUserRolesUseCase } from './use-cases/update-admin-user-roles.use-case';
import { UpdateAdminUserStatusUseCase } from './use-cases/update-admin-user-status.use-case';

/**
 * Admin-only module for managing internal platform users (staff/admin accounts).
 *
 * Scope rules:
 * - Manages internal users only (users having at least one internal/admin-class role).
 * - Does not manage patient-only or practitioner-only accounts in this phase.
 */
@Module({
  controllers: [AdminUsersController],
  providers: [
    // Guards (consistent with other admin sub-modules)
    JwtAccessAuthGuard,
    AdminGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    ActiveAccountGuard,

    // Dependencies
    PrismaService,
    SecurityAuditService,
    PasswordHashService,
    HashPasswordUseCase,

    // Local domain
    AdminUsersRepository,
    AdminUserManagementPolicy,
    ListAdminUsersUseCase,
    GetAdminUserUseCase,
    CreateAdminUserUseCase,
    PatchAdminUserUseCase,
    UpdateAdminUserStatusUseCase,
    UpdateAdminUserRolesUseCase,
    ListAdminUserPermissionOverridesUseCase,
    UpdateAdminUserPermissionOverridesUseCase,
    RevokeAdminUserSessionsUseCase,
    InvalidateAdminUserTokensUseCase,
  ],
})
export class AdminUsersAdminModule {}
