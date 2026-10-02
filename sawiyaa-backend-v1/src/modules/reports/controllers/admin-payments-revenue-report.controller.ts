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
  GetAdminPaymentsRevenueReportOverviewDto,
  ListAdminPaymentsRevenueReportRowsDto,
} from '../dto/admin-payments-revenue-report.dto';
import { GetAdminPaymentsRevenueReportOverviewUseCase } from '../use-cases/get-admin-payments-revenue-report-overview.use-case';
import { ListAdminPaymentsRevenueReportRowsUseCase } from '../use-cases/list-admin-payments-revenue-report-rows.use-case';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@Permissions(PermissionKey.ACCOUNTING_READ)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/reports/payments-revenue')
export class AdminPaymentsRevenueReportController {
  constructor(
    private readonly getOverviewUseCase: GetAdminPaymentsRevenueReportOverviewUseCase,
    private readonly listRowsUseCase: ListAdminPaymentsRevenueReportRowsUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Payments & revenue report overview',
    description:
      'Financial reporting snapshot sourced from accounting journal entries and lines.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments & revenue report overview',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Admin or finance staff account with accounting read access is required',
  })
  async overview(@Query() query: GetAdminPaymentsRevenueReportOverviewDto) {
    const data = await this.getOverviewUseCase.execute(query);
    return { success: true as const, data };
  }

  @Get('rows')
  @ApiOperation({
    summary: 'Payments & revenue report rows',
    description: 'Paginated journal-backed rows for drill-down.',
  })
  @ApiResponse({ status: 200, description: 'Payments & revenue report rows' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Admin or finance staff account with accounting read access is required',
  })
  async rows(@Query() query: ListAdminPaymentsRevenueReportRowsDto) {
    const data = await this.listRowsUseCase.execute(query);
    return { success: true as const, data };
  }
}
