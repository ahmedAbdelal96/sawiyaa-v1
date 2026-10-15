import { Global, Module } from '@nestjs/common';
import { SessionReminderQueueService } from './session-reminder-queue.service';

@Global()
@Module({
  providers: [SessionReminderQueueService],
  exports: [SessionReminderQueueService],
})
export class SessionReminderQueueModule {}
