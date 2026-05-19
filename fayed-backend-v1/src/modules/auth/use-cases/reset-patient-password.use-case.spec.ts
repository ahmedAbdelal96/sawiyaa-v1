import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { ResetPatientPasswordUseCase } from './reset-patient-password.use-case';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';
import { HashPasswordUseCase } from './hash-password.use-case';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';

describe('ResetPatientPasswordUseCase', () => {
  let useCase: ResetPatientPasswordUseCase;
  let prisma: jest.Mocked<PrismaService>;
  let i18nService: jest.Mocked<I18nService>;
  let verifyOtpChallengeUseCase: jest.Mocked<VerifyOtpChallengeUseCase>;
  let hashPasswordUseCase: jest.Mocked<HashPasswordUseCase>;
  let authIdentityRepository: jest.Mocked<AuthIdentityRepository>;
  let userEmailRepository: jest.Mocked<UserEmailRepository>;
  let invalidateUserTokensUseCase: jest.Mocked<InvalidateUserTokensUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPatientPasswordUseCase,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key) => `localized.${key}`),
          },
        },
        {
          provide: VerifyOtpChallengeUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: HashPasswordUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: AuthIdentityRepository,
          useValue: {
            updatePasswordHash: jest.fn(),
          },
        },
        {
          provide: UserEmailRepository,
          useValue: {
            findByEmailForAuth: jest.fn(),
          },
        },
        {
          provide: InvalidateUserTokensUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ResetPatientPasswordUseCase>(
      ResetPatientPasswordUseCase,
    );
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    i18nService = module.get(I18nService) as jest.Mocked<I18nService>;
    verifyOtpChallengeUseCase = module.get(
      VerifyOtpChallengeUseCase,
    ) as jest.Mocked<VerifyOtpChallengeUseCase>;
    hashPasswordUseCase = module.get(
      HashPasswordUseCase,
    ) as jest.Mocked<HashPasswordUseCase>;
    authIdentityRepository = module.get(
      AuthIdentityRepository,
    ) as jest.Mocked<AuthIdentityRepository>;
    userEmailRepository = module.get(
      UserEmailRepository,
    ) as jest.Mocked<UserEmailRepository>;
    invalidateUserTokensUseCase = module.get(
      InvalidateUserTokensUseCase,
    ) as jest.Mocked<InvalidateUserTokensUseCase>;
  });

  describe('execute', () => {
    it('should throw ConflictException when email not found', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        useCase.execute({
          email: 'unknown@example.com',
          code: '123456',
          newPassword: 'NewPassword123',
          locale: 'en',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reset password for valid patient with valid OTP', async () => {
      const patient = {
        id: 'patient-123',
        roles: [{ role: UserRoleType.PATIENT }],
      };
      const userEmail = {
        user: {
          id: 'patient-123',
          roles: [{ role: UserRoleType.PATIENT }],
        },
      };
      const otpChallenge = {
        id: 'challenge-123',
        user: patient,
      };

      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      verifyOtpChallengeUseCase.execute.mockResolvedValue(otpChallenge as any);
      hashPasswordUseCase.execute.mockResolvedValue('hashed_password_123');

      const transactionCallback = jest.fn(async (tx) => {
        return undefined;
      });
      prisma.$transaction.mockImplementation(transactionCallback);

      const result = await useCase.execute({
        email: 'patient@example.com',
        code: '123456',
        newPassword: 'NewPassword123',
        locale: 'en',
      });

      expect(result.message).toBe(
        'localized.auth.success.patientPasswordResetCompleted',
      );
      expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
        'patient@example.com',
      );
      expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith({
        userId: 'patient-123',
        code: '123456',
        purpose: OtpPurpose.PASSWORD_RESET,
      });
      expect(hashPasswordUseCase.execute).toHaveBeenCalledWith(
        'NewPassword123',
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should invalidate all tokens after successful reset', async () => {
      const patient = {
        id: 'patient-123',
        roles: [{ role: UserRoleType.PATIENT }],
      };
      const userEmail = {
        user: patient,
      };
      const otpChallenge = {
        id: 'challenge-123',
        user: patient,
      };

      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      verifyOtpChallengeUseCase.execute.mockResolvedValue(otpChallenge as any);
      hashPasswordUseCase.execute.mockResolvedValue('hashed_password_123');

      let capturedTransaction: any = null;
      prisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        capturedTransaction = mockTx;
        return callback(mockTx);
      });

      await useCase.execute({
        email: 'patient@example.com',
        code: '123456',
        newPassword: 'NewPassword123',
        locale: 'en',
      });

      expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledWith(
        'patient-123',
        capturedTransaction,
      );
    });

    it('should throw ConflictException when OTP user has no patient role', async () => {
      const nonPatientUser = {
        id: 'user-123',
        roles: [{ role: UserRoleType.PRACTITIONER }],
      };
      const userEmail = {
        user: {
          id: 'user-123',
          roles: [{ role: UserRoleType.PRACTITIONER }],
        },
      };
      const otpChallenge = {
        id: 'challenge-123',
        user: nonPatientUser,
      };

      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      verifyOtpChallengeUseCase.execute.mockResolvedValue(otpChallenge as any);

      await expect(
        useCase.execute({
          email: 'practitioner@example.com',
          code: '123456',
          newPassword: 'NewPassword123',
          locale: 'en',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should normalize email before lookup', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      try {
        await useCase.execute({
          email: '  PATIENT@EXAMPLE.COM  ',
          code: '123456',
          newPassword: 'NewPassword123',
          locale: 'en',
        });
      } catch {
        // Expected to throw
      }

      expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
        'patient@example.com',
      );
    });
  });
});
