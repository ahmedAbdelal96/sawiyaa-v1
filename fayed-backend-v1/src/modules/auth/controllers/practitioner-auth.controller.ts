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
import { Public } from '@common/decorators/public.decorator';
import { ThrottlePolicy } from '@common/decorators/throttle-policy.decorator';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import {
  AuthSuccessEnvelopeResponseDto,
  MessageEnvelopeResponseDto,
  OtpChallengeEnvelopeResponseDto,
  PractitionerRegistrationEnvelopeResponseDto,
} from '../dto/auth-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { PractitionerLoginDto } from '../dto/practitioner-login.dto';
import { PractitionerRegisterDto } from '../dto/practitioner-register.dto';
import { PractitionerVerifyOtpDto } from '../dto/practitioner-verify-otp.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { LoginPractitionerPasswordUseCase } from '../use-cases/login-practitioner-password.use-case';
import { LogoutPractitionerUseCase } from '../use-cases/logout-practitioner.use-case';
import { RefreshPractitionerTokenUseCase } from '../use-cases/refresh-practitioner-token.use-case';
import { RegisterPractitionerAccountUseCase } from '../use-cases/register-practitioner-account.use-case';
import { RequestPractitionerPasswordResetUseCase } from '../use-cases/request-practitioner-password-reset.use-case';
import { ResetPractitionerPasswordUseCase } from '../use-cases/reset-practitioner-password.use-case';
import { VerifyPractitionerLoginOtpUseCase } from '../use-cases/verify-practitioner-login-otp.use-case';
import { getRequestDeviceContext } from '../utils/request-device-context.util';

@ApiTags('Auth - Practitioner')
@Controller('auth/practitioner')
export class PractitionerAuthController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly registerPractitionerAccountUseCase: RegisterPractitionerAccountUseCase,
    private readonly loginPractitionerPasswordUseCase: LoginPractitionerPasswordUseCase,
    private readonly verifyPractitionerLoginOtpUseCase: VerifyPractitionerLoginOtpUseCase,
    private readonly refreshPractitionerTokenUseCase: RefreshPractitionerTokenUseCase,
    private readonly logoutPractitionerUseCase: LogoutPractitionerUseCase,
    private readonly requestPractitionerPasswordResetUseCase: RequestPractitionerPasswordResetUseCase,
    private readonly resetPractitionerPasswordUseCase: ResetPractitionerPasswordUseCase,
  ) {}

  /** Registration creates only the practitioner auth/account baseline and defers onboarding to the dedicated modules. */
  @Public()
  @Post('register')
  @ThrottlePolicy('auth-practitioner-register')
  @ApiOperation({
    summary: 'Register a practitioner account with email and password',
  })
  @ApiBody({ type: PractitionerRegisterDto })
  @ApiResponse({ status: 201, type: PractitionerRegistrationEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({
    description: 'Registration is not allowed for this account state',
  })
  async register(
    @Body() dto: PractitionerRegisterDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.registerPractitionerAccountUseCase.execute({
      email: dto.email,
      otpEmail: dto.otpEmail,
      password: dto.password,
      displayName: dto.displayName,
      practitionerType: dto.practitionerType,
      professionalTitle: dto.professionalTitle,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience,
      countryCode: dto.countryCode,
      primarySpecialtyCategoryId: dto.primarySpecialtyCategoryId,
      specialtyIds: dto.specialtyIds,
      initialCredential: dto.initialCredential,
    });

    return {
      message: this.i18nService.t(
        'auth.success.practitionerRegistered',
        locale,
      ),
      ...result,
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
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.loginPractitionerPasswordUseCase.execute({
      email: dto.email,
      password: dto.password,
      locale,
    });

    return {
      message: this.i18nService.t('auth.success.practitionerOtpSent', locale),
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
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.verifyPractitionerLoginOtpUseCase.execute({
      challengeId: dto.challengeId,
      code: dto.code,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
      locale,
    });

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
    @CurrentLocale() locale: SupportedLocale,
  ) {
    await this.logoutPractitionerUseCase.execute(request.user!.sessionId!);
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
}
