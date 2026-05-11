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
import { ListPatientAssessmentsDto } from '../dto/list-patient-assessments.dto';
import { PatientAssessmentsHistorySuccessResponseDto } from '../dto/assessment-response.dto';
import { GetAdminPatientAssessmentsHistoryUseCase } from '../use-cases/get-admin-patient-assessments-history.use-case';

@ApiTags('Admin - Patients')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/patients/:patientId/assessments')
export class AdminPatientAssessmentsController {
  constructor(
    private readonly getAdminPatientAssessmentsHistoryUseCase: GetAdminPatientAssessmentsHistoryUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.PATIENTS_SENSITIVE_READ)
  @ApiOperation({
    summary: 'List assessment submissions for a specific patient (back-office)',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({
    status: 200,
    type: PatientAssessmentsHistorySuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles may access this route',
  })
  list(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query() query: ListPatientAssessmentsDto,
  ) {
    return this.getAdminPatientAssessmentsHistoryUseCase.execute({
      patientId,
      query,
    });
  }
}
