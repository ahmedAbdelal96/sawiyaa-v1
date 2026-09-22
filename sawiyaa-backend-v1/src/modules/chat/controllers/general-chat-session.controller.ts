import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GeneralChatConversationSuccessResponseDto } from '../dto/create-general-chat-conversation.dto';
import { OpenSessionGeneralChatUseCase } from '../use-cases/open-session-general-chat.use-case';
import { GetSessionGeneralChatConversationUseCase } from '../use-cases/get-session-general-chat-conversation.use-case';
import { SessionChatConversationSuccessResponseDto } from '../dto/general-chat-response.dto';

@ApiTags('General Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('chat/sessions')
export class GeneralChatSessionController {
  constructor(
    private readonly openSessionGeneralChatUseCase: OpenSessionGeneralChatUseCase,
    private readonly getSessionGeneralChatConversationUseCase: GetSessionGeneralChatConversationUseCase,
  ) {}

  @Get(':sessionId/conversation')
  @ApiOperation({
    summary: 'Read a session-linked chat without opening or creating it',
    description:
      'Returns the existing session conversation and current read/send capability. Historical reads remain available to legitimate participants outside the send window.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({
    status: 200,
    type: SessionChatConversationSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only session participants may read this chat',
  })
  conversation(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getSessionGeneralChatConversationUseCase.execute({
      authenticatedUser,
      sessionId,
      locale,
    });
  }

  @Post(':sessionId/open')
  @ApiOperation({
    summary:
      'Open deterministic chat for a session (patient-practitioner only)',
    description:
      'Returns (or creates) the deterministic General Chat conversation linked to one session, allowing one-click access from the session UI.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({ status: 201, type: GeneralChatConversationSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only session participants may open this chat, and only after the session has started.',
  })
  open(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.openSessionGeneralChatUseCase.execute({
      authenticatedUser,
      sessionId,
      locale,
    });
  }
}
