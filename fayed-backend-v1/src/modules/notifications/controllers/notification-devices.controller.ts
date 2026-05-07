import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  NotificationDeviceRegisterSuccessResponseDto,
  NotificationDeviceRevokeSuccessResponseDto,
  NotificationDevicesListSuccessResponseDto,
  RegisterNotificationDeviceDto,
  RevokeNotificationDeviceDto,
} from '../dto/notification-devices.dto';
import { ListMyNotificationDevicesUseCase } from '../use-cases/list-my-notification-devices.use-case';
import { RegisterNotificationDeviceUseCase } from '../use-cases/register-notification-device.use-case';
import { RevokeNotificationDeviceUseCase } from '../use-cases/revoke-notification-device.use-case';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('notifications/devices')
export class NotificationDevicesController {
  constructor(
    private readonly registerNotificationDeviceUseCase: RegisterNotificationDeviceUseCase,
    private readonly revokeNotificationDeviceUseCase: RevokeNotificationDeviceUseCase,
    private readonly listMyNotificationDevicesUseCase: ListMyNotificationDevicesUseCase,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register or update a mobile notification device',
    description:
      'Idempotently links the current authenticated user and role to a mobile push-capable device token without exposing the raw token back to clients.',
  })
  @ApiResponse({
    status: 200,
    type: NotificationDeviceRegisterSuccessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Device payload is invalid' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'The authenticated session cannot register the requested role',
  })
  async register(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: RegisterNotificationDeviceDto,
  ) {
    const data = await this.registerNotificationDeviceUseCase.execute({
      authenticatedUser,
      dto,
    });

    return {
      success: true as const,
      data,
    };
  }

  @Post('revoke')
  @ApiOperation({
    summary: 'Disable one of my notification devices',
    description:
      'Best-effort revocation for the current authenticated user device by token and/or device id without leaking ownership of other user devices.',
  })
  @ApiResponse({
    status: 200,
    type: NotificationDeviceRevokeSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'At least one device selector is required',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  async revoke(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: RevokeNotificationDeviceDto,
  ) {
    const data = await this.revokeNotificationDeviceUseCase.execute({
      authenticatedUser,
      dto,
    });

    return {
      success: true as const,
      data,
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'List my registered notification devices',
    description:
      'Returns the current authenticated user mobile notification devices without exposing raw provider tokens.',
  })
  @ApiResponse({ status: 200, type: NotificationDevicesListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  async me(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    const data =
      await this.listMyNotificationDevicesUseCase.execute(authenticatedUser);

    return {
      success: true as const,
      data,
    };
  }
}
