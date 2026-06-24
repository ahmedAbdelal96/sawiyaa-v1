import { Controller, Headers, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { SessionAttendanceWebhookSuccessResponseDto } from '../dto/session-attendance-webhook-response.dto';
import { HandleDailyAttendanceWebhookUseCase } from '../use-cases/handle-daily-attendance-webhook.use-case';

@ApiTags('Sessions')
@Public()
@Controller('sessions/webhooks')
export class SessionAttendanceWebhooksController {
  constructor(
    private readonly handleDailyAttendanceWebhookUseCase: HandleDailyAttendanceWebhookUseCase,
  ) {}

  @Post('daily')
  @ApiOperation({
    summary: 'Handle Daily attendance webhook events',
    description:
      'Ingests provider attendance runtime events and persists session-linked telemetry for operations visibility.',
  })
  @ApiResponse({
    status: 200,
    type: SessionAttendanceWebhookSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Webhook payload or signature is invalid',
  })
  daily(
    @Req() request: AuthenticatedRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.handleDailyAttendanceWebhookUseCase.execute({
      rawBody: request.rawBody ?? Buffer.from(''),
      headers,
    });
  }
}
