import { NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { SETTINGS_DEFAULT_LOCALE, SETTINGS_DEFAULT_TIMEZONE } from '../types/settings.types';
import { SettingsRepository } from '../repositories/settings.repository';
import { GetMySettingsNotificationPreferencesUseCase } from './get-my-settings-notification-preferences.use-case';
import { GetMySettingsUseCase } from './get-my-settings.use-case';

describe('GetMySettingsUseCase', () => {
  const settingsRepository = {
    findUserPreferences: jest.fn(),
  } as unknown as SettingsRepository;

  const getMySettingsNotificationPreferencesUseCase = {
    execute: jest.fn(),
  } as unknown as GetMySettingsNotificationPreferencesUseCase;

  const useCase = new GetMySettingsUseCase(
    settingsRepository,
    getMySettingsNotificationPreferencesUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when settings owner is not found', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'user_missing',
        roles: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns persisted locale/timezone when they exist', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: ContentLocale.en,
      timezone: 'Asia/Riyadh',
    });
    (
      getMySettingsNotificationPreferencesUseCase.execute as jest.Mock
    ).mockResolvedValue({
      item: {
        items: [],
        supportedChannels: ['IN_APP', 'EMAIL'],
        isPersisted: false,
        updatedAt: null,
      },
    });

    const result = await useCase.execute({
      id: 'user_1',
      roles: [],
    });

    expect(result.item.preferences).toEqual({
      locale: ContentLocale.en,
      timezone: 'Asia/Riyadh',
    });
  });

  it('returns deterministic defaults when locale/timezone are missing', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: null,
      timezone: null,
    });
    (
      getMySettingsNotificationPreferencesUseCase.execute as jest.Mock
    ).mockResolvedValue({
      item: {
        items: [],
        supportedChannels: ['IN_APP', 'EMAIL'],
        isPersisted: false,
        updatedAt: null,
      },
    });

    const result = await useCase.execute({
      id: 'user_2',
      roles: [],
    });

    expect(result.item.preferences).toEqual({
      locale: SETTINGS_DEFAULT_LOCALE,
      timezone: SETTINGS_DEFAULT_TIMEZONE,
    });
  });
});

