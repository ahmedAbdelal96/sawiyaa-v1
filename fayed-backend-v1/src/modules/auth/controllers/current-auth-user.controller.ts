import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentAuthUserEnvelopeResponseDto } from '../dto/auth-response.dto';
import { GetCurrentAuthUserUseCase } from '../use-cases/get-current-auth-user.use-case';

@ApiTags('Auth')
@Controller('auth')
export class CurrentAuthUserController {
  constructor(
    private readonly getCurrentAuthUserUseCase: GetCurrentAuthUserUseCase,
  ) {}

  /** /auth/me exposes the active auth/session context, not the richer product-facing user summary. */
  @UseGuards(JwtAccessAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current authenticated auth/session context',
    description:
      'Returns the normalized current session context such as auth method, session id, verification flags, and auth-facing role state.',
  })
  @ApiResponse({ status: 200, type: CurrentAuthUserEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getCurrentAuthUserUseCase.execute(currentUser);
  }
}
