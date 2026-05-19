import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { JwtRefreshAuthGuard } from '@common/guards/authentication/jwt-refresh-auth.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { ThrottlePolicy } from '@common/decorators/throttle-policy.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminStepUpVerifyDto } from '../dto/admin-step-up-verify.dto';
import {
  AuthSuccessEnvelopeResponseDto,
  MessageEnvelopeResponseDto,
} from '../dto/auth-response.dto';
import { StepUpVerifiedEnvelopeResponseDto } from '../dto/step-up-verified-response.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginAdminUseCase } from '../use-cases/login-admin.use-case';
import { LogoutAdminUseCase } from '../use-cases/logout-admin.use-case';
import { RefreshAdminTokenUseCase } from '../use-cases/refresh-admin-token.use-case';
import { VerifyAdminStepUpUseCase } from '../use-cases/verify-admin-step-up.use-case';
import { getRequestDeviceContext } from '../utils/request-device-context.util';

@ApiTags('Auth - Admin')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly loginAdminUseCase: LoginAdminUseCase,
    private readonly refreshAdminTokenUseCase: RefreshAdminTokenUseCase,
    private readonly logoutAdminUseCase: LogoutAdminUseCase,
    private readonly verifyAdminStepUpUseCase: VerifyAdminStepUpUseCase,
  ) {}

  /** Admin login is baseline-only and limited to pre-existing admin accounts. */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ThrottlePolicy('auth-admin-login')
  @ApiOperation({ summary: 'Login an admin account' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({
    description: 'Admin role is required or account is inactive',
  })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() request: Request,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.loginAdminUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t('auth.success.adminLoggedIn', locale),
      ...result,
    };
  }

  /** Admin refresh rotates the current admin or super-admin session. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(200)
  @ThrottlePolicy('auth-admin-refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh admin access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Refresh token is missing' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active admin session',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const refreshToken = dto.refreshToken ?? request.authToken;

    if (!refreshToken) {
      throw new BadRequestException({
        messageKey: 'auth.errors.refreshTokenRequired',
        error: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const result = await this.refreshAdminTokenUseCase.execute({
      refreshToken,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t('auth.success.adminTokensRefreshed', locale),
      ...result,
    };
  }

  /** Admin logout revokes only the current session. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout the current admin session' })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active admin session',
  })
  async logout(
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    await this.logoutAdminUseCase.execute(request.user!.sessionId!);
    return {
      message: this.i18nService.t('auth.success.adminLoggedOut', locale),
    };
  }

  /** Step-up verification for sensitive admin actions (password re-auth). */
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles(
    AppRole.SUPER_ADMIN,
    AppRole.ADMIN,
    AppRole.FINANCE_STAFF,
    AppRole.MARKETING_STAFF,
    AppRole.PRACTITIONER_REVIEWER,
    AppRole.PATIENT_OPERATIONS,
    AppRole.SUPPORT_AGENT,
    AppRole.CONTENT_REVIEWER,
  )
  @Post('step-up/verify')
  @HttpCode(200)
  @ThrottlePolicy('auth-admin-step-up-verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify step-up for sensitive admin actions' })
  @ApiBody({ type: AdminStepUpVerifyDto })
  @ApiResponse({ status: 200, type: StepUpVerifiedEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async verifyStepUp(
    @Body() dto: AdminStepUpVerifyDto,
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.verifyAdminStepUpUseCase.execute({
      userId: request.user!.id,
      sessionId: request.user!.sessionId!,
      password: dto.password,
      actorRoles: request.user!.roles,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      correlationId: request.requestId ?? null,
    });

    return {
      message: this.i18nService.t('auth.success.adminStepUpVerified', locale),
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
