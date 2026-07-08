import { forwardRef, Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { FinancialRulesModule } from '@modules/financial-rules/financial-rules.module';
import { PaymentGatewayControlModule } from '@modules/payment-gateway-control/payment-gateway-control.module';
import { PackagePlansModule } from '@modules/package-plans/package-plans.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { RefundPoliciesModule } from '@modules/refund-policies/refund-policies.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { CustomerWalletsModule } from '@modules/customer-wallets/customer-wallets.module';
import { CorporateSponsorshipModule } from '@modules/corporate-sponsorship/corporate-sponsorship.module';
import { PatientPaymentsController } from './controllers/patient-payments.controller';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller';
import { AdminPaymentRefundsController } from './controllers/admin-payment-refunds.controller';
import { AdminPatientPaymentsController } from './controllers/admin-patient-payments.controller';
import { PaymentMapper } from './mappers/payment.mapper';
import { PaymobPaymentProviderAdapter } from './providers/paymob-payment-provider.adapter';
import { StripePaymentProviderAdapter } from './providers/stripe-payment-provider.adapter';
import { PaymentPatientRepository } from './repositories/payment-patient.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentSessionRepository } from './repositories/payment-session.repository';
import { OrchestrateSessionPaymentStatusService } from './services/orchestrate-session-payment-status.service';
import { OrchestrateAcademyProgramEnrollmentPaymentStatusService } from './services/orchestrate-academy-program-enrollment-payment-status.service';
import { PaymentProviderCapabilitiesService } from './services/payment-provider-capabilities.service';
import { PaymentConfigStartupValidationService } from './services/payment-config-startup-validation.service';
import { PaymentRuntimeConfigService } from './services/payment-runtime-config.service';
import { PaymentProviderRegistryService } from './services/payment-provider-registry.service';
import { PaymentProviderResolverService } from './services/payment-provider-resolver.service';
import { PaymentGeoContextService } from './services/payment-geo-context.service';
import { ResolveSessionPaymentPricingService } from './services/resolve-session-payment-pricing.service';
import { ValidatePaymentStatusTransitionService } from './services/validate-payment-status-transition.service';
import { ValidateRefundEligibilityService } from './services/validate-refund-eligibility.service';
import { PaymentAccessPolicy } from './policies/payment-access.policy';
import { ExpirePaymentUseCase } from './use-cases/expire-payment.use-case';
import { GetAdminPaymentOpsDetailsUseCase } from './use-cases/get-admin-payment-ops-details.use-case';
import { GetPatientPaymentUseCase } from './use-cases/get-patient-payment.use-case';
import { GetPatientSessionPaymentCapabilitiesUseCase } from './use-cases/get-patient-session-payment-capabilities.use-case';
import { HandlePaymobWebhookUseCase } from './use-cases/handle-paymob-webhook.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { InitiateSessionPaymentUseCase } from './use-cases/initiate-session-payment.use-case';
import { ListAdminPatientPaymentsUseCase } from './use-cases/list-admin-patient-payments.use-case';
import { ListPaymentRefundsUseCase } from './use-cases/list-payment-refunds.use-case';
import { ListPatientPaymentsUseCase } from './use-cases/list-patient-payments.use-case';
import { MarkPaymentFailedUseCase } from './use-cases/mark-payment-failed.use-case';
import { MarkPaymentSucceededUseCase } from './use-cases/mark-payment-succeeded.use-case';
import { ReconcileSessionPaymentReturnUseCase } from './use-cases/reconcile-session-payment-return.use-case';
import { RequestPaymentRefundUseCase } from './use-cases/request-payment-refund.use-case';
import { RetryPaymentRefundUseCase } from './use-cases/retry-payment-refund.use-case';

/**
 * Payments Module owns payment initiation, provider webhook handling,
 * refund execution lifecycle, and session-payment orchestration.
 * Wallets, settlements, commissions, coupons, and broader finance tooling stay outside this phase.
 */
@Module({
  imports: [
    forwardRef(() => PackagePlansModule),
    forwardRef(() => SessionsModule),
    FinancialRulesModule,
    FinancialOperationsModule,
    PaymentGatewayControlModule,
    NotificationsModule,
    CustomerWalletsModule,
    RefundPoliciesModule,
    CorporateSponsorshipModule,
  ],
  controllers: [
    PatientPaymentsController,
    PaymentWebhooksController,
    AdminPaymentRefundsController,
    AdminPatientPaymentsController,
  ],
  providers: [
    PaymentAccessPolicy,
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    AppLoggerService,
    PaymentMapper,
    PaymentRepository,
    PaymentPatientRepository,
    PaymentSessionRepository,
    ResolveSessionPaymentPricingService,
    ValidatePaymentStatusTransitionService,
    ValidateRefundEligibilityService,
    OrchestrateSessionPaymentStatusService,
    OrchestrateAcademyProgramEnrollmentPaymentStatusService,
    PaymentProviderCapabilitiesService,
    PaymentRuntimeConfigService,
    PaymentConfigStartupValidationService,
    PaymentProviderResolverService,
    PaymentGeoContextService,
    StripePaymentProviderAdapter,
    PaymobPaymentProviderAdapter,
    PaymentProviderRegistryService,
    InitiateSessionPaymentUseCase,
    GetAdminPaymentOpsDetailsUseCase,
    GetPatientPaymentUseCase,
    GetPatientSessionPaymentCapabilitiesUseCase,
    ListPatientPaymentsUseCase,
    ListAdminPatientPaymentsUseCase,
    HandleStripeWebhookUseCase,
    HandlePaymobWebhookUseCase,
    MarkPaymentSucceededUseCase,
    MarkPaymentFailedUseCase,
    ExpirePaymentUseCase,
    ReconcileSessionPaymentReturnUseCase,
    ListPaymentRefundsUseCase,
    RequestPaymentRefundUseCase,
    RetryPaymentRefundUseCase,
  ],
  exports: [
    PaymentRepository,
    PaymentMapper,
    PaymentProviderRegistryService,
    PaymentProviderResolverService,
    PaymentGeoContextService,
    PaymentRuntimeConfigService,
    ValidatePaymentStatusTransitionService,
    ExpirePaymentUseCase,
  ],
})
export class PaymentsModule {}
