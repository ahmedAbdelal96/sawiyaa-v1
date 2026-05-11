import { Global, Module } from '@nestjs/common';
import { ThrottlePolicyGuard } from './throttle-policy.guard';
import { ThrottleStoreService } from './throttle-store.service';

/**
 * Global throttle module.
 * Registers the in-memory ThrottleStoreService and ThrottlePolicyGuard for use
 * anywhere in the application.  Import this module in AppModule (or register
 * ThrottlePolicyGuard as APP_GUARD there) to activate rate-limit enforcement.
 */
@Global()
@Module({
  providers: [ThrottleStoreService, ThrottlePolicyGuard],
  exports: [ThrottleStoreService, ThrottlePolicyGuard],
})
export class ThrottleModule {}
