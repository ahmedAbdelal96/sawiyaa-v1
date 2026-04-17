import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
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
import {
  AdminCareChatRequestItemSuccessResponseDto,
  AdminCareChatRequestListSuccessResponseDto,
  CareChatConversationSuccessResponseDto,
  CareChatDecisionSuccessResponseDto,
} from '../dto/care-chat-response.dto';
import { DecideCareChatRequestDto } from '../dto/decide-care-chat-request.dto';
import { ListCareChatRequestsDto } from '../dto/list-care-chat-requests.dto';
import { RevokeCareChatRequestDto } from '../dto/revoke-care-chat-request.dto';
import { DecideCareChatRequestUseCase } from '../use-cases/decide-care-chat-request.use-case';
import { GetAdminCareChatRequestUseCase } from '../use-cases/get-admin-care-chat-request.use-case';
import { GetCareChatConversationUseCase } from '../use-cases/get-care-chat-conversation.use-case';
import { ListAdminCareChatRequestsUseCase } from '../use-cases/list-admin-care-chat-requests.use-case';
import { RevokeCareChatRequestUseCase } from '../use-cases/revoke-care-chat-request.use-case';

@ApiTags('Care Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/care-chat')
export class AdminCareChatController {
  constructor(
    private readonly listAdminCareChatRequestsUseCase: ListAdminCareChatRequestsUseCase,
    private readonly getAdminCareChatRequestUseCase: GetAdminCareChatRequestUseCase,
    private readonly decideCareChatRequestUseCase: DecideCareChatRequestUseCase,
    private readonly revokeCareChatRequestUseCase: RevokeCareChatRequestUseCase,
    private readonly getCareChatConversationUseCase: GetCareChatConversationUseCase,
  ) {}

  @Get('requests')
  @ApiOperation({ summary: 'List care chat approval requests for admin/support' })
  @ApiResponse({ status: 200, type: AdminCareChatRequestListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles can access this route',
  })
  listRequests(@Query() query: ListCareChatRequestsDto) {
    return this.listAdminCareChatRequestsUseCase.execute({ query }).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get one care chat approval request details' })
  @ApiResponse({ status: 200, type: AdminCareChatRequestItemSuccessResponseDto })
  getRequestById(@Param('id') requestId: string) {
    return this.getAdminCareChatRequestUseCase
      .execute({ requestId })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch('requests/:id/decision')
  @ApiOperation({ summary: 'Approve or reject a care chat request' })
  @ApiBody({ type: DecideCareChatRequestDto })
  @ApiResponse({ status: 200, type: CareChatDecisionSuccessResponseDto })
  decideRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() body: DecideCareChatRequestDto,
  ) {
    return this.decideCareChatRequestUseCase
      .execute({
        userId: currentUser.id,
        requestId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch('requests/:id/revoke')
  @ApiOperation({ summary: 'Revoke previously approved care chat request' })
  @ApiBody({ type: RevokeCareChatRequestDto })
  @ApiResponse({ status: 200, type: AdminCareChatRequestItemSuccessResponseDto })
  revokeRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') requestId: string,
    @Body() body: RevokeCareChatRequestDto,
  ) {
    return this.revokeCareChatRequestUseCase
      .execute({
        userId: currentUser.id,
        requestId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get care chat conversation details for admin/support' })
  @ApiResponse({ status: 200, type: CareChatConversationSuccessResponseDto })
  getConversationById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.getCareChatConversationUseCase
      .execute({
        actorType: 'ADMIN',
        userId: currentUser.id,
        conversationId,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
