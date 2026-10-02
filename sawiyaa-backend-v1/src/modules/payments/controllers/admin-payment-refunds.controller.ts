import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { AdminPaymentOpsSuccessResponseDto } from '../dto/payment-response.dto';
import { ListAdminPaymentsDto } from '../dto/list-admin-payments.dto';
import {
  RefundListSuccessResponseDto,
  RefundItemSuccessResponseDto,
} from '../dto/refund-response.dto';
import { RequestRefundDto } from '../dto/request-refund.dto';
import { ManualFinalizeProviderRefundDto } from '../dto/manual-finalize-provider-refund.dto';
import { GetAdminPaymentOpsDetailsUseCase } from '../use-cases/get-admin-payment-ops-details.use-case';
import { ListPaymentRefundsUseCase } from '../use-cases/list-payment-refunds.use-case';
import { RequestPaymentRefundUseCase } from '../use-cases/request-payment-refund.use-case';
import { RetryPaymentRefundUseCase } from '../use-cases/retry-payment-refund.use-case';
import { ListAdminPaymentsUseCase } from '../use-cases/list-admin-payments.use-case';
import { PaymentMapper } from '../mappers/payment.mapper';
import {
  FinalizePackageRefundDto,
  PackageRefundPreviewResponseDto,
} from '../dto/package-refund.dto';
import { PackageRefundPolicyService } from '../services/package-refund-policy.service';

@ApiTags('Admin - Payment Refunds')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
  AppRole.FINANCE_STAFF,
  AppRole.SUPPORT_AGENT,
)
@Controller('admin/payments')
export class AdminPaymentRefundsController {
  constructor(
    private readonly requestPaymentRefundUseCase: RequestPaymentRefundUseCase,
    private readonly retryPaymentRefundUseCase: RetryPaymentRefundUseCase,
    private readonly listPaymentRefundsUseCase: ListPaymentRefundsUseCase,
    private readonly getAdminPaymentOpsDetailsUseCase: GetAdminPaymentOpsDetailsUseCase,
    private readonly securityAuditService: SecurityAuditService,
    private readonly listAdminPaymentsUseCase: ListAdminPaymentsUseCase,
    private readonly paymentMapper: PaymentMapper,
    private readonly packageRefundPolicyService: PackageRefundPolicyService,
  ) {}

  @Get(':id/package-refund-preview')
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({
    summary: 'Preview the package refund policy for a captured package payment',
    description:
      'Returns immutable purchase-price economics, canonical entitlement counts, prior refunds and the maximum wallet refund amount.',
  })
  @ApiParam({ name: 'id', description: 'Package purchase payment id' })
  @ApiResponse({ status: 200, type: PackageRefundPreviewResponseDto })
  previewPackageRefund(@Param('id') paymentId: string) {
    return this.packageRefundPolicyService
      .previewByPaymentId(paymentId)
      .then((item) => ({ item }));
  }

  @Post(':id/package-refund')
  @Permissions(PermissionKey.REFUNDS_APPROVE)
  @ApiOperation({
    summary: 'Finalize a package exit refund to the customer wallet',
    description:
      'Atomically records the reviewed amount, credits the wallet once, closes the package and cancels future reserved Sessions.',
  })
  @ApiParam({ name: 'id', description: 'Package purchase payment id' })
  @ApiBody({ type: FinalizePackageRefundDto })
  @ApiResponse({ status: 201, type: RefundItemSuccessResponseDto })
  finalizePackageRefund(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Body() body: FinalizePackageRefundDto,
  ) {
    return this.packageRefundPolicyService
      .finalizeByPaymentId({
        paymentId,
        actorUserId: currentUser.id,
        finalAmount:
          body.finalAmount === undefined ? null : body.finalAmount.toFixed(2),
        reason: body.reason,
        evidenceReference: body.evidenceReference,
        idempotencyKey: body.idempotencyKey,
      })
      .then((result) => ({
        item: result.refund
          ? this.paymentMapper.toRefundViewModel(result.refund)
          : null,
      }));
  }

  @Get()
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({
    summary: 'List incoming payments',
    description:
      'Returns one operational row per payment with summarized refund state.',
  })
  listPayments(@Query() query: ListAdminPaymentsDto) {
    return this.listAdminPaymentsUseCase.execute(query);
  }

