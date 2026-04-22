import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminCareChatController } from './controllers/admin-care-chat.controller';
import { PatientCareChatController } from './controllers/patient-care-chat.controller';
import { PractitionerCareChatController } from './controllers/practitioner-care-chat.controller';
import { CareChatPresenter } from './presenters/care-chat.presenter';
import { CareChatActorRepository } from './repositories/care-chat-actor.repository';
import { CareChatConversationRepository } from './repositories/care-chat-conversation.repository';
import { CareChatLinkedSessionRepository } from './repositories/care-chat-linked-session.repository';
import { CareChatRequestRepository } from './repositories/care-chat-request.repository';
import { ResolveCareChatActivityStateService } from './services/resolve-care-chat-activity-state.service';
import { ValidateCareChatApprovalTransitionService } from './services/validate-care-chat-approval-transition.service';
import { ValidateCareChatSendMessageService } from './services/validate-care-chat-send-message.service';
import { CreateCareChatRequestUseCase } from './use-cases/create-care-chat-request.use-case';
import { DecideCareChatRequestUseCase } from './use-cases/decide-care-chat-request.use-case';
import { GetAdminCareChatRequestUseCase } from './use-cases/get-admin-care-chat-request.use-case';
import { GetCareChatConversationUseCase } from './use-cases/get-care-chat-conversation.use-case';
import { GetMyCareChatRequestUseCase } from './use-cases/get-my-care-chat-request.use-case';
import { ListAdminCareChatRequestsUseCase } from './use-cases/list-admin-care-chat-requests.use-case';
import { ListMyCareChatRequestsUseCase } from './use-cases/list-my-care-chat-requests.use-case';
import { RevokeCareChatRequestUseCase } from './use-cases/revoke-care-chat-request.use-case';
import { SendCareChatMessageUseCase } from './use-cases/send-care-chat-message.use-case';

@Module({
  controllers: [
    PatientCareChatController,
    PractitionerCareChatController,
    AdminCareChatController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    CareChatPresenter,
    CareChatActorRepository,
    CareChatRequestRepository,
    CareChatConversationRepository,
    CareChatLinkedSessionRepository,
    ResolveCareChatActivityStateService,
    ValidateCareChatApprovalTransitionService,
    ValidateCareChatSendMessageService,
    CreateCareChatRequestUseCase,
    ListMyCareChatRequestsUseCase,
    GetMyCareChatRequestUseCase,
    ListAdminCareChatRequestsUseCase,
    GetAdminCareChatRequestUseCase,
    DecideCareChatRequestUseCase,
    RevokeCareChatRequestUseCase,
    GetCareChatConversationUseCase,
    SendCareChatMessageUseCase,
  ],
  exports: [CareChatConversationRepository, SendCareChatMessageUseCase],
})
export class CareChatModule {}
