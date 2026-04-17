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
  ApiOperation,
  ApiResponse,
  ApiTags,
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
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/support/tickets')
export class PractitionerSupportController {
  constructor(
    private readonly createSupportTicketUseCase: CreateSupportTicketUseCase,
    private readonly listMySupportTicketsUseCase: ListMySupportTicketsUseCase,
    private readonly getMySupportTicketUseCase: GetMySupportTicketUseCase,
    private readonly addMySupportMessageUseCase: AddMySupportMessageUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create practitioner support ticket' })
  @ApiBody({ type: CreateSupportTicketDto })
  @ApiResponse({ status: 201, type: SupportTicketItemSuccessResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateSupportTicketDto,
  ) {
    return this.createSupportTicketUseCase
      .execute({
        actorKind: 'PRACTITIONER',
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List practitioner-owned support tickets' })
  @ApiResponse({ status: 200, type: SupportTicketListSuccessResponseDto })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListSupportTicketsDto,
  ) {
    return this.listMySupportTicketsUseCase
      .execute({
        actorKind: 'PRACTITIONER',
        userId: currentUser.id,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get practitioner-owned support ticket details' })
  @ApiResponse({ status: 200, type: SupportTicketItemSuccessResponseDto })
  getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
  ) {
    return this.getMySupportTicketUseCase
      .execute({
        actorKind: 'PRACTITIONER',
        userId: currentUser.id,
        ticketId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/messages')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add practitioner message to owned support ticket' })
  @ApiBody({ type: AddSupportMessageDto })
  @ApiResponse({ status: 200, type: SupportTicketItemSuccessResponseDto })
  addMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') ticketId: string,
    @Body() body: AddSupportMessageDto,
  ) {
    return this.addMySupportMessageUseCase
      .execute({
        actorKind: 'PRACTITIONER',
        userId: currentUser.id,
        ticketId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
