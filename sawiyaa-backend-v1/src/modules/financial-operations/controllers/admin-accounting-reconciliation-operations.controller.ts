import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import {
  AccountingReconciliationIssueListFilters,
  AccountingReconciliationIssueRecord,
  AccountingReconciliationIssueStatus as AccountingReconciliationIssueStatusView,
  AccountingReconciliationListFilters,
  AccountingReconciliationRunRequest,
  AccountingReconciliationRunScope,
  AccountingReconciliationRunStatus as AccountingReconciliationRunStatusView,
  AccountingReconciliationRunTrigger as AccountingReconciliationRunTriggerView,
  AccountingReconciliationSeverity,
} from '../types/accounting-reconciliation-operations.types';
import {
  ListAccountingReconciliationIssuesDto,
  ListAccountingReconciliationRunsDto,
  TriggerAccountingReconciliationRunDto,
  UpdateAccountingReconciliationIssueDto,
} from '../dto/admin-accounting-reconciliation-operations.dto';
import { AccountingReconciliationOperationsService } from '../services/accounting-reconciliation-operations.service';
import { AccountingReconciliationSchedulerService } from '../services/accounting-reconciliation-scheduler.service';

@ApiTags('Admin - Accounting Reconciliation Operations')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/finance/accounting')
export class AdminAccountingReconciliationOperationsController {
  constructor(
    private readonly operationsService: AccountingReconciliationOperationsService,
    private readonly schedulerService: AccountingReconciliationSchedulerService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Post('reconciliation-runs/payments')
  @RequireStepUp('finance.accounting.reconciliation.run')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Run payment reconciliation',
    description:
      'Runs read-only payment reconciliation across recent captured payment records and persists the reconciliation run and issues.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment reconciliation run result',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  async runPayments(
    @Query() query: TriggerAccountingReconciliationRunDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.runPayments(
      this.toRunRequest('PAYMENTS', 'ADMIN', query),
      currentUser.id,
    );
    this.logRun('finance.accounting.reconciliation.run.payments', currentUser, {
      runId: data.run.id,
      scope: data.run.scope,
      issueCount: data.issueCount,
      ...data.summary,
    });
    return {
      success: true as const,
      data,
    };
  }

  @Post('reconciliation-runs/wallets')
  @RequireStepUp('finance.accounting.reconciliation.run')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Run wallet reconciliation',
    description:
      'Runs read-only reconciliation for practitioner and customer wallets against their ledger projections.',
  })
  @ApiResponse({ status: 200, description: 'Wallet reconciliation run result' })
  async runWallets(
    @Query() query: TriggerAccountingReconciliationRunDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.runWallets(
      this.toRunRequest('WALLETS', 'ADMIN', query),
      currentUser.id,
    );
    this.logRun('finance.accounting.reconciliation.run.wallets', currentUser, {
      runId: data.run.id,
      scope: data.run.scope,
      issueCount: data.issueCount,
      ...data.summary,
    });
    return {
      success: true as const,
      data,
    };
  }

  @Post('reconciliation-runs/refunds')
  @RequireStepUp('finance.accounting.reconciliation.run')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Run refund reconciliation',
    description:
      'Runs reconciliation over succeeded refunds and their reversal postings.',
  })
  @ApiResponse({ status: 200, description: 'Refund reconciliation run result' })
  async runRefunds(
    @Query() query: TriggerAccountingReconciliationRunDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.runRefunds(
      this.toRunRequest('REFUNDS', 'ADMIN', query),
      currentUser.id,
    );
    this.logRun('finance.accounting.reconciliation.run.refunds', currentUser, {
      runId: data.run.id,
      scope: data.run.scope,
      issueCount: data.issueCount,
      ...data.summary,
    });
    return {
      success: true as const,
      data,
    };
  }

  @Post('reconciliation-runs/package-settlements')
  @RequireStepUp('finance.accounting.reconciliation.run')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Run package settlement reconciliation',
    description: 'Runs reconciliation over package settlement release flows.',
  })
  @ApiResponse({
    status: 200,
    description: 'Package settlement reconciliation run result',
  })
  async runPackageSettlements(
    @Query() query: TriggerAccountingReconciliationRunDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.runPackageSettlements(
      this.toRunRequest('PACKAGE_SETTLEMENTS', 'ADMIN', query),
      currentUser.id,
    );
    this.logRun(
      'finance.accounting.reconciliation.run.package-settlements',
      currentUser,
      {
        runId: data.run.id,
        scope: data.run.scope,
        issueCount: data.issueCount,
        ...data.summary,
      },
    );
    return {
      success: true as const,
      data,
    };
  }

  @Post('reconciliation-runs/full')
  @RequireStepUp('finance.accounting.reconciliation.run')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Run a full accounting reconciliation sweep',
    description:
      'Runs payment, wallet, settlement, refund, and package settlement reconciliation in one controlled batch.',
  })
  @ApiResponse({ status: 200, description: 'Full reconciliation run result' })
  async runFull(
    @Query() query: TriggerAccountingReconciliationRunDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.runFull(
      this.toRunRequest('FULL', 'ADMIN', query),
      currentUser.id,
    );
    this.logRun('finance.accounting.reconciliation.run.full', currentUser, {
      runId: data.run.id,
      scope: data.run.scope,
      issueCount: data.issueCount,
      ...data.summary,
    });
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation-runs')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List reconciliation runs',
    description:
      'Returns persisted reconciliation runs with safe summary metadata and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Reconciliation run list' })
  async listRuns(@Query() query: ListAccountingReconciliationRunsDto) {
    const data = await this.operationsService.listRuns(
      this.toRunListFilters(query),
    );
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation-runs/:runId')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get reconciliation run details',
    description:
      'Returns one reconciliation run and its persisted issues for operator review.',
  })
  @ApiResponse({ status: 200, description: 'Reconciliation run detail' })
  async getRun(@Param('runId', new ParseUUIDPipe()) runId: string) {
    const data = await this.operationsService.getRun(runId);
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation-issues')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List reconciliation issues',
    description:
      'Returns persisted reconciliation issues with severity, status, and currency-safe filters.',
  })
  @ApiResponse({ status: 200, description: 'Reconciliation issue list' })
  async listIssues(@Query() query: ListAccountingReconciliationIssuesDto) {
    const data = await this.operationsService.listIssues(
      this.toIssueListFilters(query),
    );
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation-issues/:issueId')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get reconciliation issue details',
    description:
      'Returns one persisted reconciliation issue for operator review.',
  })
  @ApiResponse({ status: 200, description: 'Reconciliation issue detail' })
  async getIssue(@Param('issueId', new ParseUUIDPipe()) issueId: string) {
    const data = await this.operationsService.getIssue(issueId);
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation-status')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get reconciliation scheduler status',
    description:
      'Returns safe scheduler state, last scheduled run metadata, and open issue counters.',
  })
  @ApiResponse({ status: 200, description: 'Reconciliation scheduler status' })
  async getReconciliationStatus() {
    const data = await this.schedulerService.getStatusSnapshot();
    return {
      success: true as const,
      data,
    };
  }

  @Patch('reconciliation-issues/:issueId/acknowledge')
  @RequireStepUp('finance.accounting.reconciliation.issue.review')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Acknowledge a reconciliation issue',
    description:
      'Marks a reconciliation issue as acknowledged without mutating financial data.',
  })
  @ApiResponse({ status: 200, description: 'Acknowledged issue' })
  async acknowledgeIssue(
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
    @Body() body: UpdateAccountingReconciliationIssueDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.acknowledgeIssue(
      issueId,
      currentUser.id,
      body.note,
      currentUser.roles,
    );
    this.logIssueReview(
      'finance.accounting.reconciliation.issue.acknowledge',
      currentUser,
      issueId,
      data,
    );
    return {
      success: true as const,
      data,
    };
  }

  @Patch('reconciliation-issues/:issueId/resolve')
  @RequireStepUp('finance.accounting.reconciliation.issue.review')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Resolve a reconciliation issue',
    description:
      'Marks a reconciliation issue as resolved without mutating financial data.',
  })
  @ApiResponse({ status: 200, description: 'Resolved issue' })
  async resolveIssue(
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
    @Body() body: UpdateAccountingReconciliationIssueDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.resolveIssue(
      issueId,
      currentUser.id,
      body.note,
      currentUser.roles,
    );
    this.logIssueReview(
      'finance.accounting.reconciliation.issue.resolve',
      currentUser,
      issueId,
      data,
    );
    return {
      success: true as const,
      data,
    };
  }

  @Patch('reconciliation-issues/:issueId/ignore')
  @RequireStepUp('finance.accounting.reconciliation.issue.review')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Ignore a reconciliation issue',
    description:
      'Marks a reconciliation issue as ignored without mutating financial data.',
  })
  @ApiResponse({ status: 200, description: 'Ignored issue' })
  async ignoreIssue(
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
    @Body() body: UpdateAccountingReconciliationIssueDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data = await this.operationsService.ignoreIssue(
      issueId,
      currentUser.id,
      body.note,
      currentUser.roles,
    );
    this.logIssueReview(
      'finance.accounting.reconciliation.issue.ignore',
      currentUser,
      issueId,
      data,
    );
    return {
      success: true as const,
      data,
    };
  }

  private toRunRequest(
    scope: AccountingReconciliationRunScope,
    trigger: AccountingReconciliationRunTriggerView,
    query: TriggerAccountingReconciliationRunDto,
  ): AccountingReconciliationRunRequest {
    return {
      scope,
      trigger,
      currencyCode: query.currencyCode ?? null,
      practitionerId: query.practitionerId ?? null,
      patientId: query.patientId ?? null,
      entityId: query.entityId ?? null,
      lookbackDays: query.lookbackDays,
      batchSize: query.batchSize,
      query: query.query ?? null,
    };
  }

  private toRunListFilters(
    query: ListAccountingReconciliationRunsDto,
  ): AccountingReconciliationListFilters & {
    page?: number;
    limit?: number;
  } {
    return {
      page: query.page,
      limit: query.limit,
      scope: this.normalizeScope(query.scope),
      status: this.normalizeRunStatus(query.status),
      trigger: this.normalizeTrigger(query.trigger),
      entityType: query.entityType ?? null,
      entityId: query.entityId ?? null,
      currencyCode: query.currencyCode ?? null,
      triggeredByUserId: query.triggeredByUserId ?? null,
      from: query.from ? new Date(query.from) : null,
      to: query.to ? new Date(query.to) : null,
    };
  }

  private toIssueListFilters(
    query: ListAccountingReconciliationIssuesDto,
  ): AccountingReconciliationIssueListFilters & {
    page?: number;
    limit?: number;
  } {
    return {
      page: query.page,
      limit: query.limit,
      scope: this.normalizeScope(query.scope),
      status: this.normalizeIssueStatus(query.status),
      severity: this.normalizeSeverity(query.severity),
      entityType: query.entityType ?? null,
      entityId: query.entityId ?? null,
      currencyCode: query.currencyCode ?? null,
      issueCode: query.issueCode ?? null,
      runId: query.runId ?? null,
      from: query.from ? new Date(query.from) : null,
      to: query.to ? new Date(query.to) : null,
    };
  }

  private normalizeScope(
    value?: string | null,
  ): AccountingReconciliationRunScope | null {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'PAYMENTS' ||
      normalized === 'WALLETS' ||
      normalized === 'SETTLEMENTS' ||
      normalized === 'REFUNDS' ||
      normalized === 'PACKAGE_SETTLEMENTS' ||
      normalized === 'FULL'
    ) {
      return normalized;
    }

    return null;
  }

  private normalizeTrigger(
    value?: string | null,
  ): AccountingReconciliationRunTriggerView | null {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'MANUAL' ||
      normalized === 'ADMIN' ||
      normalized === 'SCHEDULED' ||
      normalized === 'SYSTEM'
    ) {
      return normalized;
    }

    return null;
  }

  private normalizeRunStatus(
    value?: string | null,
  ): AccountingReconciliationRunStatusView | null {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'RUNNING' ||
      normalized === 'COMPLETED' ||
      normalized === 'COMPLETED_WITH_ISSUES' ||
      normalized === 'FAILED'
    ) {
      return normalized;
    }

    return null;
  }

  private normalizeIssueStatus(
    value?: string | null,
  ): AccountingReconciliationIssueStatusView | null {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'OPEN' ||
      normalized === 'ACKNOWLEDGED' ||
      normalized === 'RESOLVED' ||
      normalized === 'IGNORED'
    ) {
      return normalized;
    }

    return null;
  }

  private normalizeSeverity(
    value?: string | null,
  ): AccountingReconciliationSeverity | null {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'INFO' ||
      normalized === 'WARNING' ||
      normalized === 'ERROR' ||
      normalized === 'CRITICAL'
    ) {
      return normalized;
    }

    return null;
  }

  private logRun(
    action: string,
    currentUser: AuthenticatedUser,
    metadata: Record<string, unknown>,
  ) {
    this.securityAuditService.logAsync({
      action,
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'AccountingReconciliationRun',
      metadata,
    });
  }

  private logIssueReview(
    action: string,
    currentUser: AuthenticatedUser,
    issueId: string,
    data: AccountingReconciliationIssueRecord,
  ) {
    this.securityAuditService.logAsync({
      action,
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'AccountingReconciliationIssue',
      resourceId: issueId,
      metadata: {
        runId: data.runId,
        scope: data.scope,
        entityType: data.entityType,
        entityId: data.entityId,
        currencyCode: data.currencyCode,
        issueCode: data.issueCode,
        severity: data.severity,
        status: data.status,
      },
    });
  }
}
