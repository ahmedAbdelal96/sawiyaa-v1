import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminSessionsReportController } from './controllers/admin-sessions-report.controller';
import { AdminPaymentsRevenueReportController } from './controllers/admin-payments-revenue-report.controller';
import { AdminSupportReportController } from './controllers/admin-support-report.controller';
import { AdminCareRequestsReportController } from './controllers/admin-care-requests-report.controller';
import { AdminPayoutsReportController } from './controllers/admin-payouts-report.controller';
import { CARE_REQUESTS_REPORT_PROVIDER } from './providers/care-requests-report.provider';
import { PAYMENTS_REVENUE_REPORT_PROVIDER } from './providers/payments-revenue-report.provider';
import { PAYOUTS_REPORT_PROVIDER } from './providers/payouts-report.provider';
import { SESSIONS_REPORT_PROVIDER } from './providers/sessions-report.provider';
import { SUPPORT_REPORT_PROVIDER } from './providers/support-report.provider';
import { PrismaCareRequestsReportProvider } from './providers/prisma-care-requests-report.provider';
import { PrismaPaymentsRevenueReportProvider } from './providers/prisma-payments-revenue-report.provider';
import { PrismaPayoutsReportProvider } from './providers/prisma-payouts-report.provider';
import { PrismaSessionsReportProvider } from './providers/prisma-sessions-report.provider';
import { PrismaSupportReportProvider } from './providers/prisma-support-report.provider';
import { GetAdminCareRequestsReportOverviewUseCase } from './use-cases/get-admin-care-requests-report-overview.use-case';
import { GetAdminPaymentsRevenueReportOverviewUseCase } from './use-cases/get-admin-payments-revenue-report-overview.use-case';
import { GetAdminPayoutsReportOverviewUseCase } from './use-cases/get-admin-payouts-report-overview.use-case';
import { GetAdminSessionsReportOverviewUseCase } from './use-cases/get-admin-sessions-report-overview.use-case';
import { GetAdminSupportReportOverviewUseCase } from './use-cases/get-admin-support-report-overview.use-case';
import { ListAdminCareRequestsReportRowsUseCase } from './use-cases/list-admin-care-requests-report-rows.use-case';
import { ListAdminPaymentsRevenueReportRowsUseCase } from './use-cases/list-admin-payments-revenue-report-rows.use-case';
import { ListAdminPayoutsReportRowsUseCase } from './use-cases/list-admin-payouts-report-rows.use-case';
import { ListAdminSessionsReportRowsUseCase } from './use-cases/list-admin-sessions-report-rows.use-case';
import { ListAdminSupportReportRowsUseCase } from './use-cases/list-admin-support-report-rows.use-case';

@Module({
  controllers: [
    AdminSessionsReportController,
    AdminPaymentsRevenueReportController,
    AdminSupportReportController,
    AdminCareRequestsReportController,
    AdminPayoutsReportController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    {
      provide: SESSIONS_REPORT_PROVIDER,
      useClass: PrismaSessionsReportProvider,
    },
    {
      provide: PAYMENTS_REVENUE_REPORT_PROVIDER,
      useClass: PrismaPaymentsRevenueReportProvider,
    },
    { provide: SUPPORT_REPORT_PROVIDER, useClass: PrismaSupportReportProvider },
    {
      provide: CARE_REQUESTS_REPORT_PROVIDER,
      useClass: PrismaCareRequestsReportProvider,
    },
    { provide: PAYOUTS_REPORT_PROVIDER, useClass: PrismaPayoutsReportProvider },
    GetAdminSessionsReportOverviewUseCase,
    ListAdminSessionsReportRowsUseCase,
    GetAdminPaymentsRevenueReportOverviewUseCase,
    ListAdminPaymentsRevenueReportRowsUseCase,
    GetAdminSupportReportOverviewUseCase,
    ListAdminSupportReportRowsUseCase,
    GetAdminCareRequestsReportOverviewUseCase,
    ListAdminCareRequestsReportRowsUseCase,
    GetAdminPayoutsReportOverviewUseCase,
    ListAdminPayoutsReportRowsUseCase,
  ],
})
export class ReportsModule {}
