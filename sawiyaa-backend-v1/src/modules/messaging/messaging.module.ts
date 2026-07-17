import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingPolicyRegistry } from './policies/messaging-policy-registry';
import { MessagingPresenter } from './presenters/messaging.presenter';
import { MessagingRepository } from './repositories/messaging.repository';
import { MessagingUseCase } from './use-cases/messaging.use-case';
import { GeneralChatAttachmentStorageService } from '@modules/chat/services/general-chat-attachment-storage.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MessagingGateway } from './gateways/messaging.gateway';

@Module({
  imports: [PrismaModule, NotificationsModule, AuthModule],
  controllers: [MessagingController],
  providers: [JwtAccessAuthGuard, MessagingPolicyRegistry, MessagingPresenter, MessagingRepository, MessagingUseCase, GeneralChatAttachmentStorageService, MessagingGateway],
  exports: [MessagingPolicyRegistry, MessagingPresenter, MessagingRepository, MessagingUseCase],
})
export class MessagingModule {}
