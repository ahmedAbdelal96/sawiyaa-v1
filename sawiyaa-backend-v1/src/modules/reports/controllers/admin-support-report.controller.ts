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
  GetAdminSupportReportOverviewDto,
  ListAdminSupportReportRowsDto,
} from '../dto/admin-support-report.dto';
import { GetAdminSupportReportOverviewUseCase } from '../use-cases/get-admin-support-report-overview.use-case';
import { ListAdminSupportReportRowsUseCase } from '../use-cases/list-admin-support-report-rows.use-case';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/reports/support')
export class AdminSupportReportController {
  constructor(
    private readonly getOverviewUseCase: GetAdminSupportReportOverviewUseCase,
    private readonly listRowsUseCase: ListAdminSupportReportRowsUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Support report overview',
    description: 'Operational support ticket reporting snapshot.',
  })
  @ApiResponse({ status: 200, description: 'Support report overview' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async overview(@Query() query: GetAdminSupportReportOverviewDto) {
    const data = await this.getOverviewUseCase.execute(query);
    return { success: true as const, data };
  }

  @Get('rows')
  @ApiOperation({
    summary: 'Support report rows',
    description: 'Paginated support ticket rows for drill-down.',
  })
  @ApiResponse({ status: 200, description: 'Support report rows' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async rows(@Query() query: ListAdminSupportReportRowsDto) {
    const data = await this.listRowsUseCase.execute(query);
    return { success: true as const, data };
  }
}
