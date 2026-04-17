import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  CreateGeneralChatConversationDto,
  GeneralChatConversationSuccessResponseDto,
} from '../dto/create-general-chat-conversation.dto';
import { MarkGeneralChatConversationReadDto } from '../dto/mark-general-chat-conversation-read.dto';
import { ReportGeneralChatTargetDto } from '../dto/report-general-chat-target.dto';
import { GeneralChatConversationDetailSuccessResponseDto, GeneralChatConversationListSuccessResponseDto, GeneralChatConversationReadStateSuccessResponseDto, GeneralChatMessageSuccessResponseDto, GeneralChatModerationReportSuccessResponseDto } from '../dto/general-chat-response.dto';
import { ListGeneralChatConversationsDto } from '../dto/list-general-chat-conversations.dto';
import { SendGeneralChatMessageDto } from '../dto/send-general-chat-message.dto';
import { GetMyGeneralChatConversationDetailUseCase } from '../use-cases/get-my-general-chat-conversation-detail.use-case';
import { ListMyGeneralChatConversationsUseCase } from '../use-cases/list-my-general-chat-conversations.use-case';
import { MarkMyGeneralChatConversationReadUseCase } from '../use-cases/mark-my-general-chat-conversation-read.use-case';
import { ReportGeneralChatTargetUseCase } from '../use-cases/report-general-chat-target.use-case';
import { CreateOrGetGeneralChatConversationUseCase } from '../use-cases/create-or-get-general-chat-conversation.use-case';
import { SendGeneralChatMessageUseCase } from '../use-cases/send-general-chat-message.use-case';

@ApiTags('General Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('chat/conversations')
export class GeneralChatConversationsController {
  constructor(
    private readonly createOrGetGeneralChatConversationUseCase: CreateOrGetGeneralChatConversationUseCase,
    private readonly listMyGeneralChatConversationsUseCase: ListMyGeneralChatConversationsUseCase,
    private readonly getMyGeneralChatConversationDetailUseCase: GetMyGeneralChatConversationDetailUseCase,
    private readonly sendGeneralChatMessageUseCase: SendGeneralChatMessageUseCase,
    private readonly markMyGeneralChatConversationReadUseCase: MarkMyGeneralChatConversationReadUseCase,
    private readonly reportGeneralChatTargetUseCase: ReportGeneralChatTargetUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List my owned general chat conversations',
    description:
      'Returns participant-scoped general chat conversations only, ordered deterministically for frontend list rendering.',
  })
  @ApiResponse({ status: 200, type: GeneralChatConversationListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'The authenticated session is not allowed to access this route',
  })
  listMyConversations(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: ListGeneralChatConversationsDto,
  ) {
    return this.listMyGeneralChatConversationsUseCase.execute({
      authenticatedUser,
      query,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get my general chat conversation detail',
    description:
      'Returns one participant-scoped general chat conversation detail with safe latest-message projection and empty-state behavior when no messages exist.',
  })
  @ApiResponse({ status: 200, type: GeneralChatConversationDetailSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only conversation participants can read conversation detail',
  })
  detail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.getMyGeneralChatConversationDetailUseCase.execute({
      authenticatedUser,
      conversationId,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Create or get deterministic general chat conversation',
    description:
      'Creates a bounded non-support/non-care conversation for an allowed patient-practitioner pair, or returns the existing one for the same scope.',
  })
  @ApiResponse({ status: 201, type: GeneralChatConversationSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Actor role/pair is not allowed for General Chat or boundary policy was violated',
  })
  createOrGet(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: CreateGeneralChatConversationDto,
  ) {
    return this.createOrGetGeneralChatConversationUseCase.execute({
      authenticatedUser,
      dto,
    });
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Send message in owned general chat conversation',
    description:
      'Persists one text message with optional metadata-only attachment refs into an owned General Chat conversation.',
  })
  @ApiResponse({ status: 201, type: GeneralChatMessageSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active participants can send into a conversation',
  })
  sendMessage(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: SendGeneralChatMessageDto,
  ) {
    return this.sendGeneralChatMessageUseCase.execute({
      authenticatedUser,
      conversationId,
      dto,
    });
  }

  @Post(':id/read')
  @ApiOperation({
    summary: 'Mark my general chat conversation as read',
    description:
      'Advances participant read cursor deterministically for one owned General Chat conversation. Repeated calls are idempotent when no newer messages exist.',
  })
  @ApiParam({
    name: 'id',
    description: 'General Chat conversation ID',
  })
  @ApiResponse({
    status: 201,
    type: GeneralChatConversationReadStateSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active participants can mark conversation as read',
  })
  markRead(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: MarkGeneralChatConversationReadDto,
  ) {
    return this.markMyGeneralChatConversationReadUseCase.execute({
      authenticatedUser,
      conversationId,
      dto,
    });
  }

  @Post(':id/report')
  @ApiOperation({
    summary: 'Report owned general chat conversation',
    description:
      'Creates a moderation report for one accessible General Chat conversation using existing moderation intake foundations.',
  })
  @ApiResponse({
    status: 201,
    type: GeneralChatModerationReportSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active participants can report this conversation',
  })
  reportConversation(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: ReportGeneralChatTargetDto,
  ) {
    return this.reportGeneralChatTargetUseCase.reportConversation({
      authenticatedUser,
      conversationId,
      dto,
    });
  }

  @Post(':id/messages/:messageId/report')
  @ApiOperation({
    summary: 'Report owned general chat message',
    description:
      'Creates a moderation report for one accessible General Chat message using existing moderation intake foundations.',
  })
  @ApiResponse({
    status: 201,
    type: GeneralChatModerationReportSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active participants can report this message',
  })
  reportMessage(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReportGeneralChatTargetDto,
  ) {
    return this.reportGeneralChatTargetUseCase.reportMessage({
      authenticatedUser,
      conversationId,
      messageId,
      dto,
    });
  }
}
