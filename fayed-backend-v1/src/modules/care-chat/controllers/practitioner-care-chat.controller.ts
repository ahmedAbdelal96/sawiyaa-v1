import {
  Body,
  Controller,
  Get,
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
import {
  CareChatConversationSuccessResponseDto,
  CareChatMessageSuccessResponseDto,
  CareChatRequestItemSuccessResponseDto,
  CareChatRequestListSuccessResponseDto,
} from '../dto/care-chat-response.dto';
import { ListCareChatRequestsDto } from '../dto/list-care-chat-requests.dto';
import { SendCareChatMessageDto } from '../dto/send-care-chat-message.dto';
import { GetCareChatConversationUseCase } from '../use-cases/get-care-chat-conversation.use-case';
import { GetMyCareChatRequestUseCase } from '../use-cases/get-my-care-chat-request.use-case';
import { ListMyCareChatRequestsUseCase } from '../use-cases/list-my-care-chat-requests.use-case';
import { SendCareChatMessageUseCase } from '../use-cases/send-care-chat-message.use-case';

@ApiTags('Care Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/care-chat')
export class PractitionerCareChatController {
  constructor(
    private readonly listMyCareChatRequestsUseCase: ListMyCareChatRequestsUseCase,
    private readonly getMyCareChatRequestUseCase: GetMyCareChatRequestUseCase,
    private readonly getCareChatConversationUseCase: GetCareChatConversationUseCase,
    private readonly sendCareChatMessageUseCase: SendCareChatMessageUseCase,
  ) {}

  @Get('requests')
  @ApiOperation({ summary: 'List practitioner-owned care chat requests' })
  @ApiResponse({ status: 200, type: CareChatRequestListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts can access this route',
  })
  listRequests(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListCareChatRequestsDto,
  ) {
    return this.listMyCareChatRequestsUseCase
      .execute({
        actorType: 'PRACTITIONER',
        userId: currentUser.id,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get one practitioner-owned care chat request' })
  @ApiResponse({ status: 200, type: CareChatRequestItemSuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Care chat request was not found' })
  getRequestById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    return this.getMyCareChatRequestUseCase
      .execute({
        actorType: 'PRACTITIONER',
        userId: currentUser.id,
        requestId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get one practitioner-owned care chat conversation' })
  @ApiResponse({ status: 200, type: CareChatConversationSuccessResponseDto })
  getConversationById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.getCareChatConversationUseCase
      .execute({
        actorType: 'PRACTITIONER',
        userId: currentUser.id,
        conversationId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send practitioner care chat message' })
  @ApiBody({ type: SendCareChatMessageDto })
  @ApiResponse({ status: 201, type: CareChatMessageSuccessResponseDto })
  sendMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() body: SendCareChatMessageDto,
  ) {
    return this.sendCareChatMessageUseCase
      .execute({
        actorType: 'PRACTITIONER',
        userId: currentUser.id,
        conversationId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
