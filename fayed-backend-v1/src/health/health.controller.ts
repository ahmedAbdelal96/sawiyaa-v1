import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      service: 'fayed-backend-v1',
      status: 'ok',
    };
  }
}
