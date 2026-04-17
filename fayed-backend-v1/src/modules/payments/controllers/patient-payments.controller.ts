import {
  Body,
  Controller,
  Get,
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
import { GetPatientPaymentUseCase } from '../use-cases/get-patient-payment.use-case';
import { InitiateSessionPaymentUseCase } from '../use-cases/initiate-session-payment.use-case';
import { ListPatientPaymentsUseCase } from '../use-cases/list-patient-payments.use-case';

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
    description: 'A successful payment already exists or the payment session has already expired',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may initiate payments for their own sessions',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or patient-owned session was not found',
  })
  initiate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
    @Body() body: InitiateSessionPaymentDto,
  ) {
    return this.initiateSessionPaymentUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
      couponCode: body.couponCode ?? null,
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
}
