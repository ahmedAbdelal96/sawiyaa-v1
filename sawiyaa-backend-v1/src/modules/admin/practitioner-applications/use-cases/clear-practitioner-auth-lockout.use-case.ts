import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { AuthLockoutService } from '@modules/auth/services/auth-lockout.service';
import { AUTH_LOCKOUT_CONTEXTS } from '@modules/auth/types/auth-lockout.types';

@Injectable()
export class ClearPractitionerAuthLockoutUseCase {
  constructor(
    private readonly adminPractitionerProfileRepository: AdminPractitionerProfileRepository,
    private readonly authLockoutService: AuthLockoutService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: {
    practitionerId: string;
    actorUserId: string;
    locale: SupportedLocale;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string | null;
  }) {
    const profile = await this.adminPractitionerProfileRepository.findById(
      input.practitionerId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        errorCode: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    await Promise.all([
      this.authLockoutService.clear(
        AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
        `user:${profile.userId}`,
      ),
      this.authLockoutService.clear(
        AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
        `user:${profile.userId}`,
      ),
    ]);

    this.securityAuditService.logAsync({
      action: 'auth.practitioner.authLockout.clear',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: input.actorUserId,
      resourceType: 'PractitionerProfile',
      resourceId: profile.id,
      targetUserId: profile.userId,
      correlationId: input.correlationId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: {
        clearedContexts: [
          AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
          AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
        ],
      },
    });

    return {
      message: this.i18nService.t(
        'auth.success.practitionerAuthLockoutCleared',
        input.locale,
      ),
    };
  }
}

