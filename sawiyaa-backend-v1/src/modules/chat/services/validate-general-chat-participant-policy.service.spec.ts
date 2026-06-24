import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ConversationParticipantRole } from '@prisma/client';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';
import { ValidateGeneralChatParticipantPolicyService } from './validate-general-chat-participant-policy.service';

describe('ValidateGeneralChatParticipantPolicyService', () => {
  const service = new ValidateGeneralChatParticipantPolicyService();

  it('allows patient actor when target role is practitioner', () => {
    const actorRole = service.resolveActorRole({
      actorUserId: 'user_patient',
      targetUserId: 'user_practitioner',
      targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
      actorRoles: [AppRole.PATIENT],
    });

    expect(actorRole).toBe(ConversationParticipantRole.PATIENT);
  });

  it('rejects self-conversation', () => {
    expect(() =>
      service.resolveActorRole({
        actorUserId: 'same-user',
        targetUserId: 'same-user',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        actorRoles: [AppRole.PATIENT],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects actor without required role for target pair', () => {
    expect(() =>
      service.resolveActorRole({
        actorUserId: 'user_support',
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        actorRoles: [AppRole.SUPPORT_AGENT],
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects non patient-practitioner pair', () => {
    expect(() =>
      service.assertAllowedPair({
        actorRole: ConversationParticipantRole.PATIENT,
        targetRole: GeneralChatTargetRoleDto.PATIENT,
      }),
    ).toThrow(ForbiddenException);
  });
});
