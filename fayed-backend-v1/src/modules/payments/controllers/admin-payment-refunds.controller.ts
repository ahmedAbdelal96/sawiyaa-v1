import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
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
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AdminPaymentOpsSuccessResponseDto } from '../dto/payment-response.dto';
import {
  RefundListSuccessResponseDto,
  RefundItemSuccessResponseDto,
} from '../dto/refund-response.dto';
import { RequestRefundDto } from '../dto/request-refund.dto';
import { GetAdminPaymentOpsDetailsUseCase } from '../use-cases/get-admin-payment-ops-details.use-case';
import { ListPaymentRefundsUseCase } from '../use-cases/list-payment-refunds.use-case';
import { RequestPaymentRefundUseCase } from '../use-cases/request-payment-refund.use-case';
import { RetryPaymentRefundUseCase } from '../use-cases/retry-payment-refund.use-case';

@ApiTags('Admin - Payment Refunds')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/payments')
export class AdminPaymentRefundsController {
  constructor(
    private readonly requestPaymentRefundUseCase: RequestPaymentRefundUseCase,
    private readonly retryPaymentRefundUseCase: RetryPaymentRefundUseCase,
    private readonly listPaymentRefundsUseCase: ListPaymentRefundsUseCase,
    private readonly getAdminPaymentOpsDetailsUseCase: GetAdminPaymentOpsDetailsUseCase,
  ) {}

  @Get(':id')
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
    return this.requestPaymentRefundUseCase.execute({
      paymentId,
      actorUserId: currentUser.id,
      amount: body.amount !== undefined ? body.amount.toFixed(2) : null,
      reason: body.reason ?? null,
      destination: body.destination,
    });
  }

  @Post(':paymentId/refunds/:refundId/retry')
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
    return this.retryPaymentRefundUseCase.execute({
      paymentId,
      refundId,
      actorUserId: currentUser.id,
    });
  }
}
