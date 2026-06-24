import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConversationParticipantRole } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';

@Injectable()
export class ResolveSupportAdminActorRoleService {
  resolve(roles: AppRole[]): 'ADMIN' | 'SUPPORT_AGENT' {
    if (roles.includes(AppRole.ADMIN)) {
      return ConversationParticipantRole.ADMIN;
    }
    if (roles.includes(AppRole.SUPPORT_AGENT)) {
      return ConversationParticipantRole.SUPPORT_AGENT;
    }

    throw new ForbiddenException({
      messageKey: 'support.errors.supportRoleRequired',
      error: 'SUPPORT_ROLE_REQUIRED',
    });
  }
}
