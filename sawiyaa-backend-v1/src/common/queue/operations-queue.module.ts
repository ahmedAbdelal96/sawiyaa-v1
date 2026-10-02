import { Global, Module } from '@nestjs/common';
import { OperationsQueueService } from './operations-queue.service';

@Global()
@Module({
  providers: [OperationsQueueService],
  exports: [OperationsQueueService],
})
export class OperationsQueueModule {}
