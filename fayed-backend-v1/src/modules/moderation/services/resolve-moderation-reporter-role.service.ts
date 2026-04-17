import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ModerationReporterRole } from '@prisma/client';
import { mapAppRoleToModerationReporterRole } from '../types/moderation.types';

@Injectable()
export class ResolveModerationReporterRoleService {
  resolve(currentUser: AuthenticatedUser): ModerationReporterRole {
    const reporterRole = mapAppRoleToModerationReporterRole(currentUser.roles);
    if (!reporterRole) {
      throw new ForbiddenException({
        messageKey: 'moderation.errors.reporterRoleNotAllowed',
        error: 'MODERATION_REPORTER_ROLE_NOT_ALLOWED',
      });
    }

    if (
      reporterRole === ModerationReporterRole.SUPPORT_AGENT &&
      !currentUser.roles.includes(AppRole.SUPPORT_AGENT)
    ) {
      throw new ForbiddenException({
        messageKey: 'moderation.errors.reporterRoleNotAllowed',
        error: 'MODERATION_REPORTER_ROLE_NOT_ALLOWED',
      });
    }

    return reporterRole;
  }
}

