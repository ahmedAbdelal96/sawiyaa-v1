import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AddSupportMessageDto } from '../dto/add-support-message.dto';
import { AssignSupportTicketDto } from '../dto/assign-support-ticket.dto';
import { CreateAdminSupportTicketForReporterDto } from '../dto/create-admin-support-ticket-for-reporter.dto';
import { ListSupportTicketsDto } from '../dto/list-support-tickets.dto';
import {
  AdminSupportTicketItemSuccessResponseDto,
  SupportTicketListSuccessResponseDto,
} from '../dto/support-response.dto';
import { UpdateSupportTicketStatusDto } from '../dto/update-support-ticket-status.dto';
import { AddAdminSupportMessageUseCase } from '../use-cases/add-admin-support-message.use-case';
import { AddAdminSupportNoteUseCase } from '../use-cases/add-admin-support-note.use-case';
import { AssignSupportTicketUseCase } from '../use-cases/assign-support-ticket.use-case';
import { CreateAdminSupportTicketForReporterUseCase } from '../use-cases/create-admin-support-ticket-for-reporter.use-case';
import { GetAdminSupportTicketUseCase } from '../use-cases/get-admin-support-ticket.use-case';
import { ListAdminSupportTicketsUseCase } from '../use-cases/list-admin-support-tickets.use-case';
import { UpdateSupportTicketStatusUseCase } from '../use-cases/update-support-ticket-status.use-case';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
// BUSINESS DECISION: ADMIN and SUPPORT_AGENT roles can read support tickets.
// Public replies use the shared inbox; assignment remains an optional operational field and
// is not required for an authorized employee to reply.
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/support/tickets')
export class AdminSupportController {
  constructor(
    private readonly listAdminSupportTicketsUseCase: ListAdminSupportTicketsUseCase,
    private readonly getAdminSupportTicketUseCase: GetAdminSupportTicketUseCase,
    private readonly addAdminSupportMessageUseCase: AddAdminSupportMessageUseCase,
    private readonly addAdminSupportNoteUseCase: AddAdminSupportNoteUseCase,
    private readonly createAdminSupportTicketForReporterUseCase: CreateAdminSupportTicketForReporterUseCase,
    private readonly updateSupportTicketStatusUseCase: UpdateSupportTicketStatusUseCase,
    private readonly assignSupportTicketUseCase: AssignSupportTicketUseCase,
  ) {}

  @Post('create-for-reporter')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Create a support outreach ticket for a moderation reporter when no direct support thread exists',
  })
  @ApiBody({ type: CreateAdminSupportTicketForReporterDto })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  createForReporter(@Body() body: CreateAdminSupportTicketForReporterDto) {
    return this.createAdminSupportTicketForReporterUseCase
      .execute({
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({
    summary: 'List support tickets for admin/support operations',
  })
  @ApiResponse({ status: 200, type: SupportTicketListSuccessResponseDto })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListSupportTicketsDto,
  ) {
    return this.listAdminSupportTicketsUseCase
      .execute({
        userId: currentUser.id,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details with internal notes' })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  getById(@Param('id') ticketId: string) {
    return this.getAdminSupportTicketUseCase
      .execute({
        ticketId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/messages')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Add admin/support message to support ticket thread',
  })
  @ApiBody({ type: AddSupportMessageDto })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  addMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: AddSupportMessageDto,
  ) {
    return this.addAdminSupportMessageUseCase
      .execute({
        userId: currentUser.id,
        roles: currentUser.roles,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/internal-notes')
  @Permissions(PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL)
  @HttpCode(200)
  @ApiOperation({ summary: 'Add internal support/admin note' })
  @ApiBody({ type: AddSupportMessageDto })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  addInternalNote(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: AddSupportMessageDto,
  ) {
    return this.addAdminSupportNoteUseCase
      .execute({
        userId: currentUser.id,
        roles: currentUser.roles,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update support ticket status' })
  @ApiBody({ type: UpdateSupportTicketStatusDto })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: UpdateSupportTicketStatusDto,
  ) {
    return this.updateSupportTicketStatusUseCase
      .execute({
        userId: currentUser.id,
        roles: currentUser.roles,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/assign')
  @Permissions(PermissionKey.SUPPORT_TICKET_ASSIGN)
  @ApiOperation({ summary: 'Assign/unassign support ticket' })
  @ApiBody({ type: AssignSupportTicketDto })
  @ApiResponse({ status: 200, type: AdminSupportTicketItemSuccessResponseDto })
  assign(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: AssignSupportTicketDto,
  ) {
    return this.assignSupportTicketUseCase
      .execute({
        userId: currentUser.id,
        roles: currentUser.roles,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
