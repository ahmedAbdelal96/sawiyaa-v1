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
import {
  GetAdminCareRequestsReportOverviewDto,
  ListAdminCareRequestsReportRowsDto,
} from '../dto/admin-care-requests-report.dto';
import { GetAdminCareRequestsReportOverviewUseCase } from '../use-cases/get-admin-care-requests-report-overview.use-case';
import { ListAdminCareRequestsReportRowsUseCase } from '../use-cases/list-admin-care-requests-report-rows.use-case';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/reports/care-requests')
export class AdminCareRequestsReportController {
  constructor(
    private readonly getOverviewUseCase: GetAdminCareRequestsReportOverviewUseCase,
    private readonly listRowsUseCase: ListAdminCareRequestsReportRowsUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Care requests report overview',
    description:
      'Operational practitioner messaging approval requests reporting snapshot.',
  })
  @ApiResponse({ status: 200, description: 'Care requests report overview' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async overview(@Query() query: GetAdminCareRequestsReportOverviewDto) {
    const data = await this.getOverviewUseCase.execute(query);
    return { success: true as const, data };
  }

  @Get('rows')
  @ApiOperation({
    summary: 'Care requests report rows',
    description: 'Paginated care approval requests rows for drill-down.',
  })
  @ApiResponse({ status: 200, description: 'Care requests report rows' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async rows(@Query() query: ListAdminCareRequestsReportRowsDto) {
    const data = await this.listRowsUseCase.execute(query);
    return { success: true as const, data };
  }
}
