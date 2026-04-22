import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import {
  SETTINGS_DEFAULT_LOCALE,
  SETTINGS_DEFAULT_TIMEZONE,
} from '../types/settings.types';
import { SettingsRepository } from '../repositories/settings.repository';
import { ValidateSettingsContractInputService } from '../services/validate-settings-contract-input.service';
import { UpdateMySettingsPreferencesUseCase } from './update-my-settings-preferences.use-case';

describe('UpdateMySettingsPreferencesUseCase', () => {
  const settingsRepository = {
    findUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
  } as unknown as SettingsRepository;

  const useCase = new UpdateMySettingsPreferencesUseCase(
    settingsRepository,
    new ValidateSettingsContractInputService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when settings owner is not found', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'missing-user', roles: [] },
        dto: { locale: ContentLocale.ar },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and returns persisted locale/timezone', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: ContentLocale.ar,
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.updateUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: ContentLocale.en,
      timezone: 'Asia/Riyadh',
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      dto: {
        locale: ContentLocale.en,
        timezone: 'Asia/Riyadh',
      },
    });

    expect(settingsRepository.updateUserPreferences).toHaveBeenCalledWith({
      userId: 'user_1',
      locale: ContentLocale.en,
      timezone: 'Asia/Riyadh',
    });
    expect(result.item).toEqual({
      locale: ContentLocale.en,
      timezone: 'Asia/Riyadh',
    });
  });

  it('returns defaults when preferences are missing and patch is empty', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: null,
      timezone: null,
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_2', roles: [] },
      dto: {},
    });

    expect(settingsRepository.updateUserPreferences).not.toHaveBeenCalled();
    expect(result.item).toEqual({
      locale: SETTINGS_DEFAULT_LOCALE,
      timezone: SETTINGS_DEFAULT_TIMEZONE,
    });
  });

  it('rejects invalid locale', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: ContentLocale.ar,
      timezone: 'Africa/Cairo',
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_3', roles: [] },
        dto: {
          locale: 'fr' as unknown as ContentLocale,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid timezone', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: ContentLocale.ar,
      timezone: 'Africa/Cairo',
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_4', roles: [] },
        dto: {
          timezone: 'Invalid/Timezone',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
