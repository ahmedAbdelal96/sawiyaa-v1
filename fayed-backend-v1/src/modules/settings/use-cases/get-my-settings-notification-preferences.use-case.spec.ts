import { NotFoundException } from '@nestjs/common';
import { SettingsRepository } from '../repositories/settings.repository';
import { BuildSettingsNotificationPreferencesStateService } from '../services/build-settings-notification-preferences-state.service';
import { GetMySettingsNotificationPreferencesUseCase } from './get-my-settings-notification-preferences.use-case';

describe('GetMySettingsNotificationPreferencesUseCase', () => {
  const settingsRepository = {
    findUserPreferences: jest.fn(),
    listAvailableNotificationTypes: jest.fn(),
    listUserNotificationPreferences: jest.fn(),
  } as unknown as SettingsRepository;

  const useCase = new GetMySettingsNotificationPreferencesUseCase(
    settingsRepository,
    new BuildSettingsNotificationPreferencesStateService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when settings owner is not found', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'missing-user',
        roles: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns deterministic defaults when persisted rows are missing', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.listAvailableNotificationTypes as jest.Mock).mockResolvedValue([
      {
        id: 'type_1',
        slug: 'payments.payment-succeeded',
        defaultEnabled: true,
        supportsEmail: true,
        supportsInApp: true,
      },
      {
        id: 'type_2',
        slug: 'sessions.session-confirmed',
        defaultEnabled: false,
        supportsEmail: false,
        supportsInApp: true,
      },
    ]);
    (settingsRepository.listUserNotificationPreferences as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute({
      id: 'user_1',
      roles: [],
    });

    expect(result).toEqual({
      item: {
        items: [
          {
            typeSlug: 'payments.payment-succeeded',
            channel: 'EMAIL',
            enabled: true,
          },
          {
            typeSlug: 'payments.payment-succeeded',
            channel: 'IN_APP',
            enabled: true,
          },
          {
            typeSlug: 'sessions.session-confirmed',
            channel: 'IN_APP',
            enabled: false,
          },
        ],
        supportedChannels: ['IN_APP', 'EMAIL'],
        isPersisted: false,
        updatedAt: null,
      },
    });
  });

  it('returns persisted rows merged over defaults', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.listAvailableNotificationTypes as jest.Mock).mockResolvedValue([
      {
        id: 'type_1',
        slug: 'payments.payment-succeeded',
        defaultEnabled: true,
        supportsEmail: true,
        supportsInApp: true,
      },
    ]);
    (settingsRepository.listUserNotificationPreferences as jest.Mock).mockResolvedValue([
      {
        notificationTypeId: 'type_1',
        channel: 'EMAIL',
        isEnabled: false,
        updatedAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    ]);

    const result = await useCase.execute({
      id: 'user_2',
      roles: [],
    });

    expect(result).toEqual({
      item: {
        items: [
          {
            typeSlug: 'payments.payment-succeeded',
            channel: 'EMAIL',
            enabled: false,
          },
          {
            typeSlug: 'payments.payment-succeeded',
            channel: 'IN_APP',
            enabled: true,
          },
        ],
        supportedChannels: ['IN_APP', 'EMAIL'],
        isPersisted: true,
        updatedAt: '2026-04-01T10:00:00.000Z',
      },
    });
  });
});

