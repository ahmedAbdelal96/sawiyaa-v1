import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateOrGetGeneralChatConversationUseCase } from './create-or-get-general-chat-conversation.use-case';
import { GeneralChatTargetRoleDto } from '../dto/create-general-chat-conversation.dto';

const CHAT_ALLOWED_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
  SessionStatus.COMPLETED,
];

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

    if (!CHAT_ALLOWED_SESSION_STATUSES.includes(session.status)) {
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
