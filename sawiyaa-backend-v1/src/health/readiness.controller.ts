import { Controller, Get } from '@nestjs/common';
import { ReadinessService } from './readiness.service';

@Controller('readiness')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  check() {
    return this.readiness.getSnapshot();
  }
}
