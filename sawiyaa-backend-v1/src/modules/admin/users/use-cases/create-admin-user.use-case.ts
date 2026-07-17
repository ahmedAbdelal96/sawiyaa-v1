import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthProvider, UserRoleType, UserStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SecurityAuditOutcome } from '@prisma/client';
import { HashPasswordUseCase } from '@modules/auth/use-cases/hash-password.use-case';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { PrismaService } from '@common/prisma/prisma.service';
import { isAuthUniqueConstraintError } from '@modules/auth/utils/is-auth-unique-constraint-error';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(value: string): string {
  return value.trim();
}

function normalizePhone(phone?: string): string | undefined {
  const trimmed = phone?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly repo: AdminUsersRepository,
    private readonly policy: AdminUserManagementPolicy,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    actor: AuthenticatedUser;
    payload: CreateAdminUserDto;
  }) {
    const normalizedEmail = normalizeEmail(input.payload.email);
    const displayName = normalizeDisplayName(input.payload.displayName);
    const phone = normalizePhone(input.payload.phone);
    const roles = [...new Set(input.payload.roles)];
    const status = input.payload.status ?? UserStatus.ACTIVE;

    this.policy.assertInternalRoles(roles);
    this.policy.assertActorCanAssignRoles({
      actorRoles: input.actor.roles,
      desiredRoles: roles,
    });

    const existing = await this.prisma.userEmail.findUnique({
      where: { email: normalizedEmail },
      select: { userId: true },
    });

    if (existing) {
      this.securityAuditService.logAsync({
        action: 'security.adminUsers.create.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'User',
        reason: 'EMAIL_ALREADY_EXISTS',
        metadata: {
          emailDomain: normalizedEmail.split('@')[1] ?? null,
        },
      });
      throw new ConflictException({
        messageKey: 'admin.adminUsers.errors.emailAlreadyExists',
        error: 'ADMIN_USER_EMAIL_EXISTS',
      });
    }

    try {
      const passwordHash = await this.hashPasswordUseCase.execute(
        input.payload.password,
      );

      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            displayName,
            status,
          },
          select: { id: true, status: true, createdAt: true },
        });

        await tx.userEmail.create({
          data: {
            userId: user.id,
            email: normalizedEmail,
            isPrimary: true,
            isVerified: false,
          },
          select: { id: true },
        });

        if (phone) {
          await tx.userPhone.create({
            data: {
              userId: user.id,
              phone,
              isPrimary: true,
              isVerified: false,
            },
            select: { id: true },
          });
        }

        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
          select: { id: true },
        });

        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, role })),
          skipDuplicates: true,
        });

        await this.securityAuditService.recordRequired(tx, {
          action: 'security.adminUsers.create.success',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.actor.id,
          actorRoles: input.actor.roles,
          resourceType: 'User',
          resourceId: user.id,
          targetUserId: user.id,
          metadata: { status: user.status, roles },
        });

        return user;
      });

      return {
        message: this.i18nService.t(
          'admin.adminUsers.success.userCreated',
          input.locale,
        ),
        userId: created.id,
      };
    } catch (error) {
      if (isAuthUniqueConstraintError(error)) {
        this.securityAuditService.logAsync({
          action: 'security.adminUsers.create.failure',
          outcome: SecurityAuditOutcome.FAILURE,
          actorUserId: input.actor.id,
          actorRoles: input.actor.roles,
          resourceType: 'User',
          reason: 'EMAIL_ALREADY_EXISTS',
        });
        throw new ConflictException({
          messageKey: 'admin.adminUsers.errors.emailAlreadyExists',
          error: 'ADMIN_USER_EMAIL_EXISTS',
        });
      }

      this.securityAuditService.logAsync({
        action: 'security.adminUsers.create.failure',
        outcome: SecurityAuditOutcome.FAILURE,
        actorUserId: input.actor.id,
        actorRoles: input.actor.roles,
        resourceType: 'User',
        reason: 'UNEXPECTED_ERROR',
      });
      throw error instanceof Error
        ? error
        : new InternalServerErrorException({
            message: 'Failed to create admin user',
            error: 'ADMIN_USER_CREATE_FAILED',
          });
    }
  }
}
