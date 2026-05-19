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
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
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
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT, AppRole.PATIENT_OPERATIONS)
@Controller('admin/patients')
export class AdminPatientsController {
  constructor(
    private readonly listAdminPatientsUseCase: ListAdminPatientsUseCase,
    private readonly getAdminPatientDetailsUseCase: GetAdminPatientDetailsUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Get()
  @Permissions(PermissionKey.PATIENTS_READ_ADMIN)
  @ApiOperation({
    summary: 'List patients (customers) for back-office operations',
  })
  @ApiResponse({ status: 200, type: AdminPatientsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only admin/support/content-reviewer roles may access this route',
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
  @Permissions(PermissionKey.PATIENTS_READ_ADMIN)
  @ApiOperation({
    summary: 'Get patient (customer) details for back-office review',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({ status: 200, type: AdminPatientDetailsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only admin/support/content-reviewer roles may access this route',
  })
  details(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('patientId') patientId: string,
  ) {
    return this.getAdminPatientDetailsUseCase
      .execute({ locale, patientId })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'privacy.patient.sensitive.read',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: _currentUser.id,
          actorRoles: _currentUser.roles,
          resourceType: 'PatientProfile',
          resourceId: patientId,
          targetUserId: patientId,
          metadata: {
            scope: 'admin-details',
          },
        });
        return result;
      });
  }
}
