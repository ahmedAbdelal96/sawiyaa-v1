import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  ConversationParticipantRole,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { CreateGeneralChatConversationDto } from '../dto/create-general-chat-conversation.dto';
import {
  buildGeneralChatParticipantDirectoryMap,
  buildGeneralChatParticipantSummary,
  resolveGeneralChatProfessionalTitles,
} from '../helpers/general-chat-identity.mapper';
import { GeneralChatActorRepository } from '../repositories/general-chat-actor.repository';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import {
  GENERAL_CHAT_ERROR_CODES,
  GENERAL_CHAT_ALLOWED_CONVERSATION_STATUS,
  GeneralChatParticipantRole,
} from '../types/general-chat.types';
import { ValidateGeneralChatParticipantPolicyService } from '../services/validate-general-chat-participant-policy.service';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class CreateOrGetGeneralChatConversationUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatActorRepository: GeneralChatActorRepository,
    private readonly generalChatAvailabilityService: GeneralChatAvailabilityService,
    private readonly validateGeneralChatParticipantPolicyService: ValidateGeneralChatParticipantPolicyService,
    private readonly professionalContentResolver: PractitionerProfessionalContentResolver,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    dto: CreateGeneralChatConversationDto;
    locale?: SupportedLocale;
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

      // Check existing canonical conversation by sessionId first
      const sessionConversations =
        await this.generalChatRepository.findConversationsBySessionId(
          input.dto.linkedSessionId,
        );

      if (sessionConversations.length > 1) {
        throw new BadRequestException(
          `DATA_INTEGRITY_VIOLATION: Multiple canonical conversations exist for session ${input.dto.linkedSessionId}`,
        );
      }

      if (sessionConversations.length === 1) {
        const existing = sessionConversations[0];
        this.assertGeneralConversationBoundary(
          existing,
          input.authenticatedUser.id,
        );
        return {
          item: await this.toReadItem(existing, false, input.locale ?? 'ar'),
        };
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
        item: await this.toReadItem(existing, false, input.locale ?? 'ar'),
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
        item: await this.toReadItem(created, true, input.locale ?? 'ar'),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const isExpected = Array.isArray(target)
          ? target.includes('conversationRef')
          : typeof target === 'string'
            ? target.includes('conversationRef')
            : true;

        if (!isExpected) {
          throw error;
        }

        // Recovery: 1. find by sessionId
        if (input.dto.linkedSessionId) {
          const sessionConversations =
            await this.generalChatRepository.findConversationsBySessionId(
              input.dto.linkedSessionId,
            );
          if (sessionConversations.length > 1) {
            throw new BadRequestException(
              `DATA_INTEGRITY_VIOLATION: Multiple canonical conversations exist for session ${input.dto.linkedSessionId}`,
            );
          }
          if (sessionConversations.length === 1) {
            const converged = sessionConversations[0];
            this.assertGeneralConversationBoundary(
              converged,
              input.authenticatedUser.id,
            );
            return {
              item: await this.toReadItem(
                converged,
                false,
                input.locale ?? 'ar',
              ),
            };
          }
        }

        // Recovery: 2. fallback to conversationRef
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
            item: await this.toReadItem(converged, false, input.locale ?? 'ar'),
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
      closedAt: Date | null;
      adminSendingDisabledAt: Date | null;
      adminSendingDisabledByUserId: string | null;
      adminSendingDisabledReason: string | null;
      adminSendingEnabledAt: Date | null;
      adminSendingEnabledByUserId: string | null;
      practitionerSendingDisabledAt: Date | null;
      practitionerSendingDisabledByUserId: string | null;
      practitionerSendingDisabledReason: string | null;
      practitionerSendingEnabledAt: Date | null;
      practitionerSendingEnabledByUserId: string | null;
      supportTicket: { id: string } | null;
      chatApprovalRequest: { id: string } | null;
      session: {
        status: string;
        sessionMode: string;
        scheduledStartAt: Date | null;
        scheduledEndAt: Date | null;
        provider: string;
        providerRoomId: string | null;
        providerSessionRef: string | null;
      } | null;
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
      closedAt: Date | null;
      adminSendingDisabledAt: Date | null;
      adminSendingDisabledByUserId: string | null;
      adminSendingDisabledReason: string | null;
      adminSendingEnabledAt: Date | null;
      adminSendingEnabledByUserId: string | null;
      practitionerSendingDisabledAt: Date | null;
      practitionerSendingDisabledByUserId: string | null;
      practitionerSendingDisabledReason: string | null;
      practitionerSendingEnabledAt: Date | null;
      practitionerSendingEnabledByUserId: string | null;
      supportTicket: { id: string } | null;
      chatApprovalRequest: { id: string } | null;
      session: {
        id: string;
        status: SessionStatus;
        sessionMode: SessionMode;
        scheduledStartAt: Date | null;
        scheduledEndAt: Date | null;
        provider: SessionProvider;
        providerRoomId: string | null;
        providerSessionRef: string | null;
      } | null;
      createdAt: Date;
      updatedAt: Date;
      participants: Array<{
        userId: string;
        participantRole: ConversationParticipantRole;
      }>;
    },
    wasCreated: boolean,
    locale: 'ar' | 'en',
  ) {
    const participantDirectoryRecords =
      (await this.generalChatRepository.loadParticipantIdentityRecords?.(
        conversation.participants.map((participant) => participant.userId),
      )) ?? [];
    const participantDirectory = buildGeneralChatParticipantDirectoryMap(
      participantDirectoryRecords,
    );
    const resolvedProfessionalTitles = resolveGeneralChatProfessionalTitles(
      participantDirectoryRecords,
      locale,
      this.professionalContentResolver,
    );
    const chatAvailability =
      this.generalChatAvailabilityService.resolveAvailability({
        conversation: {
          status: conversation.status as never,
          closedAt: conversation.closedAt,
          adminLock: {
            disabledAt: conversation.adminSendingDisabledAt,
            disabledByUserId: conversation.adminSendingDisabledByUserId,
            disabledReason: conversation.adminSendingDisabledReason,
            enabledAt: conversation.adminSendingEnabledAt,
            enabledByUserId: conversation.adminSendingEnabledByUserId,
          },
          practitionerLock: {
            disabledAt: conversation.practitionerSendingDisabledAt,
            disabledByUserId: conversation.practitionerSendingDisabledByUserId,
            disabledReason: conversation.practitionerSendingDisabledReason,
            enabledAt: conversation.practitionerSendingEnabledAt,
            enabledByUserId: conversation.practitionerSendingEnabledByUserId,
          },
        },
        linkedSession: conversation.session
          ? {
              status: conversation.session.status,
              sessionMode: conversation.session.sessionMode,
              scheduledStartAt: conversation.session.scheduledStartAt,
              scheduledEndAt: conversation.session.scheduledEndAt,
              provider: conversation.session.provider,
              providerRoomId: conversation.session.providerRoomId,
              providerSessionRef: conversation.session.providerSessionRef,
            }
          : null,
      });

    return {
      conversationId: conversation.id,
      conversationRef: conversation.conversationRef ?? '',
      conversationType: 'SYSTEM' as const,
      status: conversation.status,
      linkedSessionId: conversation.sessionId,
      participants: conversation.participants.map((participant) =>
        buildGeneralChatParticipantSummary(
          participant,
          participantDirectory,
          resolvedProfessionalTitles,
        ),
      ),
      wasCreated,
      chatAvailability,
    };
  }
}
