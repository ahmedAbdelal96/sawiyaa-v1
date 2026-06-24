import {
  Body,
  Controller,
  Get,
  Param,
  Req,
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
import { Request } from 'express';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { InitiateSessionPaymentDto } from '../dto/initiate-session-payment.dto';
import { ListPatientPaymentsDto } from '../dto/list-patient-payments.dto';
import {
  PaymentItemSuccessResponseDto,
  PaymentsListSuccessResponseDto,
} from '../dto/payment-response.dto';
import { SessionPaymentCapabilitiesSuccessResponseDto } from '../dto/session-payment-capabilities.dto';
import { ReconcileSessionPaymentReturnSuccessResponseDto } from '../dto/reconcile-session-payment-return-response.dto';
import { ReconcileSessionPaymentReturnDto } from '../dto/reconcile-session-payment-return.dto';
import { GetPatientSessionPaymentCapabilitiesUseCase } from '../use-cases/get-patient-session-payment-capabilities.use-case';
import { GetPatientPaymentUseCase } from '../use-cases/get-patient-payment.use-case';
import { InitiateSessionPaymentUseCase } from '../use-cases/initiate-session-payment.use-case';
import { ListPatientPaymentsUseCase } from '../use-cases/list-patient-payments.use-case';
import { ReconcileSessionPaymentReturnUseCase } from '../use-cases/reconcile-session-payment-return.use-case';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me')
export class PatientPaymentsController {
  constructor(
    private readonly initiateSessionPaymentUseCase: InitiateSessionPaymentUseCase,
    private readonly listPatientPaymentsUseCase: ListPatientPaymentsUseCase,
    private readonly getPatientPaymentUseCase: GetPatientPaymentUseCase,
    private readonly getPatientSessionPaymentCapabilitiesUseCase: GetPatientSessionPaymentCapabilitiesUseCase,
    private readonly reconcileSessionPaymentReturnUseCase: ReconcileSessionPaymentReturnUseCase,
  ) {}

  @Post('sessions/:id/payments/initiate')
  @ApiOperation({
    summary: 'Initiate payment for a patient-owned session',
    description:
      'Creates or reuses a payment attempt for a patient-owned session that is still waiting for payment, then hands off to the provider selected by backend routing policy.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: InitiateSessionPaymentDto })
  @ApiResponse({ status: 201, type: PaymentItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Session is not payable, routing context is invalid/unsupported, or pricing is unavailable',
  })
  @ApiConflictResponse({
    description:
      'A successful payment already exists or the payment session has already expired',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active patient accounts may initiate payments for their own sessions',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or patient-owned session was not found',
  })
  initiate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
    @Body() body: InitiateSessionPaymentDto,
    @Req() request: Request,
  ) {
    return this.initiateSessionPaymentUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
      acceptedRefundPolicyId: body.acceptedRefundPolicyId,
      couponCode: body.couponCode ?? null,
      useWalletBalance: body.useWalletBalance ?? false,
      paymobMethod: body.paymobMethod ?? null,
      returnUrl: body.returnUrl ?? null,
      displayLocale: locale,
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : null,
      ipAddress: request.ip ?? null,
    });
  }

  @Get('sessions/:id/payments/capabilities')
  @ApiOperation({
    summary: 'Get patient session payment capabilities',
    description:
      'Returns the currently enabled Paymob checkout methods for the authenticated patient session so the frontend can render a truthful provider-side selector only when needed.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({
    status: 200,
    type: SessionPaymentCapabilitiesSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or patient-owned session was not found',
  })
  capabilities(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.getPatientSessionPaymentCapabilitiesUseCase.execute({
      userId: currentUser.id,
      sessionId,
    });
  }

  @Get('payments')
  @ApiOperation({
    summary: 'List patient payments',
    description:
      'Returns patient-owned payment attempts and completed payments with stable pagination and optional status filtering.',
  })
  @ApiResponse({ status: 200, type: PaymentsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListPatientPaymentsDto,
  ) {
    return this.listPatientPaymentsUseCase.execute({
      userId: currentUser.id,
      locale,
      query,
    });
  }

  @Get('payments/:id')
  @ApiOperation({
    summary: 'Get patient-owned payment details',
    description:
      'Returns a single payment only when it belongs to the authenticated patient.',
  })
  @ApiParam({ name: 'id', description: 'Payment id' })
  @ApiResponse({ status: 200, type: PaymentItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({ description: 'Payment was not found' })
  details(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') paymentId: string,
  ) {
    return this.getPatientPaymentUseCase.execute({
      userId: currentUser.id,
      locale,
      paymentId,
    });
  }

  @Post('sessions/:id/payments/reconcile-return')
  @ApiOperation({
    summary: 'Reconcile a hosted checkout return for a patient-owned session',
    description:
      'Best-effort reconciliation for hosted payment returns. Uses provider return data to finalize a pending payment and confirm the session when the provider webhook is delayed or missing.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: ReconcileSessionPaymentReturnDto })
  @ApiResponse({
    status: 200,
    type: ReconcileSessionPaymentReturnSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active patient accounts may reconcile hosted checkout returns for their own sessions',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or patient-owned session was not found',
  })
  reconcileReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: ReconcileSessionPaymentReturnDto,
  ) {
    return this.reconcileSessionPaymentReturnUseCase.execute({
      userId: currentUser.id,
      sessionId,
      providerReference: body.providerReference ?? null,
      redirectStatus: body.redirectStatus ?? null,
      success: body.success ?? null,
      pending: body.pending ?? null,
    });
  }
}
