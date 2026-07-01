import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminFinanceOperationsController } from './controllers/admin-finance-operations.controller';
import { AdminAccountingReconciliationOperationsController } from './controllers/admin-accounting-reconciliation-operations.controller';
import { AdminPractitionerManualPayoutsController } from './controllers/admin-practitioner-manual-payouts.controller';
import { AdminPayoutsController } from './controllers/admin-payouts.controller';
import { AdminPackageSettlementsController } from './controllers/admin-package-settlements.controller';
import { AdminPractitionerPayoutsController } from './controllers/admin-practitioner-payouts.controller';
import { AdminPractitionerStatementsController } from './controllers/admin-practitioner-statements.controller';
import { AdminAccountingController } from './controllers/admin-accounting.controller';
import { PractitionerFinancialOperationsController } from './controllers/practitioner-financial-operations.controller';
import { FinancialOperationsMapper } from './mappers/financial-operations.mapper';
import { AccountingReadRepository } from './repositories/accounting-read.repository';
import { AccountingReconciliationRepository } from './repositories/accounting-reconciliation.repository';
import { FinancialOperationsPaymentRepository } from './repositories/financial-operations-payment.repository';
import { FinancialOperationsPractitionerRepository } from './repositories/financial-operations-practitioner.repository';
import { LedgerRepository } from './repositories/ledger.repository';
import { PackageSettlementRepository } from './repositories/package-settlement.repository';
import { PractitionerManualPayoutRepository } from './repositories/practitioner-manual-payout.repository';
import { SettlementPayoutRepository } from './repositories/settlement-payout.repository';
import { SettlementPayoutProofRepository } from './repositories/settlement-payout-proof.repository';
import { SettlementRepository } from './repositories/settlement.repository';
import { WalletRepository } from './repositories/wallet.repository';
import { ExtractPaymentLedgerBreakdownService } from './services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from './services/calculate-package-session-allocation.service';
import { AccountingJournalPostingService } from './services/accounting-journal-posting.service';
import { AccountingLedgerAccountService } from './services/accounting-ledger-account.service';
import { AccountingReconciliationDiagnosticsService } from './services/accounting-reconciliation-diagnostics.service';
import { AccountingReconciliationAlertService } from './services/accounting-reconciliation-alert.service';
import { AccountingReconciliationOperationsService } from './services/accounting-reconciliation-operations.service';
import { AccountingReconciliationSchedulerService } from './services/accounting-reconciliation-scheduler.service';
import { AccountingReconciliationService } from './services/accounting-reconciliation.service';
import { MoneyAmountService } from './services/money-amount.service';
import { SettlementPayoutProofStorageService } from './services/settlement-payout-proof-storage.service';
import { RecordSettlementPayoutService } from './services/record-settlement-payout.service';
import { PackageSettlementService } from './services/package-settlement.service';
import { PractitionerManualPayoutBalanceService } from './services/practitioner-manual-payout-balance.service';
import { PractitionerManualPayoutService } from './services/practitioner-manual-payout.service';
import { RefreshPractitionerWalletService } from './services/refresh-practitioner-wallet.service';
import { ValidateSettlementStatusTransitionService } from './services/validate-settlement-status-transition.service';
import { ExportAdminAccountingDashboardCsvUseCase } from './use-cases/export-admin-accounting-dashboard-csv.use-case';
import { ExportAdminLedgerExplorerCsvUseCase } from './use-cases/export-admin-ledger-explorer-csv.use-case';
import { ExportPractitionerStatementPackageCsvUseCase } from './use-cases/export-practitioner-statement-package-csv.use-case';
import { GetPractitionerWalletUseCase } from './use-cases/get-practitioner-wallet.use-case';
import { GetFinanceOperationEventUseCase } from './use-cases/get-finance-operation-event.use-case';
import { GetAdminAccountingDashboardUseCase } from './use-cases/get-admin-accounting-dashboard.use-case';
import { GetAdminAccountingReconciliationOverviewUseCase } from './use-cases/get-admin-accounting-reconciliation-overview.use-case';
import { GetAdminLedgerJournalEntryUseCase } from './use-cases/get-admin-ledger-journal-entry.use-case';
import { GetAdminPackageSettlementUseCase } from './use-cases/get-admin-package-settlement.use-case';
import { GetAdminPractitionerPayoutBalanceUseCase } from './use-cases/get-admin-practitioner-payout-balance.use-case';
import { ListAdminPractitionerPayoutSummariesUseCase } from './use-cases/list-admin-practitioner-payout-summaries.use-case';
import { GetPractitionerPayoutDetailUseCase } from './use-cases/get-practitioner-payout-detail.use-case';
import { GetPractitionerPayoutProofFileUseCase } from './use-cases/get-practitioner-payout-proof-file.use-case';
import { GetPractitionerStatementUseCase } from './use-cases/get-practitioner-statement.use-case';
import { ListAdminPractitionerSettlementsUseCase } from './use-cases/list-admin-practitioner-settlements.use-case';
import { ListAdminPackageSettlementsUseCase } from './use-cases/list-admin-package-settlements.use-case';
import { ListAdminPractitionerManualPayoutsUseCase } from './use-cases/list-admin-practitioner-manual-payouts.use-case';
import { ListFinanceOperationEventsUseCase } from './use-cases/list-finance-operation-events.use-case';
import { ListAdminLedgerAccountOptionsUseCase } from './use-cases/list-admin-ledger-account-options.use-case';
import { ListAdminLedgerExplorerUseCase } from './use-cases/list-admin-ledger-explorer.use-case';
import { ListAdminAccountingReconciliationUseCase } from './use-cases/list-admin-accounting-reconciliation.use-case';
import { ListPractitionerPayoutDuesUseCase } from './use-cases/list-practitioner-payout-dues.use-case';
import { ListPractitionerPayoutHistoryUseCase } from './use-cases/list-practitioner-payout-history.use-case';
import { ListPractitionerLedgerEntriesUseCase } from './use-cases/list-practitioner-ledger-entries.use-case';
import { ListPractitionerSettlementPayoutsUseCase } from './use-cases/list-practitioner-settlement-payouts.use-case';
import { ListPractitionerSettlementsUseCase } from './use-cases/list-practitioner-settlements.use-case';
import { ListAdminPayoutsUseCase } from './use-cases/list-admin-payouts.use-case';
import { PostPaymentLedgerEntriesUseCase } from './use-cases/post-payment-ledger-entries.use-case';
import { PostPackageSessionLedgerEntriesUseCase } from './use-cases/post-package-session-ledger-entries.use-case';
import { PostRefundLedgerEntriesUseCase } from './use-cases/post-refund-ledger-entries.use-case';
import { RecordPractitionerSettlementPayoutUseCase } from './use-cases/record-practitioner-settlement-payout.use-case';
import { RecordAdminPractitionerManualPayoutUseCase } from './use-cases/record-admin-practitioner-manual-payout.use-case';
import { RecordPractitionerPayoutUseCase } from './use-cases/record-practitioner-payout.use-case';
import { UploadPractitionerPayoutProofUseCase } from './use-cases/upload-practitioner-payout-proof.use-case';
import { ListSettlementDuesDirectoryUseCase } from './use-cases/list-settlement-dues-directory.use-case';
import { ReleasePackageSettlementUseCase } from './use-cases/release-package-settlement.use-case';
import { UpdateAdminAccountingReconciliationReviewUseCase } from './use-cases/update-admin-accounting-reconciliation-review.use-case';

