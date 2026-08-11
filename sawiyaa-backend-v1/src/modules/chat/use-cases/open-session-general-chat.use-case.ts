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
import { ResolveSessionChatAvailabilityService } from '../services/resolve-session-chat-availability.service';

@Injectable()
export class OpenSessionGeneralChatUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createOrGetGeneralChatConversationUseCase: CreateOrGetGeneralChatConversationUseCase,
    private readonly resolveSessionChatAvailability: ResolveSessionChatAvailabilityService,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    sessionId: string;
  }) {
    const session = await this.resolveAvailableSession(input);

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

  private async resolveAvailableSession(input: {
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

    const { available } = this.resolveSessionChatAvailability.resolve({
      status: session.status,
      sessionMode: session.sessionMode as SessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider as SessionProvider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
    });

    if (!available) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: 'GENERAL_CHAT_LINKED_SESSION_FORBIDDEN',
      });
    }

    return session;
  }
}
