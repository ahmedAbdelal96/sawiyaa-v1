import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
  GetPackagePolicyDto,
  PackagePolicySuccessResponseDto,
  PackagePolicyUpdateSuccessResponseDto,
  UpdatePackagePolicyDto,
} from '../dto/admin-package-policy.dto';
import { GetPackagePolicyUseCase } from '../use-cases/get-package-policy.use-case';
import { UpdatePackagePolicyUseCase } from '../use-cases/update-package-policy.use-case';

@ApiTags('Admin - Practitioner Package Policy')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/practitioner-packages/settings/policy')
export class AdminPackagePolicyController {
  constructor(
    private readonly getPackagePolicyUseCase: GetPackagePolicyUseCase,
    private readonly updatePackagePolicyUseCase: UpdatePackagePolicyUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get package policy',
    description:
      'Returns the configured global package limit and the effective limit for an optional practitioner scope.',
  })
  @ApiResponse({ status: 200, type: PackagePolicySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  get(@Query() query: GetPackagePolicyDto) {
    return this.getPackagePolicyUseCase
      .execute({
        practitionerId: query.practitionerId ?? null,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch()
  @ApiOperation({
    summary: 'Update package policy',
    description:
      'Creates or replaces the configured package limit in the config engine, globally or for an optional practitioner scope.',
  })
  @ApiResponse({ status: 200, type: PackagePolicyUpdateSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdatePackagePolicyDto,
  ) {
    return this.updatePackagePolicyUseCase
      .execute({
        payload: body,
        changedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
