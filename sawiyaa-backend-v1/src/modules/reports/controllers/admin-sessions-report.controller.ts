import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/enums/permission-key.enum';
import {
  GetAdminSessionsReportOverviewDto,
  ListAdminSessionsReportRowsDto,
} from '../dto/admin-sessions-report.dto';
import { GetAdminSessionsReportOverviewUseCase } from '../use-cases/get-admin-sessions-report-overview.use-case';
import { ListAdminSessionsReportRowsUseCase } from '../use-cases/list-admin-sessions-report-rows.use-case';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.PATIENT_OPERATIONS)
@Permissions(PermissionKey.SESSIONS_READ_ADMIN)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/reports/sessions')
export class AdminSessionsReportController {
  constructor(
    private readonly getOverviewUseCase: GetAdminSessionsReportOverviewUseCase,
    private readonly listRowsUseCase: ListAdminSessionsReportRowsUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Sessions report overview',
    description:
      'Operational sessions reporting snapshot with totals, status breakdown, and trend.',
  })
  @ApiResponse({ status: 200, description: 'Sessions report overview' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Admin or patient-operations account with admin session read access is required',
  })
  async overview(@Query() query: GetAdminSessionsReportOverviewDto) {
    const data = await this.getOverviewUseCase.execute(query);
    return { success: true as const, data };
  }

  @Get('rows')
  @ApiOperation({
    summary: 'Sessions report rows',
    description: 'Paginated sessions rows for drill-down.',
  })
  @ApiResponse({ status: 200, description: 'Sessions report rows' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Admin or patient-operations account with admin session read access is required',
  })
  async rows(@Query() query: ListAdminSessionsReportRowsDto) {
    const data = await this.listRowsUseCase.execute(query);
    return { success: true as const, data };
  }
}
