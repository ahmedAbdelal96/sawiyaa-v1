import { Module } from '@nestjs/common';
import { ConfigModule } from '@modules/config/config.module';
import { VerificationModule } from '@modules/verification/verification.module';
import { PaymentGatewayControlRepository } from './repositories/payment-gateway-control.repository';
import { PaymentGatewayControlRuntimeService } from './services/payment-gateway-control.runtime';
import { PaymentGatewayControlService } from './services/payment-gateway-control.service';
import { AdminPaymentGatewayControlController } from './controllers/admin-payment-gateway-control.controller';

@Module({
  imports: [ConfigModule, VerificationModule],
  controllers: [AdminPaymentGatewayControlController],
  providers: [
    PaymentGatewayControlRepository,
    PaymentGatewayControlRuntimeService,
    PaymentGatewayControlService,
  ],
  exports: [PaymentGatewayControlRuntimeService, PaymentGatewayControlService],
})
export class PaymentGatewayControlModule {}

