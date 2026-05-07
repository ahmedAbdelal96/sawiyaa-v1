import { forwardRef, Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPackagePlansController } from './controllers/admin-package-plans.controller';
import { AdminPackagePlanSettingsController } from './controllers/admin-package-plan-settings.controller';
import { PatientPackagePurchasesController } from './controllers/patient-package-purchases.controller';
import { PublicPackagePlansController } from './controllers/public-package-plans.controller';
import { PatientPackageQuotesController } from './controllers/patient-package-quotes.controller';
import { PackagePlanPresenter } from './presenters/package-plan.presenter';
import { PackagePlanQuotePresenter } from './presenters/package-plan-quote.presenter';
import { PackagePurchasePresenter } from './presenters/package-purchase.presenter';
import { PackagePlanRepository } from './repositories/package-plan.repository';
import { PatientPackagePurchaseRepository } from './repositories/package-purchase.repository';
import { PackagePlanAdminService } from './services/package-plan-admin.service';
import { PackagePlanPolicyService } from './services/package-plan-policy.service';
import { PackagePurchaseExpirySweeperService } from './services/package-purchase-expiry-sweeper.service';
import { PackageQuoteCalculatorService } from './services/package-quote-calculator.service';
import { ValidatePackagePurchaseSlotsService } from './services/validate-package-purchase-slots.service';
import { ValidatePackagePlanService } from './services/validate-package-plan.service';
import { GetPackagePlanUseCase } from './use-cases/get-package-plan.use-case';
import { GetPackagePlanSettingsUseCase } from './use-cases/get-package-plan-settings.use-case';
import { ListPackagePlansUseCase } from './use-cases/list-package-plans.use-case';
import { FinancialRulesModule } from '@modules/financial-rules/financial-rules.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { RefundPoliciesModule } from '@modules/refund-policies/refund-policies.module';
import { PatientsModule } from '@modules/patients/patients.module';
import { PractitionersModule } from '@modules/practitioners/practitioners.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { ConfigModule } from '@modules/config/config.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { ListPublicPackagePlansUseCase } from './use-cases/list-public-package-plans.use-case';
import { QuotePackagePlanUseCase } from './use-cases/quote-package-plan.use-case';
import { CreatePackagePurchaseUseCase } from './use-cases/create-package-purchase.use-case';
import { ExpirePackagePurchaseUseCase } from './use-cases/expire-package-purchase.use-case';
import { GetMyPackagePurchaseUseCase } from './use-cases/get-my-package-purchase.use-case';
import { HandlePackagePurchasePaymentFailureUseCase } from './use-cases/handle-package-purchase-payment-failure.use-case';
import { HandlePackagePurchasePaymentSuccessUseCase } from './use-cases/handle-package-purchase-payment-success.use-case';
import { ReconcilePackagePurchasePaymentUseCase } from './use-cases/reconcile-package-purchase-payment.use-case';
import { ReconcilePackageSettlementUseCase } from './use-cases/reconcile-package-settlement.use-case';
import { ListMyPackagePurchasesUseCase } from './use-cases/list-my-package-purchases.use-case';
import { InitiatePackagePurchasePaymentUseCase } from './use-cases/initiate-package-purchase-payment.use-case';
import { UpdatePackagePlanUseCase } from './use-cases/update-package-plan.use-case';
import { UpdatePackagePlanSettingsUseCase } from './use-cases/update-package-plan-settings.use-case';

@Module({
  imports: [
    ConfigModule,
    PractitionersModule,
    PatientsModule,
    SessionsModule,
    NotificationsModule,
    FinancialRulesModule,
    RefundPoliciesModule,
    forwardRef(() => PaymentsModule),
    FinancialOperationsModule,
  ],
  controllers: [
    AdminPackagePlansController,
    AdminPackagePlanSettingsController,
    PatientPackagePurchasesController,
    PublicPackagePlansController,
    PatientPackageQuotesController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    ActiveAccountGuard,
    PackagePlanRepository,
    PackagePlanPresenter,
    PackagePlanQuotePresenter,
    PackagePurchasePresenter,
    PackagePlanAdminService,
    PackagePlanPolicyService,
    PackagePurchaseExpirySweeperService,
    PackageQuoteCalculatorService,
    PatientPackagePurchaseRepository,
    ValidatePackagePlanService,
    ValidatePackagePurchaseSlotsService,
    ListPackagePlansUseCase,
    GetPackagePlanUseCase,
    UpdatePackagePlanUseCase,
    GetPackagePlanSettingsUseCase,
    UpdatePackagePlanSettingsUseCase,
    ListPublicPackagePlansUseCase,
    CreatePackagePurchaseUseCase,
    InitiatePackagePurchasePaymentUseCase,
    HandlePackagePurchasePaymentSuccessUseCase,
    HandlePackagePurchasePaymentFailureUseCase,
    ReconcilePackagePurchasePaymentUseCase,
    ReconcilePackageSettlementUseCase,
    ExpirePackagePurchaseUseCase,
    GetMyPackagePurchaseUseCase,
    ListMyPackagePurchasesUseCase,
    QuotePackagePlanUseCase,
  ],
  exports: [
    HandlePackagePurchasePaymentSuccessUseCase,
    HandlePackagePurchasePaymentFailureUseCase,
    ReconcilePackagePurchasePaymentUseCase,
    ReconcilePackageSettlementUseCase,
    ExpirePackagePurchaseUseCase,
  ],
})
export class PackagePlansModule {}
