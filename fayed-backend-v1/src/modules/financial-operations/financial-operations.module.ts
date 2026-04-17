import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminFinanceOperationsController } from './controllers/admin-finance-operations.controller';
import { AdminPayoutsController } from './controllers/admin-payouts.controller';
import { AdminPractitionerPayoutsController } from './controllers/admin-practitioner-payouts.controller';
import { AdminPractitionerStatementsController } from './controllers/admin-practitioner-statements.controller';
import { AdminSettlementsController } from './controllers/admin-settlements.controller';
import { PractitionerFinancialOperationsController } from './controllers/practitioner-financial-operations.controller';
import { FinancialOperationsMapper } from './mappers/financial-operations.mapper';
import { FinancialOperationsPaymentRepository } from './repositories/financial-operations-payment.repository';
import { FinancialOperationsPractitionerRepository } from './repositories/financial-operations-practitioner.repository';
import { LedgerRepository } from './repositories/ledger.repository';
import { SettlementPayoutRepository } from './repositories/settlement-payout.repository';
import { SettlementPayoutProofRepository } from './repositories/settlement-payout-proof.repository';
import { SettlementRepository } from './repositories/settlement.repository';
import { WalletRepository } from './repositories/wallet.repository';
import { ExtractPaymentLedgerBreakdownService } from './services/extract-payment-ledger-breakdown.service';
import { MoneyAmountService } from './services/money-amount.service';
import { SettlementPayoutProofStorageService } from './services/settlement-payout-proof-storage.service';
import { RecordSettlementPayoutService } from './services/record-settlement-payout.service';
import { RefreshPractitionerWalletService } from './services/refresh-practitioner-wallet.service';
import { ValidateSettlementStatusTransitionService } from './services/validate-settlement-status-transition.service';
import { GenerateSettlementBatchUseCase } from './use-cases/generate-settlement-batch.use-case';
import { GetPractitionerWalletUseCase } from './use-cases/get-practitioner-wallet.use-case';
import { GetFinanceOperationEventUseCase } from './use-cases/get-finance-operation-event.use-case';
import { GetPractitionerPayoutDetailUseCase } from './use-cases/get-practitioner-payout-detail.use-case';
import { GetPractitionerPayoutProofFileUseCase } from './use-cases/get-practitioner-payout-proof-file.use-case';
import { GetPractitionerStatementUseCase } from './use-cases/get-practitioner-statement.use-case';
import { GetSettlementBatchDetailsUseCase } from './use-cases/get-settlement-batch-details.use-case';
import { ListAdminPractitionerSettlementsUseCase } from './use-cases/list-admin-practitioner-settlements.use-case';
import { ListFinanceOperationEventsUseCase } from './use-cases/list-finance-operation-events.use-case';
import { ListPractitionerPayoutDuesUseCase } from './use-cases/list-practitioner-payout-dues.use-case';
import { ListPractitionerPayoutHistoryUseCase } from './use-cases/list-practitioner-payout-history.use-case';
import { ListPractitionerLedgerEntriesUseCase } from './use-cases/list-practitioner-ledger-entries.use-case';
import { ListPractitionerSettlementPayoutsUseCase } from './use-cases/list-practitioner-settlement-payouts.use-case';
import { ListPractitionerSettlementsUseCase } from './use-cases/list-practitioner-settlements.use-case';
import { ListSettlementBatchesUseCase } from './use-cases/list-settlement-batches.use-case';
import { ListAdminPayoutsUseCase } from './use-cases/list-admin-payouts.use-case';
import { MarkSettlementFailedUseCase } from './use-cases/mark-settlement-failed.use-case';
import { MarkSettlementPaidUseCase } from './use-cases/mark-settlement-paid.use-case';
import { PostPaymentLedgerEntriesUseCase } from './use-cases/post-payment-ledger-entries.use-case';
import { PostRefundLedgerEntriesUseCase } from './use-cases/post-refund-ledger-entries.use-case';
import { RecordPractitionerSettlementPayoutUseCase } from './use-cases/record-practitioner-settlement-payout.use-case';
import { RecordPractitionerPayoutUseCase } from './use-cases/record-practitioner-payout.use-case';
import { UploadPractitionerPayoutProofUseCase } from './use-cases/upload-practitioner-payout-proof.use-case';
import { ListSettlementDuesDirectoryUseCase } from './use-cases/list-settlement-dues-directory.use-case';

/**
 * Financial Operations Module owns the internal accounting layer:
 * ledger writes, wallet projection, and settlement orchestration.
 * Payments stays the collection layer and only hands off successful payments here.
 */
@Module({
  controllers: [
    PractitionerFinancialOperationsController,
    AdminPractitionerPayoutsController,
    AdminPractitionerStatementsController,
    AdminSettlementsController,
    AdminFinanceOperationsController,
    AdminPayoutsController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    FinancialOperationsMapper,
    FinancialOperationsPaymentRepository,
    FinancialOperationsPractitionerRepository,
    LedgerRepository,
    SettlementPayoutRepository,
    SettlementPayoutProofRepository,
    WalletRepository,
    SettlementRepository,
    MoneyAmountService,
    SettlementPayoutProofStorageService,
    ExtractPaymentLedgerBreakdownService,
    RecordSettlementPayoutService,
    RefreshPractitionerWalletService,
    ValidateSettlementStatusTransitionService,
    PostPaymentLedgerEntriesUseCase,
    PostRefundLedgerEntriesUseCase,
    GetPractitionerWalletUseCase,
    ListPractitionerLedgerEntriesUseCase,
    ListPractitionerSettlementsUseCase,
    ListAdminPractitionerSettlementsUseCase,
    ListPractitionerSettlementPayoutsUseCase,
    ListPractitionerPayoutDuesUseCase,
    ListPractitionerPayoutHistoryUseCase,
    GenerateSettlementBatchUseCase,
    ListSettlementBatchesUseCase,
    ListFinanceOperationEventsUseCase,
    GetFinanceOperationEventUseCase,
    ListAdminPayoutsUseCase,
    GetPractitionerPayoutDetailUseCase,
    GetPractitionerPayoutProofFileUseCase,
    GetPractitionerStatementUseCase,
    GetSettlementBatchDetailsUseCase,
    MarkSettlementPaidUseCase,
    MarkSettlementFailedUseCase,
    RecordPractitionerSettlementPayoutUseCase,
    RecordPractitionerPayoutUseCase,
    UploadPractitionerPayoutProofUseCase,
    ListSettlementDuesDirectoryUseCase,
  ],
  exports: [PostPaymentLedgerEntriesUseCase, PostRefundLedgerEntriesUseCase],
})
export class FinancialOperationsModule {}
