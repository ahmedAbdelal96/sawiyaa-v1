import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminCustomerWalletController } from './controllers/admin-customer-wallet.controller';
import { PatientCustomerWalletController } from './controllers/patient-customer-wallet.controller';
import { CustomerWalletEntryRepository } from './repositories/customer-wallet-entry.repository';
import { CustomerWalletPatientRepository } from './repositories/customer-wallet-patient.repository';
import { CustomerWalletReservationRepository } from './repositories/customer-wallet-reservation.repository';
import { CustomerWalletRepository } from './repositories/customer-wallet.repository';
import { CustomerWalletAccountingService } from './services/customer-wallet-accounting.service';
import { GetCustomerWalletSummaryUseCase } from './use-cases/get-customer-wallet-summary.use-case';
import { ListCustomerWalletEntriesUseCase } from './use-cases/list-customer-wallet-entries.use-case';

@Module({
  controllers: [PatientCustomerWalletController, AdminCustomerWalletController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    CustomerWalletPatientRepository,
    CustomerWalletRepository,
    CustomerWalletEntryRepository,
    CustomerWalletReservationRepository,
    CustomerWalletAccountingService,
    GetCustomerWalletSummaryUseCase,
    ListCustomerWalletEntriesUseCase,
  ],
  exports: [CustomerWalletAccountingService],
})
export class CustomerWalletsModule {}
