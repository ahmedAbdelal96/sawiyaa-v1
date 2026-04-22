import { Controller, Param, Post, UseGuards } from '@nestjs/common';
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
import { GeneralChatConversationSuccessResponseDto } from '../dto/create-general-chat-conversation.dto';
import { OpenSessionGeneralChatUseCase } from '../use-cases/open-session-general-chat.use-case';

@ApiTags('General Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('chat/sessions')
export class GeneralChatSessionController {
  constructor(
    private readonly openSessionGeneralChatUseCase: OpenSessionGeneralChatUseCase,
  ) {}

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
  ) {
    return this.openSessionGeneralChatUseCase.execute({
      authenticatedUser,
      sessionId,
    });
  }
}
