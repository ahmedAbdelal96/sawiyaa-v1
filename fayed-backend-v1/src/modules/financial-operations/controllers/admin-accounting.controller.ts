import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
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
import { JournalEntrySourceType } from '@prisma/client';
import { Response } from 'express';
import { GetAdminAccountingDashboardDto } from '../dto/admin-accounting-dashboard.dto';
import {
  AccountingDashboardSuccessResponseDto,
  AccountingReconciliationListSuccessResponseDto,
  AccountingReconciliationOverviewSuccessResponseDto,
  AccountingReconciliationReviewSuccessResponseDto,
  JournalEntryDetailSuccessResponseDto,
  LedgerExplorerAccountOptionsSuccessResponseDto,
  LedgerExplorerListSuccessResponseDto,
} from '../dto/admin-accounting-response.dto';
import { ExportAdminLedgerExplorerDto } from '../dto/export-admin-ledger-explorer.dto';
import { ListAdminAccountingReconciliationDto } from '../dto/list-admin-accounting-reconciliation.dto';
import { ListAdminLedgerExplorerDto } from '../dto/list-admin-ledger-explorer.dto';
import { UpdateAdminAccountingReconciliationReviewDto } from '../dto/update-admin-accounting-reconciliation-review.dto';
import { ExportAdminAccountingDashboardCsvUseCase } from '../use-cases/export-admin-accounting-dashboard-csv.use-case';
import { ExportAdminLedgerExplorerCsvUseCase } from '../use-cases/export-admin-ledger-explorer-csv.use-case';
import { GetAdminAccountingDashboardUseCase } from '../use-cases/get-admin-accounting-dashboard.use-case';
import { GetAdminAccountingReconciliationOverviewUseCase } from '../use-cases/get-admin-accounting-reconciliation-overview.use-case';
import { GetAdminLedgerJournalEntryUseCase } from '../use-cases/get-admin-ledger-journal-entry.use-case';
import { ListAdminAccountingReconciliationUseCase } from '../use-cases/list-admin-accounting-reconciliation.use-case';
import { ListAdminLedgerAccountOptionsUseCase } from '../use-cases/list-admin-ledger-account-options.use-case';
import { ListAdminLedgerExplorerUseCase } from '../use-cases/list-admin-ledger-explorer.use-case';
import { UpdateAdminAccountingReconciliationReviewUseCase } from '../use-cases/update-admin-accounting-reconciliation-review.use-case';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';