/**
 * Financial Operations Module owns the internal accounting layer:
 * ledger writes, wallet projection, and settlement orchestration.
 * Payments stays the collection layer and only hands off successful payments here.
 */
@Module({
  controllers: [
    PractitionerFinancialOperationsController,
    AdminPractitionerManualPayoutsController,
    AdminPractitionerPayoutsController,
    AdminPractitionerStatementsController,
    AdminPackageSettlementsController,
    AdminFinanceOperationsController,
    AdminPayoutsController,
    AdminAccountingController,
    AdminAccountingReconciliationOperationsController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    FinancialOperationsMapper,
    AccountingReadRepository,
    AccountingReconciliationRepository,
    FinancialOperationsPaymentRepository,
    FinancialOperationsPractitionerRepository,
    LedgerRepository,
    PackageSettlementRepository,
    PractitionerManualPayoutRepository,
    SettlementPayoutRepository,
    SettlementPayoutProofRepository,
    WalletRepository,
    SettlementRepository,
    MoneyAmountService,
    CalculatePackageSessionAllocationService,
    SettlementPayoutProofStorageService,
    ExtractPaymentLedgerBreakdownService,
    AccountingLedgerAccountService,
    AccountingReconciliationDiagnosticsService,
    AccountingReconciliationAlertService,
    AccountingReconciliationOperationsService,
    AccountingReconciliationSchedulerService,
    AccountingReconciliationService,
    AccountingJournalPostingService,
    RecordSettlementPayoutService,
    PackageSettlementService,
    PractitionerManualPayoutBalanceService,
    PractitionerManualPayoutService,
    RefreshPractitionerWalletService,
    ValidateSettlementStatusTransitionService,
    PostPaymentLedgerEntriesUseCase,
    PostPackageSessionLedgerEntriesUseCase,
    PostRefundLedgerEntriesUseCase,
    GetPractitionerWalletUseCase,
    ListPractitionerLedgerEntriesUseCase,
    ListPractitionerSettlementsUseCase,
    ListAdminPractitionerSettlementsUseCase,
    ListAdminPackageSettlementsUseCase,
    GetAdminPractitionerPayoutBalanceUseCase,
    ListAdminPractitionerPayoutSummariesUseCase,
    ListAdminPractitionerManualPayoutsUseCase,
    RecordAdminPractitionerManualPayoutUseCase,
    ListPractitionerSettlementPayoutsUseCase,
    ListPractitionerPayoutDuesUseCase,
    ListPractitionerPayoutHistoryUseCase,
    ListFinanceOperationEventsUseCase,
    GetFinanceOperationEventUseCase,
    GetAdminAccountingDashboardUseCase,
    ExportAdminAccountingDashboardCsvUseCase,
    ExportAdminLedgerExplorerCsvUseCase,
    GetAdminAccountingReconciliationOverviewUseCase,
    ListAdminAccountingReconciliationUseCase,
    ListAdminLedgerAccountOptionsUseCase,
    ListAdminLedgerExplorerUseCase,
    UpdateAdminAccountingReconciliationReviewUseCase,
    GetAdminLedgerJournalEntryUseCase,
    GetAdminPackageSettlementUseCase,
    ListAdminPayoutsUseCase,
    GetPractitionerPayoutDetailUseCase,
    GetPractitionerPayoutProofFileUseCase,
    GetPractitionerStatementUseCase,
    ExportPractitionerStatementPackageCsvUseCase,
    RecordPractitionerSettlementPayoutUseCase,
    RecordPractitionerPayoutUseCase,
    UploadPractitionerPayoutProofUseCase,
    ListSettlementDuesDirectoryUseCase,
    ReleasePackageSettlementUseCase,
  ],
  exports: [
    PostPaymentLedgerEntriesUseCase,
    PostPackageSessionLedgerEntriesUseCase,
    PostRefundLedgerEntriesUseCase,
    PackageSettlementService,
  ],
})
export class FinancialOperationsModule {}
