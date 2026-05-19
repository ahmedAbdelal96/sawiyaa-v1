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
  GetAdminPayoutsReportOverviewDto,
  ListAdminPayoutsReportRowsDto,
} from '../dto/admin-payouts-report.dto';
import { GetAdminPayoutsReportOverviewUseCase } from '../use-cases/get-admin-payouts-report-overview.use-case';
import { ListAdminPayoutsReportRowsUseCase } from '../use-cases/list-admin-payouts-report-rows.use-case';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/reports/payouts')
export class AdminPayoutsReportController {
  constructor(
    private readonly getOverviewUseCase: GetAdminPayoutsReportOverviewUseCase,
    private readonly listRowsUseCase: ListAdminPayoutsReportRowsUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Practitioner payouts report overview',
    description:
      'Operational payout reporting snapshot based on settlement payout operations and proof presence.',
  })
  @ApiResponse({ status: 200, description: 'Payouts report overview' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async overview(@Query() query: GetAdminPayoutsReportOverviewDto) {
    const data = await this.getOverviewUseCase.execute(query);
    return { success: true as const, data };
  }

  @Get('rows')
  @ApiOperation({
    summary: 'Practitioner payouts report rows',
    description: 'Paginated payout rows for drill-down.',
  })
  @ApiResponse({ status: 200, description: 'Payouts report rows' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async rows(@Query() query: ListAdminPayoutsReportRowsDto) {
    const data = await this.listRowsUseCase.execute(query);
    return { success: true as const, data };
  }
}
