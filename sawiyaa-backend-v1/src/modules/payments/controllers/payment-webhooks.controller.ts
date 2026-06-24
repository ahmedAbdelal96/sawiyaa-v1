import { Controller, Headers, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { PaymentWebhookSuccessResponseDto } from '../dto/payment-response.dto';
import { HandlePaymobWebhookUseCase } from '../use-cases/handle-paymob-webhook.use-case';
import { HandleStripeWebhookUseCase } from '../use-cases/handle-stripe-webhook.use-case';

@ApiTags('Payments')
@Public()
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly handlePaymobWebhookUseCase: HandlePaymobWebhookUseCase,
  ) {}

  @Post('stripe')
  @ApiOperation({
    summary: 'Handle Stripe payment webhook',
    description:
      'Public webhook endpoint that verifies Stripe signature, applies idempotent lifecycle updates, and reconciles payment/session state safely.',
  })
  @ApiResponse({ status: 200, type: PaymentWebhookSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Webhook signature is invalid or payload is malformed',
  })
  stripe(
    @Req() request: AuthenticatedRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.handleStripeWebhookUseCase.execute({
      rawBody: request.rawBody ?? Buffer.from(''),
      headers,
      query: request.query as Record<string, unknown>,
    });
  }

  @Post('paymob')
  @ApiOperation({
    summary: 'Handle Paymob payment webhook',
    description:
      'Public webhook endpoint that verifies Paymob HMAC, applies idempotent lifecycle updates, and reconciles payment/session state safely.',
  })
  @ApiResponse({ status: 200, type: PaymentWebhookSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Webhook signature is invalid or payload is malformed',
  })
  paymob(
    @Req() request: AuthenticatedRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.handlePaymobWebhookUseCase.execute({
      rawBody: request.rawBody ?? Buffer.from(''),
      headers,
      query: request.query as Record<string, unknown>,
    });
  }
}
