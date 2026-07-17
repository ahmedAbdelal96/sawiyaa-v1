import { BadRequestException } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { CreateOtpChallengeUseCase } from './create-otp-challenge.use-case';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpCodeGeneratorService } from '../services/otp-code-generator.service';
import { OtpHashService } from '../services/otp-hash.service';
import { OtpPolicyResolverService } from '../services/otp-policy-resolver.service';

describe('CreateOtpChallengeUseCase', () => {
  const otpChallengeRepository = {
    withTransaction: jest.fn(),
    lockScope: jest.fn(),
    create: jest.fn(),
    listRecentChallengesForTarget: jest.fn(),
    invalidateActiveChallengesByScope: jest.fn(),
  } as unknown as OtpChallengeRepository;
  const otpCodeGeneratorService = {
    generate: jest.fn(),
  } as unknown as OtpCodeGeneratorService;
  const otpHashService = new OtpHashService();
  const otpPolicyResolverService = {
    resolve: jest.fn(),
  } as unknown as OtpPolicyResolverService;

  const useCase = new CreateOtpChallengeUseCase(
    otpChallengeRepository,
    otpCodeGeneratorService,
    otpHashService,
    otpPolicyResolverService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    otpChallengeRepository.withTransaction = jest
      .fn()
      .mockImplementation(async (run: (tx: unknown) => Promise<unknown>) =>
        run({} as any),
      );
    otpChallengeRepository.lockScope = jest.fn();
    otpChallengeRepository.invalidateActiveChallengesByScope = jest
      .fn()
      .mockResolvedValue(0);
  });

  it('creates a challenge and returns masked metadata', async () => {
    otpPolicyResolverService.resolve = jest.fn().mockReturnValue({
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeLength: 6,
      maxAttempts: 5,
      resendCooldownSeconds: 30,
      ttlMinutes: 10,
      allowedChannels: [OtpChannel.EMAIL],
    });
    otpCodeGeneratorService.generate = jest.fn().mockReturnValue('123456');
    otpChallengeRepository.listRecentChallengesForTarget = jest
      .fn()
      .mockResolvedValue([]);
    otpChallengeRepository.create = jest.fn().mockResolvedValue({
      id: 'challenge-1',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
    });

    expect(result.challengeId).toBe('challenge-1');
    expect(result.code).toBe('123456');
    expect(result.maskedTarget).not.toBe('test@example.com');
    expect(otpChallengeRepository.create).toHaveBeenCalled();
  });

  it('enforces resend cooldown', async () => {
    otpPolicyResolverService.resolve = jest.fn().mockReturnValue({
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeLength: 6,
      maxAttempts: 5,
      resendCooldownSeconds: 30,
      ttlMinutes: 10,
      allowedChannels: [OtpChannel.EMAIL],
    });
    otpChallengeRepository.listRecentChallengesForTarget = jest
      .fn()
      .mockResolvedValue([
        { id: 'recent', createdAt: new Date() } as never,
      ]);

    await expect(
      useCase.execute({
        userId: 'user-1',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
        channel: OtpChannel.EMAIL,
        target: 'test@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invalidates prior practitioner login challenges before creating a new one', async () => {
    otpPolicyResolverService.resolve = jest.fn().mockReturnValue({
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeLength: 6,
      maxAttempts: 5,
      resendCooldownSeconds: 30,
      ttlMinutes: 10,
      allowedChannels: [OtpChannel.EMAIL],
    });
    otpCodeGeneratorService.generate = jest.fn().mockReturnValue('123456');
    otpChallengeRepository.listRecentChallengesForTarget = jest
      .fn()
      .mockResolvedValue([]);
    otpChallengeRepository.create = jest.fn().mockResolvedValue({
      id: 'challenge-2',
    });

    await useCase.execute({
      userId: 'user-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
    });

    expect(otpChallengeRepository.withTransaction).toHaveBeenCalled();
    expect(otpChallengeRepository.lockScope).toHaveBeenCalledWith(
      expect.anything(),
      'otp-challenge:PRACTITIONER_LOGIN:user:user-1',
    );
    expect(
      otpChallengeRepository.invalidateActiveChallengesByScope,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
        reason: 'SUPERSEDED_BY_NEW_OTP',
      }),
      expect.anything(),
    );
  });
});
