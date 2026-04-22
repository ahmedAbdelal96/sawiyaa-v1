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
import { AdminPayoutHistoryListSuccessResponseDto } from '../dto/financial-operations-response.dto';
import { ListAdminPayoutsDto } from '../dto/admin-payouts.dto';
import { ListAdminPayoutsUseCase } from '../use-cases/list-admin-payouts.use-case';

@ApiTags('Admin - Payouts')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(
    private readonly listAdminPayoutsUseCase: ListAdminPayoutsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payout operations',
    description:
      'Lists recorded practitioner payout operations across the system. This is a historical operational surface (payout log).',
  })
  @ApiResponse({ status: 200, type: AdminPayoutHistoryListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  list(@Query() query: ListAdminPayoutsDto) {
    return this.listAdminPayoutsUseCase.execute({ query });
  }
}
