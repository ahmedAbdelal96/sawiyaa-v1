import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
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
import {
  PatchMySettingsPreferencesDto,
  PutMyNotificationPreferencesDto,
  SettingsNotificationPreferencesItemSuccessResponseDto,
  SettingsPreferencesItemSuccessResponseDto,
  SettingsReadSuccessResponseDto,
} from '../dto/settings.dto';
import { GetMySettingsNotificationPreferencesUseCase } from '../use-cases/get-my-settings-notification-preferences.use-case';
import { GetMySettingsUseCase } from '../use-cases/get-my-settings.use-case';
import { UpdateMySettingsNotificationPreferencesUseCase } from '../use-cases/update-my-settings-notification-preferences.use-case';
import { UpdateMySettingsPreferencesUseCase } from '../use-cases/update-my-settings-preferences.use-case';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('settings/me')
export class MySettingsController {
  constructor(
    private readonly getMySettingsUseCase: GetMySettingsUseCase,
    private readonly updateMySettingsPreferencesUseCase: UpdateMySettingsPreferencesUseCase,
    private readonly getMySettingsNotificationPreferencesUseCase: GetMySettingsNotificationPreferencesUseCase,
    private readonly updateMySettingsNotificationPreferencesUseCase: UpdateMySettingsNotificationPreferencesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get my settings baseline',
    description:
      'Returns a contract-first settings baseline (preferences, notification-preferences read model, and ownership boundaries).',
  })
  @ApiResponse({ status: 200, type: SettingsReadSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  getMySettings(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    return this.getMySettingsUseCase.execute(authenticatedUser);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Validate and normalize my settings preference candidates',
    description:
      'Slice 1 is contract-first: payload is validated and normalized for locale/timezone, while persistence lands in later slices.',
  })
  @ApiResponse({ status: 200, type: SettingsPreferencesItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  patchMyPreferences(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: PatchMySettingsPreferencesDto,
  ) {
    return this.updateMySettingsPreferencesUseCase.execute({
      authenticatedUser,
      dto,
    });
  }

  @Get('notification-preferences')
  @ApiOperation({
    summary: 'Get my notification preference baseline',
    description:
      'Returns deterministic user notification-preference read shape with supported channels and persistence-state hint.',
  })
  @ApiResponse({
    status: 200,
    type: SettingsNotificationPreferencesItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  getMyNotificationPreferences(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ) {
    return this.getMySettingsNotificationPreferencesUseCase.execute(
      authenticatedUser,
    );
  }

  @Put('notification-preferences')
  @ApiOperation({
    summary: 'Validate and normalize notification preference candidates',
    description:
      'Slice 1 keeps this endpoint contract-first: accepted entries are validated, normalized, and returned without persistence.',
  })
  @ApiResponse({
    status: 200,
    type: SettingsNotificationPreferencesItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  putMyNotificationPreferences(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() dto: PutMyNotificationPreferencesDto,
  ) {
    return this.updateMySettingsNotificationPreferencesUseCase.execute({
      authenticatedUser,
      dto,
    });
  }
}
