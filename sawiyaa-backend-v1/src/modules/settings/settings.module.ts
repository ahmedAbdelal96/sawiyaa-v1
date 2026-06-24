import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { MySettingsController } from './controllers/my-settings.controller';
import { SettingsRepository } from './repositories/settings.repository';
import { BuildSettingsNotificationPreferencesStateService } from './services/build-settings-notification-preferences-state.service';
import { ValidateSettingsContractInputService } from './services/validate-settings-contract-input.service';
import { GetMySettingsNotificationPreferencesUseCase } from './use-cases/get-my-settings-notification-preferences.use-case';
import { GetMySettingsUseCase } from './use-cases/get-my-settings.use-case';
import { UpdateMySettingsNotificationPreferencesUseCase } from './use-cases/update-my-settings-notification-preferences.use-case';
import { UpdateMySettingsPreferencesUseCase } from './use-cases/update-my-settings-preferences.use-case';

@Module({
  controllers: [MySettingsController],
  providers: [
    JwtAccessAuthGuard,
    SettingsRepository,
    BuildSettingsNotificationPreferencesStateService,
    ValidateSettingsContractInputService,
    GetMySettingsUseCase,
    UpdateMySettingsPreferencesUseCase,
    GetMySettingsNotificationPreferencesUseCase,
    UpdateMySettingsNotificationPreferencesUseCase,
  ],
})
export class SettingsModule {}
