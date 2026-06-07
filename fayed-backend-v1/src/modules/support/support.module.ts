import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AdminSupportController } from './controllers/admin-support.controller';
import { PatientSupportController } from './controllers/patient-support.controller';
import { PractitionerSupportController } from './controllers/practitioner-support.controller';
import { SupportTicketAccessPolicy } from './policies/support-ticket-access.policy';
import { SupportPresenter } from './presenters/support.presenter';
import { SupportActorRepository } from './repositories/support-actor.repository';
import { SupportRelatedEntityRepository } from './repositories/support-related-entity.repository';
import { SupportTicketRepository } from './repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from './services/resolve-support-admin-actor-role.service';
import { ValidateSupportLinkedEntitiesService } from './services/validate-support-linked-entities.service';
import { ValidateSupportTicketStatusTransitionService } from './services/validate-support-ticket-status-transition.service';
import { AddAdminSupportMessageUseCase } from './use-cases/add-admin-support-message.use-case';
import { AddAdminSupportNoteUseCase } from './use-cases/add-admin-support-note.use-case';
import { AddMySupportMessageUseCase } from './use-cases/add-my-support-message.use-case';
import { AssignSupportTicketUseCase } from './use-cases/assign-support-ticket.use-case';
import { CreateAdminSupportTicketForReporterUseCase } from './use-cases/create-admin-support-ticket-for-reporter.use-case';
import { CreateSupportTicketUseCase } from './use-cases/create-support-ticket.use-case';
import { GetAdminSupportTicketUseCase } from './use-cases/get-admin-support-ticket.use-case';
import { GetMySupportTicketUseCase } from './use-cases/get-my-support-ticket.use-case';
import { ListAdminSupportTicketsUseCase } from './use-cases/list-admin-support-tickets.use-case';
import { ListMySupportTicketsUseCase } from './use-cases/list-my-support-tickets.use-case';
import { UpdateSupportTicketStatusUseCase } from './use-cases/update-support-ticket-status.use-case';

@Module({
  controllers: [
    PatientSupportController,
    PractitionerSupportController,
    AdminSupportController,
  ],
  imports: [NotificationsModule],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    SupportTicketAccessPolicy,
    SupportPresenter,
    SupportActorRepository,
    SupportRelatedEntityRepository,
    SupportTicketRepository,
    ResolveSupportAdminActorRoleService,
    ValidateSupportLinkedEntitiesService,
    ValidateSupportTicketStatusTransitionService,
    CreateSupportTicketUseCase,
    ListMySupportTicketsUseCase,
    GetMySupportTicketUseCase,
    AddMySupportMessageUseCase,
    ListAdminSupportTicketsUseCase,
    GetAdminSupportTicketUseCase,
    AddAdminSupportMessageUseCase,
    AddAdminSupportNoteUseCase,
    CreateAdminSupportTicketForReporterUseCase,
    UpdateSupportTicketStatusUseCase,
    AssignSupportTicketUseCase,
  ],
  exports: [
    SupportTicketRepository,
    AddMySupportMessageUseCase,
    AddAdminSupportMessageUseCase,
  ],
})
export class SupportModule {}
