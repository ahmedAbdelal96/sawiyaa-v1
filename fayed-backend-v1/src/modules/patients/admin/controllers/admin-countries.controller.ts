import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { CountryRepository } from '../../repositories/country.repository';

@ApiTags('Admin - Countries')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.PATIENT_OPERATIONS)
@Controller('admin/countries')
export class AdminCountriesController {
  constructor(private readonly countryRepository: CountryRepository) {}

  @Get()
  @Permissions(PermissionKey.PATIENTS_READ_ADMIN)
  @ApiOperation({
    summary: 'List all active countries for admin selection UI',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active countries sorted alphabetically',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles may access this route',
  })
  listCountries() {
    return this.countryRepository.findAllActive();
  }
}
