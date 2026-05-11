import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CurrentUserRolesEnvelopeResponseDto } from '../dto/current-user-roles-response.dto';
import { CurrentUserProfileLinksEnvelopeResponseDto } from '../dto/current-user-profile-links-response.dto';
import { CurrentUserSecurityStateEnvelopeResponseDto } from '../dto/current-user-security-state-response.dto';
import { CurrentUserSummaryEnvelopeResponseDto } from '../dto/current-user-summary-response.dto';
import { PatchCurrentUserProfileDto } from '../dto/patch-current-user-profile.dto';
import { GetCurrentUserProfileLinksUseCase } from '../use-cases/get-current-user-profile-links.use-case';
import { GetCurrentUserSecurityStateUseCase } from '../use-cases/get-current-user-security-state.use-case';
import { GetCurrentUserSummaryUseCase } from '../use-cases/get-current-user-summary.use-case';
import { ListCurrentUserRolesUseCase } from '../use-cases/list-current-user-roles.use-case';
import { PatchCurrentUserProfileUseCase } from '../use-cases/patch-current-user-profile.use-case';

/**
 * Users controller exposes authenticated read-only endpoints for the current user.
 * It intentionally avoids auth flow logic and leaves persistence orchestration to dedicated use cases.
 */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('users')
export class CurrentUserController {
  constructor(
    private readonly getCurrentUserSummaryUseCase: GetCurrentUserSummaryUseCase,
    private readonly listCurrentUserRolesUseCase: ListCurrentUserRolesUseCase,
    private readonly getCurrentUserSecurityStateUseCase: GetCurrentUserSecurityStateUseCase,
    private readonly getCurrentUserProfileLinksUseCase: GetCurrentUserProfileLinksUseCase,
    private readonly patchCurrentUserProfileUseCase: PatchCurrentUserProfileUseCase,
  ) {}

  /**
   * /users/me is the primary read model for frontend bootstrapping after auth.
   * We intentionally resolve it from repositories instead of reusing token claims, so account/profile state stays current.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get the current user summary',
    description:
      'Returns a unified read-only summary for the authenticated user, including basics, roles, security state, and linked profile ids.',
  })
  @ApiResponse({ status: 200, type: CurrentUserSummaryEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user record was not found',
  })
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getCurrentUserSummaryUseCase.execute(currentUser);
  }

  /** Role list endpoint stays separate to support small frontend permission checks without fetching the full summary payload. */
  @Get('me/roles')
  @ApiOperation({
    summary: 'List current user roles',
    description:
      'Returns the current user roles and a small role summary tailored for frontend permission switches.',
  })
  @ApiResponse({ status: 200, type: CurrentUserRolesEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user record was not found',
  })
  roles(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.listCurrentUserRolesUseCase.execute(currentUser);
  }

  /** Profile links are exposed independently so clients can bootstrap current patient/practitioner state with a small payload. */
  @Get('me/profile-links')
  @ApiOperation({
    summary: 'Get current user profile links',
    description:
      'Returns the linked patient and practitioner profile ids, plus the practitioner state summary when available.',
  })
  @ApiResponse({
    status: 200,
    type: CurrentUserProfileLinksEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user record was not found',
  })
  profileLinks(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getCurrentUserProfileLinksUseCase.execute(currentUser);
  }

  /**
   * Security state is exposed independently because account banners and gating UI
   * often need this slice without depending on profile-link details.
   */
  @Get('me/security-state')
  @ApiOperation({
    summary: 'Get current user security state',
    description:
      'Returns account status, verification flags, and whether the current practitioner session is an OTP-verified practitioner session.',
  })
  @ApiResponse({
    status: 200,
    type: CurrentUserSecurityStateEnvelopeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user record was not found',
  })
  securityState(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getCurrentUserSecurityStateUseCase.execute(currentUser);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Patch current user profile basics',
    description:
      'Allows the current user to update safe profile basics like display name. Email/phone remain managed by auth/identity flows.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiBadRequestResponse({ description: 'Invalid profile input' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user record was not found',
  })
  patchProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() dto: PatchCurrentUserProfileDto,
  ) {
    return this.patchCurrentUserProfileUseCase.execute({
      userId: currentUser.id,
      locale,
      displayName: dto.displayName,
    });
  }
}
