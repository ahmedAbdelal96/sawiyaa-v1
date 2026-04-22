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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PaymentsListSuccessResponseDto } from '../dto/payment-response.dto';
import { ListPatientPaymentsDto } from '../dto/list-patient-payments.dto';
import { ListAdminPatientPaymentsUseCase } from '../use-cases/list-admin-patient-payments.use-case';

@ApiTags('Admin - Patients')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/patients/:patientId/payments')
export class AdminPatientPaymentsController {
  constructor(
    private readonly listAdminPatientPaymentsUseCase: ListAdminPatientPaymentsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payments for a specific patient (back-office)',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({ status: 200, type: PaymentsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles may access this route',
  })
  list(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('patientId') patientId: string,
    @Query() query: ListPatientPaymentsDto,
  ) {
    return this.listAdminPatientPaymentsUseCase.execute({
      locale,
      patientId,
      query,
    });
  }
}
