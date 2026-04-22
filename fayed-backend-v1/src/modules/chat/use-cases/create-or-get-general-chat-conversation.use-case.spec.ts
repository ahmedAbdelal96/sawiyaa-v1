import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ConversationParticipantRole } from '@prisma/client';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';
import { GeneralChatActorRepository } from '../repositories/general-chat-actor.repository';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ValidateGeneralChatParticipantPolicyService } from '../services/validate-general-chat-participant-policy.service';
import { CreateOrGetGeneralChatConversationUseCase } from './create-or-get-general-chat-conversation.use-case';

describe('CreateOrGetGeneralChatConversationUseCase', () => {
  const generalChatRepository = {
    findByConversationRef: jest.fn(),
    createConversation: jest.fn(),
  } as unknown as GeneralChatRepository;

  const generalChatActorRepository = {
    findParticipantProfileByUser: jest.fn(),
    findSessionPairLink: jest.fn(),
  } as unknown as GeneralChatActorRepository;

  const useCase = new CreateOrGetGeneralChatConversationUseCase(
    generalChatRepository,
    generalChatActorRepository,
    new ValidateGeneralChatParticipantPolicyService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates conversation for allowed patient-practitioner pair', async () => {
    (generalChatActorRepository.findParticipantProfileByUser as jest.Mock)
      .mockResolvedValueOnce({
        id: 'pat_profile_1',
        userId: 'user_patient',
      })
      .mockResolvedValueOnce({
        id: 'pr_profile_1',
        userId: 'user_practitioner',
      });
    (
      generalChatRepository.findByConversationRef as jest.Mock
    ).mockResolvedValue(null);
    (generalChatRepository.createConversation as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      conversationRef: 'gc_ref_1',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      sessionId: null,
      supportTicket: null,
      chatApprovalRequest: null,
      participants: [
        {
          userId: 'user_patient',
          participantRole: ConversationParticipantRole.PATIENT,
        },
        {
          userId: 'user_practitioner',
          participantRole: ConversationParticipantRole.PRACTITIONER,
        },
      ],
    });

    const result = await useCase.execute({
      authenticatedUser: {
        id: 'user_patient',
        roles: [AppRole.PATIENT],
      },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
      },
    });

    expect(generalChatRepository.createConversation).toHaveBeenCalled();
    expect(result.item.wasCreated).toBe(true);
    expect(result.item.participants).toHaveLength(2);
  });

  it('returns existing conversation deterministically for same pair/scope', async () => {
    (generalChatActorRepository.findParticipantProfileByUser as jest.Mock)
      .mockResolvedValueOnce({
        id: 'pat_profile_1',
        userId: 'user_patient',
      })
      .mockResolvedValueOnce({
        id: 'pr_profile_1',
        userId: 'user_practitioner',
      });
    (
      generalChatRepository.findByConversationRef as jest.Mock
    ).mockResolvedValue({
      id: 'conv_existing',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      supportTicket: null,
      chatApprovalRequest: null,
      conversationRef: 'gc_existing',
      sessionId: null,
      participants: [
        {
          userId: 'user_patient',
        },
        {
          userId: 'user_practitioner',
        },
      ],
    });

    const result = await useCase.execute({
      authenticatedUser: {
        id: 'user_patient',
        roles: [AppRole.PATIENT],
      },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
      },
    });

    expect(generalChatRepository.createConversation).not.toHaveBeenCalled();
    expect(result.item.wasCreated).toBe(false);
    expect(result.item.conversationId).toBe('conv_existing');
  });

  it('rejects forbidden pairing role', async () => {
    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user_support',
          roles: [AppRole.SUPPORT_AGENT],
        },
        dto: {
          targetUserId: 'user_practitioner',
          targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when actor/target profile cannot be resolved', async () => {
    (generalChatActorRepository.findParticipantProfileByUser as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'pr_profile_1',
        userId: 'user_practitioner',
      });

    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user_patient',
          roles: [AppRole.PATIENT],
        },
        dto: {
          targetUserId: 'user_practitioner',
          targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects boundary leakage when existing conversation is support/care-linked', async () => {
    (generalChatActorRepository.findParticipantProfileByUser as jest.Mock)
      .mockResolvedValueOnce({
        id: 'pat_profile_1',
        userId: 'user_patient',
      })
      .mockResolvedValueOnce({
        id: 'pr_profile_1',
        userId: 'user_practitioner',
      });
    (
      generalChatRepository.findByConversationRef as jest.Mock
    ).mockResolvedValue({
      id: 'conv_bad',
      conversationType: 'SYSTEM',
      status: 'OPEN',
      supportTicket: { id: 'ticket_1' },
      chatApprovalRequest: null,
      conversationRef: 'gc_bad',
      sessionId: null,
      participants: [
        {
          userId: 'user_patient',
        },
      ],
    });

    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user_patient',
          roles: [AppRole.PATIENT],
        },
        dto: {
          targetUserId: 'user_practitioner',
          targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
