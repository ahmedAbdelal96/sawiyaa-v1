import { Module } from '@nestjs/common';
import { PaymentsModule } from '@modules/payments/payments.module';
import { HealthController } from './health.controller';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

@Module({
  imports: [PaymentsModule],
  controllers: [HealthController, ReadinessController],
  providers: [ReadinessService],
})
export class HealthModule {}
