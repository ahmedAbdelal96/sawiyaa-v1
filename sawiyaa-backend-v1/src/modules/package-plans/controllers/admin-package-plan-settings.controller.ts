import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  PackagePlanSettingsSuccessResponseDto,
  PackagePlanSettingsUpdateSuccessResponseDto,
  UpdatePackagePlanSettingsDto,
} from '../dto/admin-package-plan-settings.dto';
import { GetPackagePlanSettingsUseCase } from '../use-cases/get-package-plan-settings.use-case';
import { UpdatePackagePlanSettingsUseCase } from '../use-cases/update-package-plan-settings.use-case';

@ApiTags('Admin - Package Plan Settings')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/package-plans/settings')
export class AdminPackagePlanSettingsController {
  constructor(
    private readonly getPackagePlanSettingsUseCase: GetPackagePlanSettingsUseCase,
    private readonly updatePackagePlanSettingsUseCase: UpdatePackagePlanSettingsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get standardized package settings',
    description:
      'Returns the global feature toggles that control standardized package plan visibility and purchase flows.',
  })
  @ApiResponse({ status: 200, type: PackagePlanSettingsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  get() {
    return this.getPackagePlanSettingsUseCase
      .execute()
      .then((data) => ({ success: true as const, data }));
  }

  @Patch()
  @ApiOperation({
    summary: 'Update standardized package settings',
    description:
      'Updates the global feature toggles that control standardized package plan visibility and purchase flows.',
  })
  @ApiResponse({
    status: 200,
    type: PackagePlanSettingsUpdateSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  update(
    @Body() body: UpdatePackagePlanSettingsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updatePackagePlanSettingsUseCase
      .execute({
        packagesEnabled: body.packagesEnabled,
        packagesPurchaseEnabled: body.packagesPurchaseEnabled,
        changedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
