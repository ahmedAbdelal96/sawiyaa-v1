import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { UpdatePackagePlanDto } from '../dto/admin-package-plan.dto';
import { GetPackagePlanUseCase } from '../use-cases/get-package-plan.use-case';
import { ListPackagePlansUseCase } from '../use-cases/list-package-plans.use-case';
import { UpdatePackagePlanUseCase } from '../use-cases/update-package-plan.use-case';
import {
  PackagePlanItemSuccessResponseDto,
  PackagePlanListSuccessResponseDto,
} from '../dto/package-plan-response.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

@ApiTags('Admin - Package Plans')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/package-plans')
export class AdminPackagePlansController {
  constructor(
    private readonly listPackagePlansUseCase: ListPackagePlansUseCase,
    private readonly getPackagePlanUseCase: GetPackagePlanUseCase,
    private readonly updatePackagePlanUseCase: UpdatePackagePlanUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List standardized package plans',
    description:
      'Returns the active platform package plans available for management.',
  })
  @ApiResponse({ status: 200, type: PackagePlanListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  list() {
    return this.listPackagePlansUseCase
      .execute()
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Get a standardized package plan',
    description: 'Returns one platform package plan by its stable code.',
  })
  @ApiParam({ name: 'code', description: 'Package plan code' })
  @ApiResponse({ status: 200, type: PackagePlanItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package plan was not found' })
  detail(@Param('code') code: string) {
    return this.getPackagePlanUseCase
      .execute({ code })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':code')
  @ApiOperation({
    summary: 'Update a standardized package plan',
    description:
      'Admin-only endpoint for safe display-field updates and availability toggling on standardized package plans.',
  })
  @ApiParam({ name: 'code', description: 'Package plan code' })
  @ApiBody({ type: UpdatePackagePlanDto })
  @ApiResponse({ status: 200, type: PackagePlanItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Payload is invalid or code is not manageable',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package plan was not found' })
  update(
    @Param('code') code: string,
    @Body() body: UpdatePackagePlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updatePackagePlanUseCase
      .execute({
        code,
        title: body.title,
        description: body.description,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        changedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':code/enable')
  @ApiOperation({
    summary: 'Enable a standardized package plan',
    description: 'Marks a standard package plan active again for public use.',
  })
  @ApiParam({ name: 'code', description: 'Package plan code' })
  @ApiResponse({ status: 200, type: PackagePlanItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package plan was not found' })
  enable(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updatePackagePlanUseCase
      .execute({
        code,
        isActive: true,
        changedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':code/disable')
  @ApiOperation({
    summary: 'Disable a standardized package plan',
    description:
      'Marks a standard package plan inactive without deleting history.',
  })
  @ApiParam({ name: 'code', description: 'Package plan code' })
  @ApiResponse({ status: 200, type: PackagePlanItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package plan was not found' })
  disable(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updatePackagePlanUseCase
      .execute({
        code,
        isActive: false,
        changedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
