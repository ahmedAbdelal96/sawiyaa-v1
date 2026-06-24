import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { SecurityAuditModule } from '@common/security-audit/security-audit.module';
import { FinancialRulesModule } from '@modules/financial-rules/financial-rules.module';
import { AdminCorporateOrganizationsController } from './controllers/admin-corporate-organizations.controller';
import { AdminCorporateContractsController } from './controllers/admin-corporate-contracts.controller';
import { AdminCorporateBenefitPlansController } from './controllers/admin-corporate-benefit-plans.controller';
import { AdminCorporateCodeBatchesController } from './controllers/admin-corporate-code-batches.controller';
import { PatientCorporateSponsorshipController } from './controllers/patient-corporate-sponsorship.controller';
import { CorporatePresenter } from './presenters/corporate.presenter';
import { CorporateOrganizationRepository } from './repositories/corporate-organization.repository';
import { CorporateContractRepository } from './repositories/corporate-contract.repository';
import { CorporateBenefitPlanRepository } from './repositories/corporate-benefit-plan.repository';
import { CorporateCodeBatchRepository } from './repositories/corporate-code-batch.repository';
import { CorporateBenefitCodeRepository } from './repositories/corporate-benefit-code.repository';
import { CorporateSessionSponsorshipRepository } from './repositories/corporate-session-sponsorship.repository';
import { CorporateLedgerRepository } from './repositories/corporate-ledger.repository';
import { CorporateCodeHashService } from './services/corporate-code-hash.service';
import { CorporateCodeGeneratorService } from './services/corporate-code-generator.service';
import { CorporateSponsorshipPaymentService } from './services/corporate-sponsorship-payment.service';
import { CorporateSponsorshipConsumeService } from './services/corporate-sponsorship-consume.service';
import {
  ListOrganizationsUseCase,
  GetOrganizationUseCase,
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  UpdateOrganizationStatusUseCase,
} from './use-cases/organization.use-cases';
import {
  ListContractsUseCase,
  GetContractUseCase,
  CreateContractUseCase,
  UpdateContractUseCase,
  UpdateContractStatusUseCase,
} from './use-cases/contract.use-cases';
import {
  ListBenefitPlansUseCase,
  GetBenefitPlanUseCase,
  CreateBenefitPlanUseCase,
  UpdateBenefitPlanUseCase,
  UpdateBenefitPlanStatusUseCase,
} from './use-cases/benefit-plan.use-cases';
import {
  GenerateCodeBatchUseCase,
  ListCodeBatchesUseCase,
  GetCodeBatchUseCase,
  RevokeCodeBatchUseCase,
} from './use-cases/code-batch.use-cases';
import {
  PreviewCorporateSponsorshipUseCase,
  ReserveCorporateSponsorshipUseCase,
  ReleaseCorporateSponsorshipUseCase,
} from './use-cases/patient-corporate-sponsorship.use-cases';

@Module({
  imports: [SecurityAuditModule, FinancialRulesModule],
  controllers: [
    AdminCorporateOrganizationsController,
    AdminCorporateContractsController,
    AdminCorporateBenefitPlansController,
    AdminCorporateCodeBatchesController,
    PatientCorporateSponsorshipController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionResolverService,
    CorporatePresenter,
    CorporateOrganizationRepository,
    CorporateContractRepository,
    CorporateBenefitPlanRepository,
    CorporateCodeBatchRepository,
    CorporateBenefitCodeRepository,
    CorporateSessionSponsorshipRepository,
    CorporateLedgerRepository,
    CorporateCodeHashService,
    CorporateCodeGeneratorService,
    CorporateSponsorshipPaymentService,
    CorporateSponsorshipConsumeService,
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    UpdateOrganizationStatusUseCase,
    ListContractsUseCase,
    GetContractUseCase,
    CreateContractUseCase,
    UpdateContractUseCase,
    UpdateContractStatusUseCase,
    ListBenefitPlansUseCase,
    GetBenefitPlanUseCase,
    CreateBenefitPlanUseCase,
    UpdateBenefitPlanUseCase,
    UpdateBenefitPlanStatusUseCase,
    GenerateCodeBatchUseCase,
    ListCodeBatchesUseCase,
    GetCodeBatchUseCase,
    RevokeCodeBatchUseCase,
    PreviewCorporateSponsorshipUseCase,
    ReserveCorporateSponsorshipUseCase,
    ReleaseCorporateSponsorshipUseCase,
  ],
  exports: [
    CorporateOrganizationRepository,
    CorporateContractRepository,
    CorporateBenefitPlanRepository,
    CorporateCodeBatchRepository,
    CorporateBenefitCodeRepository,
    CorporateSessionSponsorshipRepository,
    CorporateCodeHashService,
    CorporateCodeGeneratorService,
    CorporateSponsorshipPaymentService,
    CorporateSponsorshipConsumeService,
  ],
})
export class CorporateSponsorshipModule {}