@ApiTags('Admin - Accounting')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/finance/accounting')
export class AdminAccountingController {
  constructor(
    private readonly getAdminAccountingDashboardUseCase: GetAdminAccountingDashboardUseCase,
    private readonly exportAdminAccountingDashboardCsvUseCase: ExportAdminAccountingDashboardCsvUseCase,
    private readonly getAdminAccountingReconciliationOverviewUseCase: GetAdminAccountingReconciliationOverviewUseCase,
    private readonly listAdminAccountingReconciliationUseCase: ListAdminAccountingReconciliationUseCase,
    private readonly updateAdminAccountingReconciliationReviewUseCase: UpdateAdminAccountingReconciliationReviewUseCase,
    private readonly listAdminLedgerAccountOptionsUseCase: ListAdminLedgerAccountOptionsUseCase,
    private readonly listAdminLedgerExplorerUseCase: ListAdminLedgerExplorerUseCase,
    private readonly exportAdminLedgerExplorerCsvUseCase: ExportAdminLedgerExplorerCsvUseCase,
    private readonly getAdminLedgerJournalEntryUseCase: GetAdminLedgerJournalEntryUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Get('dashboard')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get admin accounting dashboard snapshot',
    description:
      'Returns finance KPI and trend snapshots sourced from journal entries and journal lines.',
  })
  @ApiResponse({ status: 200, type: AccountingDashboardSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async dashboard(@Query() query: GetAdminAccountingDashboardDto) {
    const data = await this.getAdminAccountingDashboardUseCase.execute(query);
    return {
      success: true as const,
      data,
    };
  }

  @Get('dashboard/export.csv')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Export admin accounting dashboard CSV',
    description:
      'Returns a bounded CSV package for dashboard KPI, trends, and recent events based on accounting truth.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard CSV export stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async exportDashboardCsv(
    @Query() query: GetAdminAccountingDashboardDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exported =
      await this.exportAdminAccountingDashboardCsvUseCase.execute(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    response.send(exported.content);
  }

  @Get('reconciliation/overview')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get accounting reconciliation overview',
    description:
      'Returns reconciliation totals and anomaly counters comparing operational records with posted journals.',
  })
  @ApiResponse({
    status: 200,
    type: AccountingReconciliationOverviewSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async reconciliationOverview(
    @Query() query: ListAdminAccountingReconciliationDto,
  ) {
    const data =
      await this.getAdminAccountingReconciliationOverviewUseCase.execute(query);
    return {
      success: true as const,
      data,
    };
  }

  @Get('reconciliation/items')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List accounting reconciliation items',
    description:
      'Returns paginated reconciliation items with status, anomaly flags, and accounting linkage for operator review.',
  })
  @ApiResponse({
    status: 200,
    type: AccountingReconciliationListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async reconciliationItems(
    @Query() query: ListAdminAccountingReconciliationDto,
  ) {
    const data =
      await this.listAdminAccountingReconciliationUseCase.execute(query);
    return {
      success: true as const,
      data,
    };
  }

  @Patch('reconciliation/items/:sourceType/:sourceId/review')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Update accounting reconciliation review',
    description:
      'Stores an operator reconciliation decision note for one payment/refund/payout source record.',
  })
  @ApiResponse({
    status: 200,
    type: AccountingReconciliationReviewSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async updateReconciliationReview(
    @Param('sourceType', new ParseEnumPipe(JournalEntrySourceType))
    sourceType: JournalEntrySourceType,
    @Param('sourceId', new ParseUUIDPipe()) sourceId: string,
    @Body() body: UpdateAdminAccountingReconciliationReviewDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const data =
      await this.updateAdminAccountingReconciliationReviewUseCase.execute({
        sourceType,
        sourceId,
        reviewerUserId: currentUser.id,
        body,
      });
    this.securityAuditService.logAsync({
      action: 'finance.accounting.reconciliation.review',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'FinanceReconciliationReview',
      resourceId: sourceId,
      metadata: { sourceType },
    });
    return {
      success: true as const,
      data,
    };
  }

  @Get('ledger/accounts')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List ledger account options',
    description:
      'Returns active ledger accounts for explorer filters and account drill-downs.',
  })
  @ApiResponse({
    status: 200,
    type: LedgerExplorerAccountOptionsSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async accountOptions(@Query('currencyCode') currencyCode?: string) {
    const items = await this.listAdminLedgerAccountOptionsUseCase.execute({
      currencyCode,
    });
    return {
      success: true as const,
      data: {
        items,
      },
    };
  }

  @Get('ledger/entries')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List ledger explorer rows',
    description:
      'Returns paginated journal lines with account and source references for operator-level accounting inspection.',
  })
  @ApiResponse({ status: 200, type: LedgerExplorerListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async ledgerEntries(@Query() query: ListAdminLedgerExplorerDto) {
    const data = await this.listAdminLedgerExplorerUseCase.execute(query);
    return {
      success: true as const,
      data,
    };
  }

  @Get('ledger/entries/export.csv')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Export ledger explorer CSV',
    description:
      'Returns filtered journal lines as CSV, bounded by export limit, with the same truth used in ledger explorer.',
  })
  @ApiResponse({ status: 200, description: 'Ledger CSV export stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  async exportLedgerCsv(
    @Query() query: ExportAdminLedgerExplorerDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exported =
      await this.exportAdminLedgerExplorerCsvUseCase.execute(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    response.send(exported.content);
  }

  @Get('ledger/entries/:journalEntryId')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get journal entry detail',
    description:
      'Returns one posted journal entry with fully expanded lines for accounting drill-down.',
  })
  @ApiResponse({ status: 200, type: JournalEntryDetailSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Journal entry was not found' })
  async journalEntry(
    @Param('journalEntryId', new ParseUUIDPipe()) journalEntryId: string,
  ) {
    const item =
      await this.getAdminLedgerJournalEntryUseCase.execute(journalEntryId);
    return {
      success: true as const,
      data: { item },
    };
  }
}
