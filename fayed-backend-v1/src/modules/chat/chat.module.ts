import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { CareChatModule } from '@modules/care-chat/care-chat.module';
import { ModerationModule } from '@modules/moderation/moderation.module';
import { SupportModule } from '@modules/support/support.module';
import { GeneralChatAttachmentsController } from './controllers/general-chat-attachments.controller';
import { GeneralChatConversationsController } from './controllers/general-chat-conversations.controller';
import { GeneralChatSessionController } from './controllers/general-chat-session.controller';
import { GeneralChatGateway } from './gateways/general-chat.gateway';
import { GeneralChatActorRepository } from './repositories/general-chat-actor.repository';
import { GeneralChatRepository } from './repositories/general-chat.repository';
import { GeneralChatAttachmentStorageService } from './services/general-chat-attachment-storage.service';
import { ValidateGeneralChatMessagePayloadService } from './services/validate-general-chat-message-payload.service';
import { ValidateGeneralChatParticipantPolicyService } from './services/validate-general-chat-participant-policy.service';
import { CloseGeneralChatConversationUseCase } from './use-cases/close-general-chat-conversation.use-case';
import { CreateOrGetGeneralChatConversationUseCase } from './use-cases/create-or-get-general-chat-conversation.use-case';
import { GetMyGeneralChatConversationDetailUseCase } from './use-cases/get-my-general-chat-conversation-detail.use-case';
import { GetMyUnifiedMessagingUnreadSummaryUseCase } from './use-cases/get-my-unified-messaging-unread-summary.use-case';
import { ListMyGeneralChatMessagesUseCase } from './use-cases/list-my-general-chat-messages.use-case';
import { ListMyGeneralChatConversationsUseCase } from './use-cases/list-my-general-chat-conversations.use-case';
import { MarkMyGeneralChatConversationReadUseCase } from './use-cases/mark-my-general-chat-conversation-read.use-case';
import { OpenSessionGeneralChatUseCase } from './use-cases/open-session-general-chat.use-case';
import { ReportGeneralChatTargetUseCase } from './use-cases/report-general-chat-target.use-case';
import { SendGeneralChatMessageUseCase } from './use-cases/send-general-chat-message.use-case';

@Module({
  imports: [ModerationModule, AuthModule, SupportModule, CareChatModule],
  controllers: [
    GeneralChatConversationsController,
    GeneralChatAttachmentsController,
    GeneralChatSessionController,
  ],
  providers: [
    JwtAccessAuthGuard,
    GeneralChatRepository,
    GeneralChatActorRepository,
    GeneralChatAttachmentStorageService,
    ValidateGeneralChatParticipantPolicyService,
    ValidateGeneralChatMessagePayloadService,
    CreateOrGetGeneralChatConversationUseCase,
    ListMyGeneralChatConversationsUseCase,
    GetMyGeneralChatConversationDetailUseCase,
    GetMyUnifiedMessagingUnreadSummaryUseCase,
    ListMyGeneralChatMessagesUseCase,
    SendGeneralChatMessageUseCase,
    MarkMyGeneralChatConversationReadUseCase,
    ReportGeneralChatTargetUseCase,
    OpenSessionGeneralChatUseCase,
    CloseGeneralChatConversationUseCase,
    GeneralChatGateway,
  ],
})
export class ChatModule {}
