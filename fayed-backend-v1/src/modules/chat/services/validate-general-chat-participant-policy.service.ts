import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';
import {
  GENERAL_CHAT_ALLOWED_PARTICIPANT_ROLES,
  GENERAL_CHAT_ERROR_CODES,
  GeneralChatParticipantRole,
} from '../types/general-chat.types';

@Injectable()
export class ValidateGeneralChatParticipantPolicyService {
  resolveActorRole(input: {
    actorUserId: string;
    targetUserId: string;
    targetRole: GeneralChatTargetRoleDto;
    actorRoles: AppRole[];
  }): GeneralChatParticipantRole {
    if (input.actorUserId === input.targetUserId) {
      throw new BadRequestException({
        messageKey: 'chat.errors.selfConversationForbidden',
        errorCode: GENERAL_CHAT_ERROR_CODES.selfConversationForbidden,
      });
    }

    if (input.targetRole === GeneralChatTargetRoleDto.PRACTITIONER) {
      if (!input.actorRoles.includes(AppRole.PATIENT)) {
        throw new ForbiddenException({
          messageKey: 'chat.errors.participantRoleForbidden',
          errorCode: GENERAL_CHAT_ERROR_CODES.participantRoleForbidden,
        });
      }

      return 'PATIENT';
    }

    if (input.targetRole === GeneralChatTargetRoleDto.PATIENT) {
      if (!input.actorRoles.includes(AppRole.PRACTITIONER)) {
        throw new ForbiddenException({
          messageKey: 'chat.errors.participantRoleForbidden',
          errorCode: GENERAL_CHAT_ERROR_CODES.participantRoleForbidden,
        });
      }

      return 'PRACTITIONER';
    }

    throw new ForbiddenException({
      messageKey: 'chat.errors.participantPairForbidden',
      errorCode: GENERAL_CHAT_ERROR_CODES.participantPairForbidden,
    });
  }

  assertAllowedPair(input: {
    actorRole: GeneralChatParticipantRole;
    targetRole: GeneralChatTargetRoleDto;
  }): void {
    const targetParticipantRole: GeneralChatParticipantRole =
      input.targetRole === GeneralChatTargetRoleDto.PATIENT
        ? 'PATIENT'
        : 'PRACTITIONER';

    const actorAllowed = GENERAL_CHAT_ALLOWED_PARTICIPANT_ROLES.includes(
      input.actorRole,
    );
    const targetAllowed = GENERAL_CHAT_ALLOWED_PARTICIPANT_ROLES.includes(
      targetParticipantRole,
    );

    const pairAllowed =
      (input.actorRole === 'PATIENT' &&
        targetParticipantRole === 'PRACTITIONER') ||
      (input.actorRole === 'PRACTITIONER' &&
        targetParticipantRole === 'PATIENT');

    if (!actorAllowed || !targetAllowed || !pairAllowed) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.participantPairForbidden',
        errorCode: GENERAL_CHAT_ERROR_CODES.participantPairForbidden,
      });
    }
  }
}
