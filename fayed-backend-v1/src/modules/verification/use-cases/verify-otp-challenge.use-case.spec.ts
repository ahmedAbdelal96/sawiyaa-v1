import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpChallengeUseCase } from './verify-otp-challenge.use-case';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpHashService } from '../services/otp-hash.service';

describe('VerifyOtpChallengeUseCase', () => {
  const otpChallengeRepository = {
    findActiveById: jest.fn(),
    findLatestActiveByUserId: jest.fn(),
    incrementAttemptCount: jest.fn(),
    invalidate: jest.fn(),
    consume: jest.fn(),
  } as unknown as OtpChallengeRepository;
  const otpHashService = new OtpHashService();
  const useCase = new VerifyOtpChallengeUseCase(
    otpChallengeRepository,
    otpHashService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies a correct code and consumes the challenge', async () => {
    const code = '123456';
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash(code),
      attemptCount: 0,
      maxAttempts: 5,
    });

    const result = await useCase.execute({
      challengeId: 'challenge-1',
      code,
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
    });

    expect(result.id).toBe('challenge-1');
    expect(otpChallengeRepository.consume).toHaveBeenCalledWith('challenge-1');
  });

  it('increments attempt count on wrong code', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
    });
    otpChallengeRepository.incrementAttemptCount = jest
      .fn()
      .mockResolvedValue({
        id: 'challenge-1',
        attemptCount: 1,
        maxAttempts: 5,
      });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '000000',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(otpChallengeRepository.incrementAttemptCount).toHaveBeenCalled();
  });

  it('rejects purpose mismatch', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      purpose: OtpPurpose.PASSWORD_RESET,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired/consumed challenges', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects consumed challenges', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalidated challenges', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalidates when max attempts exceeded', async () => {
    otpChallengeRepository.findActiveById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 5,
      maxAttempts: 5,
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(otpChallengeRepository.invalidate).toHaveBeenCalledWith('challenge-1');
  });
});
