import { Module } from '@nestjs/common';
import { HelpService } from './services/help.service';
import { AdminHelpController } from './controllers/admin-help.controller';
import { PublicHelpController } from './controllers/public-help.controller';

@Module({
  controllers: [AdminHelpController, PublicHelpController],
  providers: [HelpService],
  exports: [HelpService],
})
export class HelpModule {}
