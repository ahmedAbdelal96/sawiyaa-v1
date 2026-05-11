import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ConversationParticipantRole } from '@prisma/client';
import { createHash } from 'crypto';
import { CreateGeneralChatConversationDto } from '../dto/create-general-chat-conversation.dto';
import {
  buildGeneralChatParticipantDirectoryMap,
  buildGeneralChatParticipantSummary,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatActorRepository } from '../repositories/general-chat-actor.repository';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import {
  GENERAL_CHAT_ERROR_CODES,
  GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS,
  GeneralChatParticipantRole,
} from '../types/general-chat.types';
import { ValidateGeneralChatParticipantPolicyService } from '../services/validate-general-chat-participant-policy.service';

@Injectable()
export class CreateOrGetGeneralChatConversationUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatActorRepository: GeneralChatActorRepository,
    private readonly validateGeneralChatParticipantPolicyService: ValidateGeneralChatParticipantPolicyService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: CreateGeneralChatConversationDto;
  }) {
    const actorRole =
      this.validateGeneralChatParticipantPolicyService.resolveActorRole({
        actorUserId: input.authenticatedUser.id,
        targetUserId: input.dto.targetUserId,
        targetRole: input.dto.targetRole,
        actorRoles: input.authenticatedUser.roles,
      });

    this.validateGeneralChatParticipantPolicyService.assertAllowedPair({
      actorRole,
      targetRole: input.dto.targetRole,
    });

    const targetRole: GeneralChatParticipantRole =
      input.dto.targetRole === 'PATIENT' ? 'PATIENT' : 'PRACTITIONER';

    const [actorProfile, targetProfile] = await Promise.all([
      this.generalChatActorRepository.findParticipantProfileByUser({
        userId: input.authenticatedUser.id,
        role: actorRole,
      }),
      this.generalChatActorRepository.findParticipantProfileByUser({
        userId: input.dto.targetUserId,
        role: targetRole,
      }),
    ]);

    if (!actorProfile || !targetProfile) {
      throw new NotFoundException({
        messageKey: 'chat.errors.participantNotFound',
        errorCode: GENERAL_CHAT_ERROR_CODES.participantNotFound,
      });
    }

    const participantPair = this.resolvePair({
      actorRole,
      actorProfileId: actorProfile.id,
      actorUserId: actorProfile.userId,
      targetRole,
      targetProfileId: targetProfile.id,
      targetUserId: targetProfile.userId,
    });

    if (input.dto.linkedSessionId) {
      const linkedSession =
        await this.generalChatActorRepository.findSessionPairLink({
          sessionId: input.dto.linkedSessionId,
          patientProfileId: participantPair.patientProfileId,
          practitionerProfileId: participantPair.practitionerProfileId,
        });

      if (!linkedSession) {
        throw new ForbiddenException({
          messageKey: 'chat.errors.linkedSessionForbidden',
          errorCode: GENERAL_CHAT_ERROR_CODES.linkedSessionForbidden,
        });
      }
    }

    const conversationRef = this.buildConversationRef({
      patientProfileId: participantPair.patientProfileId,
      practitionerProfileId: participantPair.practitionerProfileId,
      linkedSessionId: input.dto.linkedSessionId ?? null,
    });

    const existing =
      await this.generalChatRepository.findByConversationRef(conversationRef);

    if (existing) {
      this.assertGeneralConversationBoundary(
        existing,
        input.authenticatedUser.id,
      );
      return {
        item: await this.toReadItem(existing, false),
      };
    }

    try {
      const created = await this.generalChatRepository.createConversation({
        conversationRef,
        patientProfileId: participantPair.patientProfileId,
        practitionerProfileId: participantPair.practitionerProfileId,
        patientUserId: participantPair.patientUserId,
        practitionerUserId: participantPair.practitionerUserId,
        linkedSessionId: input.dto.linkedSessionId ?? null,
      });

      return {
        item: await this.toReadItem(created, true),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const converged =
          await this.generalChatRepository.findByConversationRef(
            conversationRef,
          );
          if (converged) {
            this.assertGeneralConversationBoundary(
              converged,
              input.authenticatedUser.id,
            );
            return {
              item: await this.toReadItem(converged, false),
            };
          }
      }

      throw error;
    }
  }

  private resolvePair(input: {
    actorRole: GeneralChatParticipantRole;
    actorProfileId: string;
    actorUserId: string;
    targetRole: GeneralChatParticipantRole;
    targetProfileId: string;
    targetUserId: string;
  }) {
    if (input.actorRole === 'PATIENT' && input.targetRole === 'PRACTITIONER') {
      return {
        patientProfileId: input.actorProfileId,
        patientUserId: input.actorUserId,
        practitionerProfileId: input.targetProfileId,
        practitionerUserId: input.targetUserId,
      };
    }

    if (input.actorRole === 'PRACTITIONER' && input.targetRole === 'PATIENT') {
      return {
        patientProfileId: input.targetProfileId,
        patientUserId: input.targetUserId,
        practitionerProfileId: input.actorProfileId,
        practitionerUserId: input.actorUserId,
      };
    }

    throw new ForbiddenException({
      messageKey: 'chat.errors.participantPairForbidden',
      errorCode: GENERAL_CHAT_ERROR_CODES.participantPairForbidden,
    });
  }

  private buildConversationRef(input: {
    patientProfileId: string;
    practitionerProfileId: string;
    linkedSessionId: string | null;
  }) {
    const scope = input.linkedSessionId
      ? `session:${input.linkedSessionId}`
      : 'global';
    const raw = `general-chat|patient:${input.patientProfileId}|practitioner:${input.practitionerProfileId}|${scope}`;
    const digest = createHash('sha256').update(raw).digest('hex').slice(0, 40);

    return `gc_${digest}`;
  }

  private assertGeneralConversationBoundary(
    conversation: {
      id: string;
      conversationType: string;
      status: string;
      supportTicket: { id: string } | null;
      chatApprovalRequest: { id: string } | null;
      participants: Array<{ userId: string }>;
    },
    actorUserId: string,
  ) {
    const isGeneralBoundarySafe =
      conversation.conversationType === 'SYSTEM' &&
      conversation.supportTicket === null &&
      conversation.chatApprovalRequest === null;

    if (!isGeneralBoundarySafe) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationBoundaryViolation',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationBoundaryViolation,
      });
    }

    const isMember = conversation.participants.some(
      (participant) => participant.userId === actorUserId,
    );
    if (!isMember) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationBoundaryViolation',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationBoundaryViolation,
      });
    }

    const statusAllowed = GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS.includes(
      conversation.status as (typeof GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS)[number],
    );
    if (!statusAllowed) {
      throw new BadRequestException({
        messageKey: 'chat.errors.conversationBoundaryViolation',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationBoundaryViolation,
      });
    }
  }

  private async toReadItem(
    conversation: {
      id: string;
      conversationRef: string | null;
      conversationType: string;
      status: string;
      sessionId: string | null;
      participants: Array<{
        userId: string;
        participantRole: ConversationParticipantRole;
      }>;
    },
    wasCreated: boolean,
  ) {
    const participantDirectoryRecords =
      (await this.generalChatRepository.loadParticipantIdentityRecords?.(
        conversation.participants.map((participant) => participant.userId),
      )) ?? [];
    const participantDirectory = buildGeneralChatParticipantDirectoryMap(
      participantDirectoryRecords,
    );

    return {
      conversationId: conversation.id,
      conversationRef: conversation.conversationRef ?? '',
      conversationType: 'SYSTEM' as const,
      status: conversation.status,
      linkedSessionId: conversation.sessionId,
      participants: conversation.participants.map((participant) =>
        buildGeneralChatParticipantSummary(participant, participantDirectory),
      ),
      wasCreated,
    };
  }
}
