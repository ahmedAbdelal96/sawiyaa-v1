import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { Roles } from '@common/decorators/roles.decorator';
import { ThrottlePolicy } from '@common/decorators/throttle-policy.decorator';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { PaymentGatewayControlService } from '../services/payment-gateway-control.service';

@ApiTags('Admin - Payment Gateway Control')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/payment-gateway-control')
export class AdminPaymentGatewayControlController {
  constructor(
    private readonly paymentGatewayControlService: PaymentGatewayControlService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payment gateway control state',
    description:
      'Returns the bounded runtime control state for the managed payment providers and routing controls.',
  })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  list() {
    return Promise.all([
      this.paymentGatewayControlService.listProviders(),
      this.paymentGatewayControlService.getRouting(),
    ]).then(([providers, routing]) => ({
      items: providers.items,
      routing: routing.item,
    }));
  }

  @Get('providers/:provider')
  @ApiOperation({
    summary: 'Get payment gateway provider control state',
    description:
      'Returns the current bounded runtime control state for one payment provider.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  @ApiResponse({ status: 200 })
  getProvider(
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
  ) {
    return this.paymentGatewayControlService.getProvider(provider);
  }

  @Get('providers/:provider/history')
  @ApiOperation({
    summary: 'List payment gateway provider control history',
    description:
      'Returns the bounded audit history for one provider control stream.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  @ApiResponse({ status: 200 })
  history(
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
  ) {
    return this.paymentGatewayControlService.getHistory(provider);
  }

  @Post('providers/:provider/step-up')
  @ApiOperation({
    summary: 'Request provider step-up verification',
    description:
      'Sends an OTP challenge to the current admin user for a high-risk provider action.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  requestStepUp(
    @Req() request: AuthenticatedRequest,
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.paymentGatewayControlService.requestProviderStepUp({
      provider,
      actorUserId: request.user!.id,
      locale,
    });
  }

  @Post('providers/:provider/validate')
  @ApiOperation({
    summary: 'Validate a provider draft',
    description:
      'Runs typed schema and runtime validation before a provider save is attempted.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  validateProvider(
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
    @Body() body: Record<string, unknown>,
  ) {
    return this.paymentGatewayControlService.validateProviderDraft(
      provider,
      body as never,
    );
  }

  @Patch('providers/:provider')
  @ThrottlePolicy('admin-payment-gateway-control-password-confirmation')
  @ApiOperation({
    summary: 'Update provider control state',
    description:
      'Applies a validated provider control snapshot after step-up verification.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  updateProvider(
    @Req() request: AuthenticatedRequest,
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
    @Body() body: Record<string, unknown>,
  ) {
    const requestId = request.requestId ?? randomUUID();

    return this.paymentGatewayControlService.updateProvider({
      provider,
      actorUserId: request.user!.id,
      requestId,
      reason: String(body.reason ?? '').trim(),
      currentPassword: String(body.currentPassword ?? ''),
      stepUpChallengeId: String(body.stepUpChallengeId ?? '').trim(),
      stepUpCode: String(body.stepUpCode ?? '').trim(),
      rawDraft: body as never,
    });
  }

  @Post('providers/:provider/rollback')
  @ThrottlePolicy('admin-payment-gateway-control-password-confirmation')
  @ApiOperation({
    summary: 'Rollback provider control state',
    description:
      'Re-applies a prior provider control snapshot from the bounded audit history.',
  })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  rollbackProvider(
    @Req() request: AuthenticatedRequest,
    @Param('provider', new ParseEnumPipe(PaymentProvider))
    provider: PaymentProvider,
    @Body() body: Record<string, unknown>,
  ) {
    const requestId = request.requestId ?? randomUUID();

    return this.paymentGatewayControlService.rollbackProvider({
      provider,
      actorUserId: request.user!.id,
      requestId,
      reason: String(body.reason ?? '').trim(),
      currentPassword: String(body.currentPassword ?? ''),
      revisionId: String(body.revisionId ?? '').trim(),
      stepUpChallengeId: String(body.stepUpChallengeId ?? '').trim(),
      stepUpCode: String(body.stepUpCode ?? '').trim(),
    });
  }

  @Get('routing')
  @ApiOperation({
    summary: 'Get payment routing control state',
    description:
      'Returns the current bounded routing control state across payment providers.',
  })
  @ApiResponse({ status: 200 })
  getRouting() {
    return this.paymentGatewayControlService.getRouting();
  }

  @Get('routing/capabilities')
  @ApiOperation({
    summary: 'List safe payment route capabilities',
    description:
      'Returns registered providers and integration aliases without exposing credentials.',
  })
  getRoutingCapabilities() {
    return this.paymentGatewayControlService.getRoutingCapabilities();
  }

  @Get('routing/history')
  @ApiOperation({
    summary: 'List payment routing control history',
    description:
      'Returns the bounded audit history for routing control changes.',
  })
  @ApiResponse({ status: 200 })
  getRoutingHistory() {
    return this.paymentGatewayControlService.getRoutingHistory();
  }

  @Post('routing/step-up')
  @ApiOperation({
    summary: 'Request routing step-up verification',
    description:
      'Sends an OTP challenge to the current admin user for a high-risk routing action.',
  })
  requestRoutingStepUp(
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.paymentGatewayControlService.requestRoutingStepUp({
      actorUserId: request.user!.id,
      locale,
    });
  }

  @Post('routing/validate')
  @ApiOperation({
    summary: 'Validate a routing draft',
    description:
      'Runs typed schema and runtime validation before a routing save is attempted.',
  })
  validateRouting(@Body() body: Record<string, unknown>) {
    return this.paymentGatewayControlService.validateRoutingDraft(
      body as never,
    );
  }

  @Patch('routing')
  @ThrottlePolicy('admin-payment-gateway-control-password-confirmation')
  @ApiOperation({
    summary: 'Update routing control state',
    description:
      'Applies a validated routing control snapshot after step-up verification.',
  })
  updateRouting(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const requestId = request.requestId ?? randomUUID();

    return this.paymentGatewayControlService.updateRouting({
      actorUserId: request.user!.id,
      requestId,
      reason: String(body.reason ?? '').trim(),
      currentPassword: String(body.currentPassword ?? ''),
      stepUpChallengeId: String(body.stepUpChallengeId ?? '').trim(),
      stepUpCode: String(body.stepUpCode ?? '').trim(),
      rawDraft: body as never,
    });
  }

  @Post('routing/rollback')
  @ThrottlePolicy('admin-payment-gateway-control-password-confirmation')
  @ApiOperation({
    summary: 'Rollback routing control state',
    description:
      'Re-applies a prior routing control snapshot from the bounded audit history.',
  })
  rollbackRouting(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const requestId = request.requestId ?? randomUUID();

    return this.paymentGatewayControlService.rollbackRouting({
      actorUserId: request.user!.id,
      requestId,
      reason: String(body.reason ?? '').trim(),
      currentPassword: String(body.currentPassword ?? ''),
      revisionId: String(body.revisionId ?? '').trim(),
      stepUpChallengeId: String(body.stepUpChallengeId ?? '').trim(),
      stepUpCode: String(body.stepUpCode ?? '').trim(),
    });
  }
}
