import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import type { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  AdminPatientDetailsSuccessResponseDto,
  AdminPatientsListSuccessResponseDto,
} from '../dto/admin-patients-response.dto';
import { ListAdminPatientsDto } from '../dto/list-admin-patients.dto';
import { GetAdminPatientDetailsUseCase } from '../use-cases/get-admin-patient-details.use-case';
import { ListAdminPatientsUseCase } from '../use-cases/list-admin-patients.use-case';

@ApiTags('Admin - Patients')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT, AppRole.CONTENT_REVIEWER)
@Controller('admin/patients')
export class AdminPatientsController {
  constructor(
    private readonly listAdminPatientsUseCase: ListAdminPatientsUseCase,
    private readonly getAdminPatientDetailsUseCase: GetAdminPatientDetailsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List patients (customers) for back-office operations',
  })
  @ApiResponse({ status: 200, type: AdminPatientsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support/content-reviewer roles may access this route',
  })
  list(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListAdminPatientsDto,
  ) {
    return this.listAdminPatientsUseCase.execute({
      locale,
      search: query.search,
      status: query.status,
      onboarding: query.onboarding,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':patientId')
  @ApiOperation({
    summary: 'Get patient (customer) details for back-office review',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({ status: 200, type: AdminPatientDetailsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support/content-reviewer roles may access this route',
  })
  details(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('patientId') patientId: string,
  ) {
    return this.getAdminPatientDetailsUseCase.execute({ locale, patientId });
  }
}
