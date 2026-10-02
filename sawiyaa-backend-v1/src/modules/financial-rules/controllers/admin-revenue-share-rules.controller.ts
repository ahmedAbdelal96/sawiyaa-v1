import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { UpdateRevenueShareRulesDto } from '../dto/revenue-share-rules.dto';
import { RevenueShareRulesItemSuccessResponseDto } from '../dto/financial-rules-response.dto';
import { GetRevenueShareRulesUseCase } from '../use-cases/get-revenue-share-rules.use-case';
import { UpdateRevenueShareRulesUseCase } from '../use-cases/update-revenue-share-rules.use-case';

@ApiTags('Admin - Financial Rules')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.SUPER_ADMIN, AppRole.ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/revenue-share-rules')
export class AdminRevenueShareRulesController {
  constructor(
    private readonly getRevenueShareRulesUseCase: GetRevenueShareRulesUseCase,
    private readonly updateRevenueShareRulesUseCase: UpdateRevenueShareRulesUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get the canonical platform commission setting',
    description:
      'Returns one platform commission percentage and its derived practitioner share. Historical payments keep their stored snapshots. If legacy market defaults differ, the setting fails closed until an administrator explicitly unifies them.',
  })
  @ApiResponse({ status: 200, type: RevenueShareRulesItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  get() {
    return this.getRevenueShareRulesUseCase.execute();
  }

  @Put()
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Update the canonical platform commission setting',
    description:
      'Updates both default market rules to the one explicitly selected split for future allocations. Existing payments and ledger entries remain unchanged.',
  })
  @ApiBody({ type: UpdateRevenueShareRulesDto })
  @ApiResponse({ status: 200, type: RevenueShareRulesItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed or percentage split is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  update(
    @Body() body: UpdateRevenueShareRulesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateRevenueShareRulesUseCase.execute(body, actor);
  }
}
