import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { WebResponseHardeningInterceptor } from '@common/interceptors/web-response-hardening.interceptor';
import { Response } from 'express';
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
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import {
  AuthSuccessEnvelopeResponseDto,
  MessageEnvelopeResponseDto,
  OtpChallengeEnvelopeResponseDto,
  PasswordResetOtpVerifiedEnvelopeResponseDto,
  PractitionerRegistrationEnvelopeResponseDto,
} from '../dto/auth-response.dto';
import { ConfirmPasswordResetDto } from '../dto/confirm-password-reset.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { PractitionerLoginDto } from '../dto/practitioner-login.dto';
import { PractitionerRegisterDto } from '../dto/practitioner-register.dto';
import { PractitionerRegistrationOtpDto } from '../dto/practitioner-registration-otp.dto';
import { PractitionerVerifyOtpDto } from '../dto/practitioner-verify-otp.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyPasswordResetOtpDto } from '../dto/verify-password-reset-otp.dto';
import { ConfirmPractitionerPasswordResetUseCase } from '../use-cases/confirm-practitioner-password-reset.use-case';
import { LoginPractitionerPasswordUseCase } from '../use-cases/login-practitioner-password.use-case';
import { LogoutPractitionerUseCase } from '../use-cases/logout-practitioner.use-case';
import { RefreshPractitionerTokenUseCase } from '../use-cases/refresh-practitioner-token.use-case';
import { RegisterPractitionerAccountUseCase } from '../use-cases/register-practitioner-account.use-case';
import { StartPractitionerRegistrationUseCase } from '../use-cases/start-practitioner-registration.use-case';
import { VerifyPractitionerRegistrationEmailUseCase } from '../use-cases/verify-practitioner-registration-email.use-case';
import { ResendOtpChallengeUseCase } from '../../verification/use-cases/resend-otp-challenge.use-case';
import { OtpChallengeRepository } from '../../verification/repositories/otp-challenge.repository';
import { OtpChannel, OtpPurpose, UserRoleType } from '@prisma/client';
import { RequestPractitionerPasswordResetUseCase } from '../use-cases/request-practitioner-password-reset.use-case';
import { ResetPractitionerPasswordUseCase } from '../use-cases/reset-practitioner-password.use-case';
import { VerifyPractitionerPasswordResetOtpUseCase } from '../use-cases/verify-practitioner-password-reset-otp.use-case';
import { VerifyPractitionerLoginOtpUseCase } from '../use-cases/verify-practitioner-login-otp.use-case';
import { getRequestDeviceContext } from '../utils/request-device-context.util';
import { ChangePasswordUseCase } from '../use-cases/change-password.use-case';

