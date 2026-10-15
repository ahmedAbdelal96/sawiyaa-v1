import { forwardRef, Module } from '@nestjs/common';
import { PaymentsModule } from '@modules/payments/payments.module';
import { FinancialOperationsModule } from '@modules/financial-operations/financial-operations.module';
import { HealthController } from './health.controller';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    PaymentsModule,
    forwardRef(() => FinancialOperationsModule),
    NotificationsModule,
  ],
  controllers: [HealthController, ReadinessController],
  providers: [ReadinessService],
})
export class HealthModule {}
