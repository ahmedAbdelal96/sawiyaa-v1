import { Module } from '@nestjs/common';
import { ConfigModule } from '@modules/config/config.module';
import { VerificationModule } from '@modules/verification/verification.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PaymentGatewayControlRepository } from './repositories/payment-gateway-control.repository';
import { PaymentGatewayControlRuntimeService } from './services/payment-gateway-control.runtime';
import { PaymentGatewayPasswordConfirmationService } from './services/payment-gateway-password-confirmation.service';
import { PaymentGatewayControlService } from './services/payment-gateway-control.service';
import { AdminPaymentGatewayControlController } from './controllers/admin-payment-gateway-control.controller';

@Module({
  imports: [ConfigModule, VerificationModule, AuthModule],
  controllers: [AdminPaymentGatewayControlController],
  providers: [
    PaymentGatewayControlRepository,
    PaymentGatewayControlRuntimeService,
    PaymentGatewayPasswordConfirmationService,
    PaymentGatewayControlService,
  ],
  exports: [PaymentGatewayControlRuntimeService, PaymentGatewayControlService],
})
export class PaymentGatewayControlModule {}
