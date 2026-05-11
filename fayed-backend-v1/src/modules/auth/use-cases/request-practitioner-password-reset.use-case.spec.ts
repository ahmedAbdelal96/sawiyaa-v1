import { OtpChannel, OtpPurpose, UserRoleType } from '@prisma/client';
import { RequestPractitionerPasswordResetUseCase } from './request-practitioner-password-reset.use-case';

describe('RequestPractitionerPasswordResetUseCase', () => {
  const i18nService = { t: jest.fn().mockReturnValue('ok') };
  const userEmailRepository = { findByEmailForAuth: jest.fn() };
  const twoFactorSettingRepository = { findByUserId: jest.fn() };
  const practitionerOtpChannelService = { resolveVerifiedChannel: jest.fn() };
  const createOtpChallengeUseCase = { execute: jest.fn() };
  const sendOtpChallengeUseCase = { execute: jest.fn() };

  const useCase = new RequestPractitionerPasswordResetUseCase(
    i18nService as any,
    userEmailRepository as any,
    twoFactorSettingRepository as any,
    practitionerOtpChannelService as any,
    createOtpChallengeUseCase as any,
    sendOtpChallengeUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and sends password reset OTP when practitioner exists', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
        emails: [],
        phones: [],
      },
    });
    practitionerOtpChannelService.resolveVerifiedChannel.mockReturnValue({
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
    });
    createOtpChallengeUseCase.execute.mockResolvedValue({
      challengeId: 'challenge-1',
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
      code: '123456',
      expiresAt: new Date(),
    });

    await useCase.execute({ email: 'test@example.com', locale: 'en' });

    expect(createOtpChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: OtpPurpose.PASSWORD_RESET,
      }),
    );
    expect(sendOtpChallengeUseCase.execute).toHaveBeenCalled();
  });
});
