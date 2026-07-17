import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { VerifyOtpChallengeUseCase } from './verify-otp-challenge.use-case';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository';
import { OtpHashService } from '../services/otp-hash.service';

describe('VerifyOtpChallengeUseCase', () => {
  const otpChallengeRepository = {
    withTransaction: jest.fn(),
    lockScope: jest.fn(),
    findById: jest.fn(),
    findLatestActiveByUserId: jest.fn(),
    findLatestActiveByTarget: jest.fn(),
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
    otpChallengeRepository.withTransaction = jest
      .fn()
      .mockImplementation(async (run: (tx: unknown) => Promise<unknown>) =>
        run({} as any),
      );
    otpChallengeRepository.lockScope = jest.fn();
    otpChallengeRepository.incrementAttemptCount = jest.fn();
    otpChallengeRepository.invalidate = jest.fn();
    otpChallengeRepository.consume = jest.fn();
    otpChallengeRepository.findLatestActiveByUserId = jest.fn();
    otpChallengeRepository.findLatestActiveByTarget = jest.fn();
  });

  it('verifies a correct code and consumes the challenge', async () => {
    const code = '123456';
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash(code),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      invalidatedAt: null,
      user: { id: 'user-1' },
    });
    otpChallengeRepository.findLatestActiveByUserId = jest
      .fn()
      .mockResolvedValue({
        id: 'challenge-1',
      });

    const result = await useCase.execute({
      challengeId: 'challenge-1',
      code,
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
    });

    expect(result.id).toBe('challenge-1');
    expect(otpChallengeRepository.lockScope).toHaveBeenCalledWith(
      expect.anything(),
      'otp-challenge:PRACTITIONER_LOGIN:user:user-1',
    );
    expect(otpChallengeRepository.consume).toHaveBeenCalledWith(
      'challenge-1',
      expect.anything(),
    );
  });

  it('increments attempt count on wrong code', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      invalidatedAt: null,
      user: { id: 'user-1' },
    });
    otpChallengeRepository.findLatestActiveByUserId = jest
      .fn()
      .mockResolvedValue({
        id: 'challenge-1',
      });
    otpChallengeRepository.incrementAttemptCount = jest.fn().mockResolvedValue({
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

    expect(otpChallengeRepository.incrementAttemptCount).toHaveBeenCalledWith(
      'challenge-1',
      expect.anything(),
    );
  });

  it('rejects purpose mismatch', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      purpose: OtpPurpose.PASSWORD_RESET,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects superseded challenges when a newer active challenge exists', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-old',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      invalidatedAt: new Date(),
      user: { id: 'user-1' },
    });
    otpChallengeRepository.findLatestActiveByUserId = jest
      .fn()
      .mockResolvedValue({
        id: 'challenge-new',
      });

    await expect(
      useCase.execute({
        challengeId: 'challenge-old',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'OTP_CHALLENGE_SUPERSEDED',
      }),
    });
  });

  it('rejects already consumed challenges', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
      invalidatedAt: null,
      user: { id: 'user-1' },
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'OTP_ALREADY_USED',
      }),
    });
  });

  it('invalidates when max attempts exceeded', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 5,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      invalidatedAt: null,
      user: { id: 'user-1' },
    });
    otpChallengeRepository.findLatestActiveByUserId = jest
      .fn()
      .mockResolvedValue({
        id: 'challenge-1',
      });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(otpChallengeRepository.invalidate).toHaveBeenCalledWith(
      'challenge-1',
      expect.anything(),
    );
  });

  it('rejects expired challenges', async () => {
    otpChallengeRepository.findById = jest.fn().mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      target: 'test@example.com',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      codeHash: otpHashService.hash('123456'),
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() - 60_000),
      consumedAt: null,
      invalidatedAt: null,
      user: { id: 'user-1' },
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
