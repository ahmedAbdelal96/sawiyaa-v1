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
  ApiBearerAuth,
  ApiBody,
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
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreatePackagePurchaseDto } from '../dto/create-package-purchase.dto';
import { InitiatePackagePurchasePaymentDto } from '../dto/initiate-package-purchase-payment.dto';
import { ListMyPackagePurchasesDto } from '../dto/list-my-package-purchases.dto';
import {
  PatientPackagePurchaseItemSuccessResponseDto,
  PatientPackagePurchaseListSuccessResponseDto,
} from '../dto/package-purchase-response.dto';
import { PaymentItemSuccessResponseDto } from '@modules/payments/dto/payment-response.dto';
import { Request } from 'express';
import { CreatePackagePurchaseUseCase } from '../use-cases/create-package-purchase.use-case';
import { GetMyPackagePurchaseUseCase } from '../use-cases/get-my-package-purchase.use-case';
import { ListMyPackagePurchasesUseCase } from '../use-cases/list-my-package-purchases.use-case';
import { InitiatePackagePurchasePaymentUseCase } from '../use-cases/initiate-package-purchase-payment.use-case';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';

@ApiTags('Patients - Package Purchases')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, ActiveAccountGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/package-purchases')
export class PatientPackagePurchasesController {
  constructor(
    private readonly createPackagePurchaseUseCase: CreatePackagePurchaseUseCase,
    private readonly listMyPackagePurchasesUseCase: ListMyPackagePurchasesUseCase,
    private readonly getMyPackagePurchaseUseCase: GetMyPackagePurchaseUseCase,
    private readonly initiatePackagePurchasePaymentUseCase: InitiatePackagePurchasePaymentUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a standardized package purchase draft',
    description:
      'Creates a pending standardized package purchase with real linked sessions held for payment without creating a payment yet.',
  })
  @ApiBody({ type: CreatePackagePurchaseDto })
  @ApiResponse({
    status: 201,
    type: PatientPackagePurchaseItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may create package purchases',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile, plan, or practitioner was not found',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreatePackagePurchaseDto,
    @Req() request: Request,
  ) {
    return this.createPackagePurchaseUseCase
      .execute({
        userId: currentUser.id,
        locale,
        packagePlanCode: body.packagePlanCode,
        practitionerSlug: body.practitionerSlug,
        durationMinutes: body.durationMinutes,
        sessionMode: body.sessionMode,
        requestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
        selectedSessionSlots: body.selectedSessionSlots,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({
    summary: 'List my standardized package purchases',
    description:
      'Returns the authenticated patient package purchase history with stable pagination.',
  })
  @ApiResponse({
    status: 200,
    type: PatientPackagePurchaseListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may view package purchases',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListMyPackagePurchasesDto,
  ) {
    return this.listMyPackagePurchasesUseCase
      .execute({
        userId: currentUser.id,
        locale,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a patient-owned standardized package purchase',
    description:
      'Returns a single package purchase only when it belongs to the authenticated patient.',
  })
  @ApiParam({ name: 'id', description: 'Package purchase id' })
  @ApiResponse({
    status: 200,
    type: PatientPackagePurchaseItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may view package purchases',
  })
  @ApiNotFoundResponse({ description: 'Package purchase was not found' })
  details(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') purchaseId: string,
  ) {
    return this.getMyPackagePurchaseUseCase
      .execute({
        userId: currentUser.id,
        locale,
        purchaseId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/payments/initiate')
  @ApiOperation({
    summary: 'Initiate payment for a standardized package purchase',
    description:
      'Creates or reuses a payment attempt for a pending standardized package purchase without activating the purchase or confirming sessions.',
  })
  @ApiParam({ name: 'id', description: 'Package purchase id' })
  @ApiBody({ type: InitiatePackagePurchasePaymentDto })
  @ApiResponse({ status: 201, type: PaymentItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may initiate package payments',
  })
  @ApiNotFoundResponse({ description: 'Package purchase was not found' })
  initiatePayment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') purchaseId: string,
    @Body() body: InitiatePackagePurchasePaymentDto,
    @Req() request: Request,
  ) {
    return this.initiatePackagePurchasePaymentUseCase.execute({
      userId: currentUser.id,
      purchaseId,
      acceptedRefundPolicyId: body.acceptedRefundPolicyId,
      returnUrl: body.returnUrl ?? null,
      displayLocale: locale,
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : null,
      ipAddress: request.ip ?? null,
      requestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
    });
  }
}
