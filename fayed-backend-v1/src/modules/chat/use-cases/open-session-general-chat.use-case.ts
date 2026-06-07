import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionMode, SessionProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateOrGetGeneralChatConversationUseCase } from './create-or-get-general-chat-conversation.use-case';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';
import {
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
  resolveSessionPresentationStatus,
} from '@modules/sessions/utils/session-join-policy.util';

const CHAT_ALLOWED_PRESENTATION_STATUSES = [
  'JOINABLE',
  'IN_PROGRESS',
  'COMPLETED',
  'ENDED',
  'CANCELLED',
] as const;

@Injectable()
export class OpenSessionGeneralChatUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createOrGetGeneralChatConversationUseCase: CreateOrGetGeneralChatConversationUseCase,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    sessionId: string;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { id: input.sessionId },
      select: {
        id: true,
        status: true,
        sessionMode: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        provider: true,
        providerRoomId: true,
        providerSessionRef: true,
        patient: { select: { userId: true } },
        practitioner: { select: { userId: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: 'GENERAL_CHAT_LINKED_SESSION_FORBIDDEN',
      });
    }

    const isParticipant =
      session.patient.userId === input.authenticatedUser.id ||
      session.practitioner.userId === input.authenticatedUser.id;

    if (!isParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: 'GENERAL_CHAT_LINKED_SESSION_FORBIDDEN',
      });
    }

    const presentationStatus = resolveSessionPresentationStatus({
      status: session.status,
      sessionMode: session.sessionMode as SessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider as SessionProvider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      now: new Date(),
      runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
    });

    if (
      !CHAT_ALLOWED_PRESENTATION_STATUSES.includes(
        presentationStatus as (typeof CHAT_ALLOWED_PRESENTATION_STATUSES)[number],
      )
    ) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: 'GENERAL_CHAT_LINKED_SESSION_FORBIDDEN',
      });
    }

    const actorIsPatient =
      session.patient.userId === input.authenticatedUser.id;

    return this.createOrGetGeneralChatConversationUseCase.execute({
      authenticatedUser: input.authenticatedUser,
      dto: {
        targetUserId: actorIsPatient
          ? session.practitioner.userId
          : session.patient.userId,
        targetRole: actorIsPatient
          ? GeneralChatTargetRoleDto.PRACTITIONER
          : GeneralChatTargetRoleDto.PATIENT,
        linkedSessionId: session.id,
      },
    });
  }
}
