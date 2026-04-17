import { BadRequestException } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { ResendOtpChallengeUseCase } from './resend-otp-challenge.use-case';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpPolicyResolverService } from '../services/otp-policy-resolver.service';
import { CreateOtpChallengeUseCase } from './create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from './send-otp-challenge.use-case';

describe('ResendOtpChallengeUseCase', () => {
  const otpChallengeRepository = {
    listRecentChallengesForTarget: jest.fn(),
    findLatestActiveByTarget: jest.fn(),
    invalidate: jest.fn(),
  } as unknown as OtpChallengeRepository;
  const otpPolicyResolverService = {
    resolve: jest.fn(),
  } as unknown as OtpPolicyResolverService;
  const createOtpChallengeUseCase = {
    execute: jest.fn(),
  } as unknown as CreateOtpChallengeUseCase;
  const sendOtpChallengeUseCase = {
    execute: jest.fn(),
  } as unknown as SendOtpChallengeUseCase;

  const useCase = new ResendOtpChallengeUseCase(
    otpChallengeRepository,
    otpPolicyResolverService,
    createOtpChallengeUseCase,
    sendOtpChallengeUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces resend cooldown', async () => {
    otpPolicyResolverService.resolve = jest.fn().mockReturnValue({
      resendCooldownSeconds: 30,
    });
    otpChallengeRepository.listRecentChallengesForTarget = jest
      .fn()
      .mockResolvedValue([{ id: 'recent' }]);

    await expect(
      useCase.execute({
        userId: 'user-1',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
        channel: OtpChannel.EMAIL,
        target: 'test@example.com',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invalidates latest and sends a new challenge', async () => {
    otpPolicyResolverService.resolve = jest.fn().mockReturnValue({
      resendCooldownSeconds: 30,
    });
    otpChallengeRepository.listRecentChallengesForTarget = jest
      .fn()
      .mockResolvedValue([]);
    otpChallengeRepository.findLatestActiveByTarget = jest
      .fn()
      .mockResolvedValue({ id: 'old' });
    createOtpChallengeUseCase.execute = jest.fn().mockResolvedValue({
      challengeId: 'new',
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
      code: '123456',
      expiresAt: new Date(),
    });

    await useCase.execute({
      userId: 'user-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
      locale: 'en',
    });

    expect(otpChallengeRepository.invalidate).toHaveBeenCalledWith('old');
    expect(sendOtpChallengeUseCase.execute).toHaveBeenCalled();
  });
});
