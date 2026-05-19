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
} from '../dto/auth-response.dto';
import { PatientEmailPasswordLoginDto } from '../dto/patient-email-password-login.dto';
import { PatientEmailPasswordRegisterDto } from '../dto/patient-email-password-register.dto';
import { PatientGoogleAuthDto } from '../dto/patient-google-auth.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { LoginPatientWithEmailPasswordUseCase } from '../use-cases/login-patient-with-email-password.use-case';
import { LogoutPatientUseCase } from '../use-cases/logout-patient.use-case';
import { RefreshPatientTokenUseCase } from '../use-cases/refresh-patient-token.use-case';
import { RegisterPatientWithEmailPasswordUseCase } from '../use-cases/register-patient-with-email-password.use-case';
import { RegisterPatientWithGoogleUseCase } from '../use-cases/register-patient-with-google.use-case';
import { RequestPatientPasswordResetUseCase } from '../use-cases/request-patient-password-reset.use-case';
import { ResetPatientPasswordUseCase } from '../use-cases/reset-patient-password.use-case';
import { getRequestDeviceContext } from '../utils/request-device-context.util';

@ApiTags('Auth - Patient')
@Controller('auth/patient')
export class PatientAuthController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly registerPatientWithGoogleUseCase: RegisterPatientWithGoogleUseCase,
    private readonly registerPatientWithEmailPasswordUseCase: RegisterPatientWithEmailPasswordUseCase,
    private readonly loginPatientWithEmailPasswordUseCase: LoginPatientWithEmailPasswordUseCase,
    private readonly refreshPatientTokenUseCase: RefreshPatientTokenUseCase,
    private readonly logoutPatientUseCase: LogoutPatientUseCase,
    private readonly requestPatientPasswordResetUseCase: RequestPatientPasswordResetUseCase,
    private readonly resetPatientPasswordUseCase: ResetPatientPasswordUseCase,
  ) {}

  /** Google patient auth acts as register-or-login depending on whether the Google identity already exists. */
  @Public()
  @Post('google')
  @HttpCode(200)
  @ThrottlePolicy('auth-patient-google')
  @ApiOperation({ summary: 'Register or login a patient with Google' })
  @ApiBody({ type: PatientGoogleAuthDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid Google token or missing payload claims',
  })
  @ApiForbiddenResponse({ description: 'Account exists but is not active' })
  async authenticateWithGoogle(
    @Body() dto: PatientGoogleAuthDto,
    @Req() request: Request,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.registerPatientWithGoogleUseCase.execute({
      idToken: dto.idToken,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t(
        'auth.success.patientGoogleAuthenticated',
        locale,
      ),
      ...result,
    };
  }

  /** Email/password registration creates the patient account baseline and immediately opens the first session. */
  @Public()
  @Post('register')
  @ThrottlePolicy('auth-patient-register')
  @ApiOperation({ summary: 'Register a patient with email and password' })
  @ApiBody({ type: PatientEmailPasswordRegisterDto })
  @ApiResponse({ status: 201, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({
    description: 'Account state does not allow registration',
  })
  async register(
    @Body() dto: PatientEmailPasswordRegisterDto,
    @Req() request: Request,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.registerPatientWithEmailPasswordUseCase.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t('auth.success.patientRegistered', locale),
      ...result,
    };
  }

  /** Patient login validates password credentials and then uses the shared token/session foundation. */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ThrottlePolicy('auth-patient-login')
  @ApiOperation({ summary: 'Login a patient with email and password' })
  @ApiBody({ type: PatientEmailPasswordLoginDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'Account is not active' })
  async login(
    @Body() dto: PatientEmailPasswordLoginDto,
    @Req() request: Request,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    const result = await this.loginPatientWithEmailPasswordUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t('auth.success.patientLoggedIn', locale),
      ...result,
    };
  }

  /** Refresh rotates the current patient session and should be called with a refresh token bearer token or body token. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(200)
  @ThrottlePolicy('auth-patient-refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh patient access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: AuthSuccessEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Refresh token is missing' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active patient session',
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

    const result = await this.refreshPatientTokenUseCase.execute({
      refreshToken,
      deviceContext: getRequestDeviceContext(request, dto.deviceId),
    });

    return {
      message: this.i18nService.t(
        'auth.success.patientTokensRefreshed',
        locale,
      ),
      ...result,
    };
  }

  /** Logout revokes the current patient session represented by the authenticated refresh token. */
  @UseGuards(JwtRefreshAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout the current patient session' })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({
    description: 'Refresh token does not match the active patient session',
  })
  async logout(
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    await this.logoutPatientUseCase.execute(request.user!.sessionId!);
    return {
      message: this.i18nService.t('auth.success.patientLoggedOut', locale),
    };
  }

  /** Forgot-password never reveals whether the patient account exists; it only queues a reset challenge when safe. */
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ThrottlePolicy('auth-patient-forgot-password')
  @ApiOperation({ summary: 'Request a patient password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, type: MessageEnvelopeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.requestPatientPasswordResetUseCase.execute({
      email: dto.email,
      locale,
    });
  }

  /** Reset-password consumes a reset OTP and rotates the patient password hash. */
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ThrottlePolicy('auth-patient-reset-password')
  @ApiOperation({ summary: 'Reset a patient password using an OTP code' })
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
    return this.resetPatientPasswordUseCase.execute({
      email: dto.email,
      code: dto.code,
      newPassword: dto.newPassword,
      locale,
    });
  }
}
