import { BadRequestException, Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { JwtRefreshAuthGuard } from '@common/guards/authentication/jwt-refresh-auth.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { PatientEmailPasswordLoginDto } from '../dto/patient-email-password-login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LoginTraineeWithEmailPasswordUseCase } from '../use-cases/login-trainee-with-email-password.use-case';
import { RefreshTraineeTokenUseCase } from '../use-cases/refresh-trainee-token.use-case';
import { LogoutTraineeUseCase } from '../use-cases/logout-trainee.use-case';
import { getRequestDeviceContext } from '../utils/request-device-context.util';

@ApiTags('Auth - Trainee')
@Controller('auth/trainee')
export class TraineeAuthController {
  constructor(
    private readonly loginUseCase: LoginTraineeWithEmailPasswordUseCase,
    private readonly refreshUseCase: RefreshTraineeTokenUseCase,
    private readonly logoutUseCase: LogoutTraineeUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login a trainee with email and password' })
  @ApiBody({ type: PatientEmailPasswordLoginDto })
  async login(@Body() dto: PatientEmailPasswordLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.loginUseCase.execute({ email: dto.email, password: dto.password, deviceContext: getRequestDeviceContext(request, dto.deviceId), ipAddress: request.ip ?? null, userAgent: request.headers['user-agent'] ?? null });
    this.setRefreshCookie(response, result.tokens.refreshToken, result.tokens.refreshTokenExpiresAt);
    return result;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(200)
  @ApiBearerAuth()
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    const refreshToken = dto.refreshToken ?? request.authToken;
    if (!refreshToken) throw new BadRequestException({ messageKey: 'auth.errors.refreshTokenRequired', error: 'REFRESH_TOKEN_REQUIRED' });
    const result = await this.refreshUseCase.execute({ refreshToken, deviceContext: getRequestDeviceContext(request, dto.deviceId) });
    this.setRefreshCookie(response, result.tokens.refreshToken, result.tokens.refreshTokenExpiresAt);
    return result;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.logoutUseCase.execute(request.user!.sessionId!);
    response.clearCookie('sawiyaa_refresh_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    return { message: 'Trainee logged out' };
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie('sawiyaa_refresh_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: Math.max(0, expiresAt.getTime() - Date.now()) });
  }
}
