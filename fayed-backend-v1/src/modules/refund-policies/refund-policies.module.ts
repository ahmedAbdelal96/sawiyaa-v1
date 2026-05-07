import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminRefundPoliciesController } from './controllers/admin-refund-policies.controller';
import { PublicRefundPoliciesController } from './controllers/public-refund-policies.controller';
import { RefundPolicyRepository } from './repositories/refund-policy.repository';
import { RefundPolicyHashService } from './services/refund-policy-hash.service';
import { RefundPolicyService } from './services/refund-policy.service';

@Module({
  controllers: [AdminRefundPoliciesController, PublicRefundPoliciesController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    ActiveAccountGuard,
    RefundPolicyRepository,
    RefundPolicyHashService,
    RefundPolicyService,
  ],
  exports: [
    RefundPolicyService,
    RefundPolicyRepository,
    RefundPolicyHashService,
  ],
})
export class RefundPoliciesModule {}
