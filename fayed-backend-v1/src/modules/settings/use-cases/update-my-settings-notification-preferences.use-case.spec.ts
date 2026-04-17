import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsRepository } from '../repositories/settings.repository';
import { BuildSettingsNotificationPreferencesStateService } from '../services/build-settings-notification-preferences-state.service';
import { ValidateSettingsContractInputService } from '../services/validate-settings-contract-input.service';
import { UpdateMySettingsNotificationPreferencesUseCase } from './update-my-settings-notification-preferences.use-case';

describe('UpdateMySettingsNotificationPreferencesUseCase', () => {
  const settingsRepository = {
    findUserPreferences: jest.fn(),
    findNotificationTypesBySlugs: jest.fn(),
    upsertUserNotificationPreferences: jest.fn(),
    listAvailableNotificationTypes: jest.fn(),
    listUserNotificationPreferences: jest.fn(),
  } as unknown as SettingsRepository;

  const useCase = new UpdateMySettingsNotificationPreferencesUseCase(
    settingsRepository,
    new ValidateSettingsContractInputService(),
    new BuildSettingsNotificationPreferencesStateService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when settings owner is not found', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'missing-user', roles: [] },
        dto: { items: [] },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate items deterministically', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        dto: {
          items: [
            { typeSlug: 'payments.payment-succeeded', channel: 'EMAIL', enabled: true },
            { typeSlug: 'payments.payment-succeeded', channel: 'EMAIL', enabled: false },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown notification type slugs', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.findNotificationTypesBySlugs as jest.Mock).mockResolvedValue([]);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_2', roles: [] },
        dto: {
          items: [
            { typeSlug: 'unknown.type', channel: 'IN_APP', enabled: true },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported channel for a known notification type', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.findNotificationTypesBySlugs as jest.Mock).mockResolvedValue([
      {
        id: 'type_1',
        slug: 'sessions.session-confirmed',
        defaultEnabled: true,
        supportsEmail: false,
        supportsInApp: true,
      },
    ]);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_3', roles: [] },
        dto: {
          items: [
            { typeSlug: 'sessions.session-confirmed', channel: 'EMAIL', enabled: true },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upserts preferences and returns resolved persisted state', async () => {
    (settingsRepository.findUserPreferences as jest.Mock).mockResolvedValue({
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (settingsRepository.findNotificationTypesBySlugs as jest.Mock).mockResolvedValue([
      {
        id: 'type_1',
        slug: 'payments.payment-succeeded',
        defaultEnabled: true,
        supportsEmail: true,
        supportsInApp: true,
      },
    ]);
    (settingsRepository.upsertUserNotificationPreferences as jest.Mock).mockResolvedValue([]);
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
        channel: 'IN_APP',
        isEnabled: false,
        updatedAt: new Date('2026-04-01T11:30:00.000Z'),
      },
    ]);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_4', roles: [] },
      dto: {
        items: [
          { typeSlug: 'payments.payment-succeeded', channel: 'IN_APP', enabled: false },
        ],
      },
    });

    expect(settingsRepository.upsertUserNotificationPreferences).toHaveBeenCalledWith({
      userId: 'user_4',
      items: [
        {
          notificationTypeId: 'type_1',
          channel: 'IN_APP',
          enabled: false,
        },
      ],
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
            enabled: false,
          },
        ],
        supportedChannels: ['IN_APP', 'EMAIL'],
        isPersisted: true,
        updatedAt: '2026-04-01T11:30:00.000Z',
      },
    });
  });
});

