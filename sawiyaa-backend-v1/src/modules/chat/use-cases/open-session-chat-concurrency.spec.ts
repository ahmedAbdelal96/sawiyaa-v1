import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ConversationParticipantRole, SessionStatus, SessionMode, SessionProvider } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';
import { GeneralChatActorRepository } from '../repositories/general-chat-actor.repository';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ValidateGeneralChatParticipantPolicyService } from '../services/validate-general-chat-participant-policy.service';
import { CreateOrGetGeneralChatConversationUseCase } from './create-or-get-general-chat-conversation.use-case';

describe('CreateOrGetGeneralChatConversationUseCase — Idempotency, Concurrency & Completed-Session Rules', () => {
  let generalChatRepository: Record<keyof GeneralChatRepository, jest.Mock>;
  let generalChatActorRepository: Record<keyof GeneralChatActorRepository, jest.Mock>;
  let useCase: CreateOrGetGeneralChatConversationUseCase;

  const mockSessionId = 'session-uuid-111';
  const mockConversationRef = 'gc_ref_mock';

  const mockParticipantProfiles = {
    patient: { id: 'pat_prof_1', userId: 'user_patient' },
    practitioner: { id: 'prac_prof_1', userId: 'user_practitioner' },
  };

  const mockConversation = {
    id: 'conv_1',
    conversationRef: mockConversationRef,
    conversationType: 'SYSTEM',
    status: 'OPEN',
    closedAt: null,
    adminSendingDisabledAt: null,
    adminSendingDisabledByUserId: null,
    adminSendingDisabledReason: null,
    adminSendingEnabledAt: null,
    adminSendingEnabledByUserId: null,
    practitionerSendingDisabledAt: null,
    practitionerSendingDisabledByUserId: null,
    practitionerSendingDisabledReason: null,
    practitionerSendingEnabledAt: null,
    practitionerSendingEnabledByUserId: null,
    sessionId: mockSessionId,
    supportTicket: null,
    chatApprovalRequest: null,
    session: {
      id: mockSessionId,
      status: SessionStatus.READY_TO_JOIN,
      sessionMode: SessionMode.VIDEO,
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(),
      provider: SessionProvider.DAILY,
      providerRoomId: 'room_1',
      providerSessionRef: 'ref_1',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { userId: 'user_patient', participantRole: ConversationParticipantRole.PATIENT },
      { userId: 'user_practitioner', participantRole: ConversationParticipantRole.PRACTITIONER },
    ],
  };

  beforeEach(() => {
    generalChatRepository = {
      findByConversationRef: jest.fn(),
      findConversationsBySessionId: jest.fn().mockResolvedValue([]),
      createConversation: jest.fn(),
      listOwnedConversations: jest.fn(),
      findConversationByIdInGeneralScope: jest.fn(),
      findAccessibleMessageInConversationScope: jest.fn(),
      countUnreadMessagesForParticipant: jest.fn(),
      updateConversationStatus: jest.fn(),
      countSessionUnreadForUser: jest.fn(),
      loadParticipantIdentityRecords: jest.fn().mockResolvedValue([]),
      loadParticipantIdentityRecord: jest.fn(),
      generalBoundaryWhere: jest.fn(),
    } as any;

    generalChatActorRepository = {
      findParticipantProfileByUser: jest.fn(),
      findSessionPairLink: jest.fn(),
    } as any;

    useCase = new CreateOrGetGeneralChatConversationUseCase(
      generalChatRepository as any,
      generalChatActorRepository as any,
      new GeneralChatAvailabilityService(new GeneralChatModerationStateService()),
      new ValidateGeneralChatParticipantPolicyService(),
    );

    // Default setups
    generalChatActorRepository.findParticipantProfileByUser.mockImplementation((input) => {
      if (input.userId === 'user_patient') return Promise.resolve(mockParticipantProfiles.patient);
      if (input.userId === 'user_practitioner') return Promise.resolve(mockParticipantProfiles.practitioner);
      return Promise.resolve(null);
    });
    generalChatActorRepository.findSessionPairLink.mockResolvedValue(true);
  });

  it('1. Existing conversation is found by sessionId before create', async () => {
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([mockConversation]);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    expect(generalChatRepository.findConversationsBySessionId).toHaveBeenCalledWith(mockSessionId);
    expect(generalChatRepository.createConversation).not.toHaveBeenCalled();
    expect(result.item.conversationId).toBe('conv_1');
    expect(result.item.wasCreated).toBe(false);
  });

  it('2. Legacy conversation with same sessionId but different conversationRef is reused safely', async () => {
    const legacyConversation = {
      ...mockConversation,
      conversationRef: 'gc_legacy_different_ref',
    };
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([legacyConversation]);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    expect(result.item.conversationId).toBe('conv_1');
    expect(result.item.conversationRef).toBe('gc_legacy_different_ref');
    expect(generalChatRepository.createConversation).not.toHaveBeenCalled();
  });

  it('3. Repeated open returns same conversationId', async () => {
    generalChatRepository.findConversationsBySessionId.mockResolvedValueOnce([]).mockResolvedValue([mockConversation]);
    generalChatRepository.createConversation.mockResolvedValue(mockConversation);

    const res1 = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    const res2 = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    expect(res1.item.conversationId).toBe('conv_1');
    expect(res2.item.conversationId).toBe('conv_1');
  });

  it('4. Expected P2002 conflict on conversationRef does not surface as 500', async () => {
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([]);
    generalChatRepository.findByConversationRef.mockResolvedValue(null);

    // Simulate Prisma unique key violation on conversationRef
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint violation',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['conversationRef'] } }
    );
    generalChatRepository.createConversation.mockRejectedValue(prismaError);

    // Subsequent retrieval returns the one created by concurrent request
    generalChatRepository.findByConversationRef.mockResolvedValue(mockConversation);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    expect(result.item.conversationId).toBe('conv_1');
    expect(result.item.wasCreated).toBe(false);
  });

  it('5. Unrelated P2002 is rethrown and not hidden', async () => {
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([]);
    generalChatRepository.findByConversationRef.mockResolvedValue(null);

    // Unrelated unique constraint on a different field, e.g., 'anotherField'
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint violation',
      { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['anotherField'] } }
    );
    generalChatRepository.createConversation.mockRejectedValue(prismaError);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
        dto: {
          targetUserId: 'user_practitioner',
          targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
          linkedSessionId: mockSessionId,
        },
      })
    ).rejects.toThrow(prismaError);
  });

  it('6. Duplicate canonical conversations are detected and throw BadRequestException', async () => {
    // Return multiple conversations for the same session to simulate a data-integrity defect
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([
      mockConversation,
      { ...mockConversation, id: 'conv_duplicate_2' },
    ]);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
        dto: {
          targetUserId: 'user_practitioner',
          targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
          linkedSessionId: mockSessionId,
        },
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('7. Patient and Practitioner both resolve the same conversation', async () => {
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([mockConversation]);

    const patientRes = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    const practitionerRes = await useCase.execute({
      authenticatedUser: { id: 'user_practitioner', roles: [AppRole.PRACTITIONER] },
      dto: {
        targetUserId: 'user_patient',
        targetRole: GeneralChatTargetRoleDto.PATIENT,
        linkedSessionId: mockSessionId,
      },
    });

    expect(patientRes.item.conversationId).toBe('conv_1');
    expect(practitionerRes.item.conversationId).toBe('conv_1');
  });

  it('8. Availability/canSend policy on completed session remains unchanged', async () => {
    const completedSessionConv = {
      ...mockConversation,
      session: {
        ...mockConversation.session,
        status: SessionStatus.COMPLETED,
      },
    };
    generalChatRepository.findConversationsBySessionId.mockResolvedValue([completedSessionConv]);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [AppRole.PATIENT] },
      dto: {
        targetUserId: 'user_practitioner',
        targetRole: GeneralChatTargetRoleDto.PRACTITIONER,
        linkedSessionId: mockSessionId,
      },
    });

    expect(result.item.conversationId).toBe('conv_1');
    expect(result.item.chatAvailability.canSend).toBe(false);
    expect(result.item.chatAvailability.readOnly).toBe(true);
  });
});
