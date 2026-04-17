import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { ModerationModule } from '@modules/moderation/moderation.module';
import { GeneralChatConversationsController } from './controllers/general-chat-conversations.controller';
import { GeneralChatActorRepository } from './repositories/general-chat-actor.repository';
import { GeneralChatRepository } from './repositories/general-chat.repository';
import { ValidateGeneralChatMessagePayloadService } from './services/validate-general-chat-message-payload.service';
import { ValidateGeneralChatParticipantPolicyService } from './services/validate-general-chat-participant-policy.service';
import { CreateOrGetGeneralChatConversationUseCase } from './use-cases/create-or-get-general-chat-conversation.use-case';
import { GetMyGeneralChatConversationDetailUseCase } from './use-cases/get-my-general-chat-conversation-detail.use-case';
import { ListMyGeneralChatConversationsUseCase } from './use-cases/list-my-general-chat-conversations.use-case';
import { MarkMyGeneralChatConversationReadUseCase } from './use-cases/mark-my-general-chat-conversation-read.use-case';
import { ReportGeneralChatTargetUseCase } from './use-cases/report-general-chat-target.use-case';
import { SendGeneralChatMessageUseCase } from './use-cases/send-general-chat-message.use-case';

@Module({
  imports: [ModerationModule],
  controllers: [GeneralChatConversationsController],
  providers: [
    JwtAccessAuthGuard,
    GeneralChatRepository,
    GeneralChatActorRepository,
    ValidateGeneralChatParticipantPolicyService,
    ValidateGeneralChatMessagePayloadService,
    CreateOrGetGeneralChatConversationUseCase,
    ListMyGeneralChatConversationsUseCase,
    GetMyGeneralChatConversationDetailUseCase,
    SendGeneralChatMessageUseCase,
    MarkMyGeneralChatConversationReadUseCase,
    ReportGeneralChatTargetUseCase,
  ],
})
export class ChatModule {}
