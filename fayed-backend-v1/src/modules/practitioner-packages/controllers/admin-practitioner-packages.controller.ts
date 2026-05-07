import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
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
import { ListAdminPractitionerPackagesDto } from '../dto/list-admin-practitioner-packages.dto';
import {
  AdminPractitionerPackageItemSuccessResponseDto,
  AdminPractitionerPackageListSuccessResponseDto,
} from '../dto/admin-practitioner-package-response.dto';
import { DisablePractitionerPackageUseCase } from '../use-cases/disable-practitioner-package.use-case';
import { EnablePractitionerPackageUseCase } from '../use-cases/enable-practitioner-package.use-case';
import { GetAdminPractitionerPackageUseCase } from '../use-cases/get-admin-practitioner-package.use-case';
import { ListAdminPractitionerPackagesUseCase } from '../use-cases/list-admin-practitioner-packages.use-case';

@ApiTags('Admin - Practitioner Packages')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/practitioner-packages')
export class AdminPractitionerPackagesController {
  constructor(
    private readonly listAdminPractitionerPackagesUseCase: ListAdminPractitionerPackagesUseCase,
    private readonly getAdminPractitionerPackageUseCase: GetAdminPractitionerPackageUseCase,
    private readonly disablePractitionerPackageUseCase: DisablePractitionerPackageUseCase,
    private readonly enablePractitionerPackageUseCase: EnablePractitionerPackageUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all practitioner packages',
    description:
      'Returns practitioner package templates across the platform with practitioner context and counts.',
  })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerPackageListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  list(@Query() query: ListAdminPractitionerPackagesDto) {
    return this.listAdminPractitionerPackagesUseCase
      .execute({ query })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get admin practitioner package detail',
    description:
      'Returns a package template with practitioner context, counts, and operational state.',
  })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerPackageItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  detail(@Param('id', new ParseUUIDPipe()) packageId: string) {
    return this.getAdminPractitionerPackageUseCase
      .execute({ packageId })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/disable')
  @ApiOperation({
    summary: 'Disable practitioner package',
    description:
      'Prevents new purchases while preserving existing purchases and linked sessions.',
  })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerPackageItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  disable(@Param('id', new ParseUUIDPipe()) packageId: string) {
    return this.disablePractitionerPackageUseCase
      .execute({ packageId })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/enable')
  @ApiOperation({
    summary: 'Enable practitioner package',
    description:
      'Restores the previous operational state for a package disabled by admin, but never restores archived packages.',
  })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerPackageItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  enable(@Param('id', new ParseUUIDPipe()) packageId: string) {
    return this.enablePractitionerPackageUseCase
      .execute({ packageId })
      .then((data) => ({ success: true as const, data }));
  }
}