  @Get(':id')
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({
    summary: 'Get payment operational details',
    description:
      'Returns payment/refund/session operational snapshot and recent payment events for admin/support troubleshooting.',
  })
  @ApiParam({ name: 'id', description: 'Payment id' })
  @ApiResponse({ status: 200, type: AdminPaymentOpsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Payment was not found' })
  getPaymentOps(@Param('id') paymentId: string) {
    return this.getAdminPaymentOpsDetailsUseCase.execute({ paymentId });
  }

  @Get(':id/refunds')
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({
    summary: 'List payment refunds',
    description: 'Returns all refund records for a specific payment id.',
  })
  @ApiParam({ name: 'id', description: 'Payment id' })
  @ApiResponse({ status: 200, type: RefundListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Payment was not found' })
  list(@Param('id') paymentId: string) {
    return this.listPaymentRefundsUseCase.execute({ paymentId });
  }

  @Post(':id/refunds')
  @Permissions(PermissionKey.REFUNDS_APPROVE)
  @ApiOperation({
    summary: 'Request a payment refund',
    description:
      'Creates and executes a refund request with eligibility checks and provider execution.',
  })
  @ApiParam({ name: 'id', description: 'Payment id' })
  @ApiBody({ type: RequestRefundDto })
  @ApiResponse({ status: 201, type: RefundItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Refund amount is invalid or payment is not refundable',
  })
  @ApiConflictResponse({
    description:
      'Another refund is already in progress or payment is fully refunded',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Payment was not found' })
  request(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') paymentId: string,
    @Body() body: RequestRefundDto,
  ) {
    return this.requestPaymentRefundUseCase
      .execute({
        paymentId,
        actorUserId: currentUser.id,
        amount: body.amount !== undefined ? body.amount.toFixed(2) : null,
        reason: body.reason ?? null,
        destination: body.destination,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'finance.refund.request',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'Payment',
          resourceId: paymentId,
          targetUserId: currentUser.id,
          metadata: {
            refundId: (result as { item?: { id?: string } }).item?.id ?? null,
            destination: body.destination ?? null,
          },
        });
        return result;
      });
  }

  @Post(':paymentId/refunds/:refundId/retry')
  @Permissions(PermissionKey.REFUNDS_RETRY)
  @ApiOperation({
    summary: 'Retry a failed refund',
    description:
      'Retries a failed refund request with the same amount and provider path.',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment id' })
  @ApiParam({ name: 'refundId', description: 'Refund id' })
  @ApiResponse({ status: 200, type: RefundItemSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Refund is not retryable' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Refund was not found' })
  @HttpCode(200)
  retry(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Param('refundId') refundId: string,
  ) {
    return this.retryPaymentRefundUseCase
      .execute({
        paymentId,
        refundId,
        actorUserId: currentUser.id,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'finance.refund.retry',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PaymentRefund',
          resourceId: refundId,
          targetUserId: currentUser.id,
          metadata: {
            paymentId,
          },
        });
        return result;
      });
  }

  @Post(':paymentId/refunds/:refundId/manual-finalization')
  @Permissions(PermissionKey.REFUNDS_APPROVE)
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Finalize an unresolved Paymob refund from verified operator evidence',
    description:
      'Permitted only for a PROCESSING Paymob refund whose automatic provider inquiry is recorded as UNKNOWN. Financial values are loaded and finalized server-side.',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment id' })
  @ApiParam({ name: 'refundId', description: 'Refund id' })
  @ApiBody({ type: ManualFinalizeProviderRefundDto })
  @ApiResponse({ status: 200, type: RefundItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Refund is not an unresolved Paymob provider outcome',
  })
  @ApiForbiddenResponse({
    description: 'Refund approval permission is required',
  })
  manualFinalization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Param('refundId') refundId: string,
    @Body() body: ManualFinalizeProviderRefundDto,
  ) {
    return this.requestPaymentRefundUseCase
      .manuallyFinalizeProviderRefund({
        paymentId,
        refundId,
        actorUserId: currentUser.id,
        outcome: body.outcome,
        evidenceReference: body.evidenceReference,
        reason: body.reason,
        evidenceMetadata: body.evidenceMetadata,
      })
      .then((refund) => {
        this.securityAuditService.logAsync({
          action: 'finance.refund.manual-provider-finalization',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PaymentRefund',
          resourceId: refundId,
          targetUserId: currentUser.id,
          reason: body.reason,
          metadata: {
            paymentId,
            providerOutcome: body.outcome,
            evidenceReference: body.evidenceReference,
            evidenceMetadata: body.evidenceMetadata ?? {},
          },
        });
        return { item: this.paymentMapper.toRefundViewModel(refund) };
      });
  }
}
