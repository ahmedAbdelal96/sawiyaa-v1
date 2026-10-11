import { forwardRef, Module } from '@nestjs/common';
import { PaymentsModule } from '@modules/payments/payments.module';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { HealthController } from './health.controller';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

@Module({
  imports: [PaymentsModule, forwardRef(() => FinancialOperationsModule)],
  controllers: [HealthController, ReadinessController],
  providers: [ReadinessService],
})
export class HealthModule {}