@ApiTags('Auth - Practitioner')
@Controller('auth/practitioner')
@UseInterceptors(WebResponseHardeningInterceptor)
export class PractitionerAuthController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly registerPractitionerAccountUseCase: RegisterPractitionerAccountUseCase,
    private readonly startPractitionerRegistrationUseCase: StartPractitionerRegistrationUseCase,
    private readonly verifyPractitionerRegistrationEmailUseCase: VerifyPractitionerRegistrationEmailUseCase,
    private readonly resendOtpChallengeUseCase: ResendOtpChallengeUseCase,
    private readonly otpChallengeRepository: OtpChallengeRepository,
    private readonly loginPractitionerPasswordUseCase: LoginPractitionerPasswordUseCase,
    private readonly verifyPractitionerLoginOtpUseCase: VerifyPractitionerLoginOtpUseCase,
    private readonly refreshPractitionerTokenUseCase: RefreshPractitionerTokenUseCase,
    private readonly logoutPractitionerUseCase: LogoutPractitionerUseCase,
    private readonly requestPractitionerPasswordResetUseCase: RequestPractitionerPasswordResetUseCase,
    private readonly verifyPractitionerPasswordResetOtpUseCase: VerifyPractitionerPasswordResetOtpUseCase,
    private readonly confirmPractitionerPasswordResetUseCase: ConfirmPractitionerPasswordResetUseCase,
    private readonly resetPractitionerPasswordUseCase: ResetPractitionerPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @UseGuards(JwtAccessAuthGuard)
  @Post('change-password')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated practitioner password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    await this.changePasswordUseCase.execute({
      userId: request.user!.id,
      role: UserRoleType.PRACTITIONER,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });
    return {
      message: this.i18nService.t('auth.success.passwordChanged', locale),
      currentSessionInvalidated: true,
    };
  }

  /** Registration creates only the practitioner auth/account baseline and defers onboarding to the dedicated modules. */
  @Public()
  @Post('register')
  @ThrottlePolicy('auth-practitioner-register')
  @ApiOperation({
    summary: 'Register a practitioner account with email and password',
  })
  @ApiBody({ type: PractitionerRegisterDto })
  @ApiResponse({
    status: 201,
    type: PractitionerRegistrationEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({
    description: 'Registration is not allowed for this account state',
  })
  async register(
    @Body() dto: PractitionerRegisterDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.startPractitionerRegistrationUseCase.execute({
      email: dto.email,
      phone: dto.phone,
      phoneCountryCode: dto.phoneCountryCode,
      password: dto.password,
      displayName: dto.displayName,
      locale,
    });

    return {
      message: this.i18nService.t('auth.success.practitionerOtpSent', locale),
      ...result,
    };
  }

  @Public()
  @Post('register/verify-otp')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-otp-verify')
  async verifyRegistrationOtp(
    @Body() dto: PractitionerRegistrationOtpDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result =
      await this.verifyPractitionerRegistrationEmailUseCase.execute({
        ...dto,
        locale,
      });
    return {
      message: this.i18nService.t(
        'auth.success.practitionerRegistered',
        locale,
      ),
      ...result,
    };
  }

  @Public()
  @Post('register/resend-otp')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-otp-verify')
  async resendRegistrationOtp(
    @Body() dto: Pick<PractitionerRegistrationOtpDto, 'challengeId'>,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const current = await this.otpChallengeRepository.findById(dto.challengeId);
    if (
      !current ||
      current.purpose !== OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION
    ) {
      throw new BadRequestException({
        messageKey: 'auth.errors.otpChallengeInvalid',
        error: 'OTP_CHALLENGE_INVALID',
      });
    }
    const result = await this.resendOtpChallengeUseCase.execute({
      userId: null,
      purpose: current.purpose,
      channel: OtpChannel.EMAIL,
      target: current.target,
      locale,
      metadata:
        current.metadata &&
        typeof current.metadata === 'object' &&
        !Array.isArray(current.metadata)
          ? (current.metadata as Record<string, unknown>)
          : undefined,
    });
    return {
      message: this.i18nService.t('auth.success.practitionerOtpSent', locale),
      challengeId: result.challengeId,
      channel: result.channel,
      maskedTarget: result.maskedTarget,
      expiresAt: result.expiresAt,
      requiresOtpVerification: true,
      nextStep: 'OTP_REQUIRED' as const,
    };
  }

  @Public()
  @Post('login/resend-otp')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-otp-verify')
  @ApiOperation({ summary: 'Resend the pending practitioner login OTP' })
  async resendLoginOtp(
    @Body() dto: Pick<PractitionerVerifyOtpDto, 'challengeId'>,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const current = await this.otpChallengeRepository.findActiveById(
      dto.challengeId,
    );
    const isPractitioner = current?.user?.roles.some(
      (role) => role.role === UserRoleType.PRACTITIONER,
    );
    if (
      !current ||
      current.purpose !== OtpPurpose.PRACTITIONER_LOGIN ||
      !current.userId ||
      !isPractitioner
    ) {
      throw new BadRequestException({
        messageKey: 'auth.errors.otpChallengeInvalid',
        error: 'OTP_CHALLENGE_INVALID',
      });
    }

    const result = await this.resendOtpChallengeUseCase.execute({
      userId: current.userId,
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: current.channel,
      target: current.target,
      locale,
    });
    return {
      message: this.i18nService.t('auth.success.practitionerOtpSent', locale),
      challengeId: result.challengeId,
      channel: result.channel,
      maskedTarget: result.maskedTarget,
      expiresAt: result.expiresAt,
      resendAvailableAt: result.resendAvailableAt,
      requiresOtpVerification: true,
      nextStep: 'OTP_REQUIRED' as const,
    };
  }

  /** Password login step proves the credential, then creates a short-lived OTP challenge instead of issuing tokens immediately. */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-login')
  @ApiOperation({
    summary:
      'Start practitioner login with password and receive an OTP challenge',
  })
  @ApiBody({ type: PractitionerLoginDto })
  @ApiResponse({ status: 200, type: OtpChallengeEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({ description: 'No verified OTP channel is available' })
  async login(
    @Body() dto: PractitionerLoginDto,
    @Req() request: Request,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.loginPractitionerPasswordUseCase.execute({
      email: dto.email,
      password: dto.password,
      locale,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    return {
      message: this.i18nService.t(
        result.nextStep === 'AUTHENTICATED'
          ? 'auth.success.practitionerOtpVerified'
          : 'auth.success.practitionerOtpSent',
        locale,
      ),
      ...result,
    };
  }

  /** OTP verification is the step that actually turns practitioner login into a fully authenticated session. */
  @Public()
  @Post('login/verify-otp')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-otp-verify')
  @ApiOperation({ summary: 'Verify practitioner login OTP and issue tokens' })
  @ApiBody({ type: PractitionerVerifyOtpDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({
    description: 'OTP challenge is invalid or expired',
  })
  @ApiForbiddenResponse({ description: 'OTP code is invalid' })
  async verifyOtp(
    @Body() dto: PractitionerVerifyOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.verifyPractitionerLoginOtpUseCase.execute({
      challengeId: dto.challengeId,
      code: dto.code,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
      locale,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    if (result.tokens?.refreshToken) {
      res.cookie('sawiyaa_refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.max(
          0,
          result.tokens.refreshTokenExpiresAt.getTime() - Date.now(),
        ),
      });
    }

    return {
      message: this.i18nService.t(
        'auth.success.practitionerOtpVerified',
        locale,
      ),
      ...result,
    };
  }

  /** Refresh rotates the current practitioner session using a refresh token. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh practitioner access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Refresh token is missing' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active practitioner session',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const refreshToken = dto.refreshToken ?? request.authToken;

    if (!refreshToken) {
      throw new BadRequestException({
        messageKey: 'auth.errors.refreshTokenRequired',
        error: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const result = await this.refreshPractitionerTokenUseCase.execute({
      refreshToken,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    if (result.tokens?.refreshToken) {
      res.cookie('sawiyaa_refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.max(
          0,
          result.tokens.refreshTokenExpiresAt.getTime() - Date.now(),
        ),
      });
    }

    return {
      message: this.i18nService.t(
        'auth.success.practitionerTokensRefreshed',
        locale,
      ),
      ...result,
    };
  }

  /** Logout revokes the current practitioner session only. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout the current practitioner session' })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active practitioner session',
  })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    await this.logoutPractitionerUseCase.execute(request.user!.sessionId!);
    res.clearCookie('sawiyaa_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return {
      message: this.i18nService.t('auth.success.practitionerLoggedOut', locale),
    };
  }

  /** Forgot-password never reveals whether the practitioner account exists; it only queues a reset challenge when safe. */
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-forgot-password')
  @ApiOperation({ summary: 'Request a practitioner password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.requestPractitionerPasswordResetUseCase.execute({
      email: dto.email,
      locale,
    });
  }

  @Public()
  @Post('verify-password-reset-otp')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-verify-password-reset-otp')
  @ApiOperation({
    summary: 'Verify practitioner password reset OTP and issue reset token',
  })
  @ApiBody({ type: VerifyPasswordResetOtpDto })
  @ApiResponse({
    status: 200,
    type: PasswordResetOtpVerifiedEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({
    description: 'OTP challenge is invalid or expired',
  })
  @ApiForbiddenResponse({ description: 'OTP code is invalid' })
  async verifyPasswordResetOtp(
    @Body() dto: VerifyPasswordResetOtpDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.verifyPractitionerPasswordResetOtpUseCase.execute(
      {
        email: dto.email,
        code: dto.code,
        locale,
      },
    );
    this.setPasswordResetCookie(res, result.resetToken, result.expiresAt);
    const { resetToken: _resetToken, ...safeResult } = result;
    return safeResult;
  }

  @Public()
  @Post('confirm-password-reset')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-confirm-password-reset')
  @ApiOperation({
    summary: 'Confirm practitioner password reset using reset token',
  })
  @ApiBody({ type: ConfirmPasswordResetDto })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Reset token is invalid or expired' })
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.confirmPractitionerPasswordResetUseCase.execute({
      resetToken: this.readPasswordResetCookie(request),
      newPassword: dto.newPassword,
      locale,
      deviceContext: getRequestDeviceContext(request),
    });
    res.cookie('sawiyaa_refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.max(
        0,
        result.tokens.refreshTokenExpiresAt.getTime() - Date.now(),
      ),
    });
    this.clearPasswordResetCookie(res);
    return result;
  }

  /** Reset-password consumes a reset OTP and rotates the practitioner password hash. */
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ThrottlePolicy('auth-practitioner-reset-password')
  @ApiOperation({ summary: 'Reset a practitioner password using an OTP code' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({
    description: 'OTP challenge is invalid or expired',
  })
  @ApiForbiddenResponse({
    description: 'Reset flow is not allowed for the resolved account',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.resetPractitionerPasswordUseCase.execute({
      email: dto.email,
      code: dto.code,
      newPassword: dto.newPassword,
      locale,
    });
  }

  private setPasswordResetCookie(
    res: Response,
    token: string,
    expiresAt: string,
  ) {
    res.cookie('sawiyaa_password_reset', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/practitioner',
      expires: new Date(expiresAt),
    });
  }

  private clearPasswordResetCookie(res: Response) {
    res.clearCookie('sawiyaa_password_reset', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/practitioner',
    });
  }

  private readPasswordResetCookie(request: Request): string {
    return (
      (request as Request & { cookies?: Record<string, string> }).cookies
        ?.sawiyaa_password_reset ?? ''
    );
  }
}
