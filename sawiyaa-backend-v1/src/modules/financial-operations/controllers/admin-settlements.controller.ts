import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AddSettlementAdjustmentDto, ApproveSettlementDto, ListAdminSettlementsDto, RejectSettlementDto } from '../dto/admin-settlement-workflow.dto';
import { RecordPractitionerPayoutDto } from '../dto/practitioner-payout.dto';
import { AdminSettlementWorkflowUseCase } from '../use-cases/admin-settlement-workflow.use-case';

@ApiTags('Admin - Accountant Settlements')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/settlements')
export class AdminSettlementsController {
  constructor(private readonly workflow: AdminSettlementWorkflowUseCase) {}

  @Get()
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'List accountant settlement queue' })
  async list(@Query() query: ListAdminSettlementsDto) { return { success: true, data: await this.workflow.list(query) }; }

  @Get(':id')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_VIEW)
  @ApiOperation({ summary: 'Get accountant settlement detail' })
  async detail(@Param('id', new ParseUUIDPipe()) id: string) { return { success: true, data: await this.workflow.detail(id) }; }

  @Post(':id/adjustments')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_ADJUST)
  @ApiOperation({ summary: 'Add an append-only settlement adjustment' })
  async addAdjustment(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: AddSettlementAdjustmentDto, @CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.workflow.addAdjustment({ settlementId: id, body, actorUserId: user.id }) };
  }

  @Post(':id/approve')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_APPROVE)
  @ApiOperation({ summary: 'Approve settlement and credit wallet exactly once' })
  async approve(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: ApproveSettlementDto, @CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.workflow.approve({ settlementId: id, actorUserId: user.id, exchangeRate: body.exchangeRate ?? null, approvedWalletCreditAmount: body.approvedWalletCreditAmount ?? null, walletCreditOverrideReason: body.walletCreditOverrideReason ?? null }) };
  }

  @Post(':id/reject')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_REVIEW)
  @ApiOperation({ summary: 'Reject settlement without wallet impact' })
  async reject(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: RejectSettlementDto, @CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.workflow.reject({ settlementId: id, actorUserId: user.id, reason: body.reason }) };
  }

  @Post(':id/payout')
  @Permissions(PermissionKey.FINANCIAL_PAYOUT_EXECUTE)
  @ApiOperation({ summary: 'Execute external payout for a credited settlement' })
  async payout(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: RecordPractitionerPayoutDto, @CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.workflow.payout({ settlementId: id, actorUserId: user.id, body }) };
  }
}
