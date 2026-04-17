import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AddSupportMessageDto } from '../dto/add-support-message.dto';
import { CreateSupportTicketDto } from '../dto/create-support-ticket.dto';
import { ListSupportTicketsDto } from '../dto/list-support-tickets.dto';
import {
  SupportTicketItemSuccessResponseDto,
  SupportTicketListSuccessResponseDto,
} from '../dto/support-response.dto';
import { AddMySupportMessageUseCase } from '../use-cases/add-my-support-message.use-case';
import { CreateSupportTicketUseCase } from '../use-cases/create-support-ticket.use-case';
import { GetMySupportTicketUseCase } from '../use-cases/get-my-support-ticket.use-case';
import { ListMySupportTicketsUseCase } from '../use-cases/list-my-support-tickets.use-case';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/support/tickets')
export class PatientSupportController {
  constructor(
    private readonly createSupportTicketUseCase: CreateSupportTicketUseCase,
    private readonly listMySupportTicketsUseCase: ListMySupportTicketsUseCase,
    private readonly getMySupportTicketUseCase: GetMySupportTicketUseCase,
    private readonly addMySupportMessageUseCase: AddMySupportMessageUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create patient support ticket' })
  @ApiBody({ type: CreateSupportTicketDto })
  @ApiResponse({ status: 201, type: SupportTicketItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSupportTicketDto,
  ) {
    return this.createSupportTicketUseCase
      .execute({
        actorKind: 'PATIENT',
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List patient-owned support tickets' })
  @ApiResponse({ status: 200, type: SupportTicketListSuccessResponseDto })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListSupportTicketsDto,
  ) {
    return this.listMySupportTicketsUseCase
      .execute({
        actorKind: 'PATIENT',
        userId: currentUser.id,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient-owned support ticket details' })
  @ApiResponse({ status: 200, type: SupportTicketItemSuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Support ticket was not found' })
  @ApiForbiddenResponse({ description: 'Ticket access is forbidden' })
  getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
  ) {
    return this.getMySupportTicketUseCase
      .execute({
        actorKind: 'PATIENT',
        userId: currentUser.id,
        ticketId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/messages')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add patient message to owned support ticket' })
  @ApiBody({ type: AddSupportMessageDto })
  @ApiResponse({ status: 200, type: SupportTicketItemSuccessResponseDto })
  addMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: AddSupportMessageDto,
  ) {
    return this.addMySupportMessageUseCase
      .execute({
        actorKind: 'PATIENT',
        userId: currentUser.id,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
