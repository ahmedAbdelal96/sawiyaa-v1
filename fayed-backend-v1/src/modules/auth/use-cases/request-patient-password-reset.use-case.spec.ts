import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OtpChannel, OtpPurpose, UserRoleType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { RequestPatientPasswordResetUseCase } from './request-patient-password-reset.use-case';
import { PatientOtpChannelService } from '../services/patient-otp-channel.service';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { CreateOtpChallengeUseCase } from '../../verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '../../verification/use-cases/send-otp-challenge.use-case';
import { PasswordResetRateLimitService } from '../../verification/services/password-reset-rate-limit.service';

describe('RequestPatientPasswordResetUseCase', () => {
  let useCase: RequestPatientPasswordResetUseCase;
  let i18nService: jest.Mocked<I18nService>;
  let userEmailRepository: jest.Mocked<UserEmailRepository>;
  let twoFactorSettingRepository: jest.Mocked<TwoFactorSettingRepository>;
  let patientOtpChannelService: jest.Mocked<PatientOtpChannelService>;
  let createOtpChallengeUseCase: jest.Mocked<CreateOtpChallengeUseCase>;
  let sendOtpChallengeUseCase: jest.Mocked<SendOtpChallengeUseCase>;
  let rateLimitService: jest.Mocked<PasswordResetRateLimitService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestPatientPasswordResetUseCase,
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key) => `localized.${key}`),
          },
        },
        {
          provide: UserEmailRepository,
          useValue: {
            findByEmailForAuth: jest.fn(),
          },
        },
        {
          provide: TwoFactorSettingRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
        {
          provide: PatientOtpChannelService,
          useValue: {
            resolveVerifiedChannel: jest.fn(),
          },
        },
        {
          provide: CreateOtpChallengeUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SendOtpChallengeUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: PasswordResetRateLimitService,
          useValue: {
            check: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
      ],
    }).compile();

    useCase = module.get<RequestPatientPasswordResetUseCase>(
      RequestPatientPasswordResetUseCase,
    );
    i18nService = module.get(I18nService) as jest.Mocked<I18nService>;
    userEmailRepository = module.get(
      UserEmailRepository,
    ) as jest.Mocked<UserEmailRepository>;
    twoFactorSettingRepository = module.get(
      TwoFactorSettingRepository,
    ) as jest.Mocked<TwoFactorSettingRepository>;
    patientOtpChannelService = module.get(
      PatientOtpChannelService,
    ) as jest.Mocked<PatientOtpChannelService>;
    createOtpChallengeUseCase = module.get(
      CreateOtpChallengeUseCase,
    ) as jest.Mocked<CreateOtpChallengeUseCase>;
    sendOtpChallengeUseCase = module.get(
      SendOtpChallengeUseCase,
    ) as jest.Mocked<SendOtpChallengeUseCase>;
    rateLimitService = module.get(
      PasswordResetRateLimitService,
    ) as jest.Mocked<PasswordResetRateLimitService>;
  });

  describe('execute', () => {
    it('should throw conflict when email does not exist', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        useCase.execute({
          email: 'unknown@example.com',
          locale: 'en',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw conflict when user has no patient role', async () => {
      const userEmail = {
        user: {
          id: 'user-123',
          roles: [{ role: UserRoleType.PRACTITIONER }],
          emails: [],
          phones: [],
        },
      };
      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );

      await expect(
        useCase.execute({
          email: 'practitioner@example.com',
          locale: 'en',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    });

    it('should create and send OTP challenge when patient exists with verified channel', async () => {
      const userEmail = {
        user: {
          id: 'patient-123',
          roles: [{ role: UserRoleType.PATIENT }],
          emails: [
            { email: 'patient@example.com', isPrimary: true, isVerified: true },
          ],
          phones: [],
        },
      };
      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      twoFactorSettingRepository.findByUserId.mockResolvedValue(null);
      patientOtpChannelService.resolveVerifiedChannel.mockReturnValue({
        channel: OtpChannel.EMAIL,
        target: 'patient@example.com',
      });
      createOtpChallengeUseCase.execute.mockResolvedValue({
        challengeId: 'challenge-123',
        channel: OtpChannel.EMAIL,
        maskedTarget: 'p***@example.com',
        expiresAt: new Date(),
        code: '123456',
        target: 'patient@example.com',
      });

      const result = await useCase.execute({
        email: 'patient@example.com',
        locale: 'en',
      });

      expect(result.message).toBe(
        'localized.auth.success.patientPasswordResetRequested',
      );
      expect((result as any).nextStep).toBe('VERIFY_OTP');
      expect(
        patientOtpChannelService.resolveVerifiedChannel,
      ).toHaveBeenCalled();
      expect(createOtpChallengeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'patient-123',
          purpose: OtpPurpose.PASSWORD_RESET,
          channel: OtpChannel.EMAIL,
          target: 'patient@example.com',
        }),
      );
      expect(sendOtpChallengeUseCase.execute).toHaveBeenCalled();
    });

    it('passes isPractitioner=false so patient reset uses Arabic/locale template', async () => {
      const userEmail = {
        user: {
          id: 'patient-123',
          roles: [{ role: UserRoleType.PATIENT }],
          emails: [
            { email: 'patient@example.com', isPrimary: true, isVerified: true },
          ],
          phones: [],
        },
      };
      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      twoFactorSettingRepository.findByUserId.mockResolvedValue(null);
      patientOtpChannelService.resolveVerifiedChannel.mockReturnValue({
        channel: OtpChannel.EMAIL,
        target: 'patient@example.com',
      });
      createOtpChallengeUseCase.execute.mockResolvedValue({
        challengeId: 'challenge-123',
        channel: OtpChannel.EMAIL,
        maskedTarget: 'p***@example.com',
        expiresAt: new Date(),
        code: '123456',
        target: 'patient@example.com',
      });

      await useCase.execute({ email: 'patient@example.com', locale: 'ar' });

      expect(sendOtpChallengeUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ isPractitioner: false, locale: 'ar' }),
      );
    });

    it('should propagate OTP channel resolution failures', async () => {
      const userEmail = {
        user: {
          id: 'patient-456',
          roles: [{ role: UserRoleType.PATIENT }],
          emails: [],
          phones: [],
        },
      };
      userEmailRepository.findByEmailForAuth.mockResolvedValue(
        userEmail as any,
      );
      twoFactorSettingRepository.findByUserId.mockResolvedValue(null);
      patientOtpChannelService.resolveVerifiedChannel.mockImplementation(() => {
        throw new ForbiddenException({
          messageKey: 'auth.errors.verifiedOtpChannelRequired',
          error: 'VERIFIED_OTP_CHANNEL_REQUIRED',
        });
      });

      await expect(
        useCase.execute({
          email: 'patient@example.com',
          locale: 'en',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    });

    it('should normalize email before lookup', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        useCase.execute({
          email: '  PATIENT@EXAMPLE.COM  ',
          locale: 'en',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
        'patient@example.com',
      );
    });

    describe('rate limiting', () => {
      it('throws BadRequestException when per-email+role rate limit is exceeded', async () => {
        const userEmail = {
          user: {
            id: 'patient-123',
            roles: [{ role: UserRoleType.PATIENT }],
            emails: [
              {
                email: 'patient@example.com',
                isPrimary: true,
                isVerified: true,
              },
            ],
            phones: [],
          },
        };
        userEmailRepository.findByEmailForAuth.mockResolvedValue(
          userEmail as any,
        );
        rateLimitService.check.mockResolvedValue({
          allowed: false,
          reason: 'EMAIL_ROLE_LIMIT_15MIN',
          retryAfterSeconds: 300,
          retryAfterMs: 300_000,
        });

        await expect(
          useCase.execute({ email: 'patient@example.com', locale: 'en' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
      });

      it('does not call rate limit check when email is not found', async () => {
        userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

        await expect(
          useCase.execute({ email: 'unknown@example.com', locale: 'en' }),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(rateLimitService.check).not.toHaveBeenCalled();
      });

      it('does not call rate limit check when user has no patient role', async () => {
        userEmailRepository.findByEmailForAuth.mockResolvedValue({
          user: {
            id: 'doctor-1',
            roles: [{ role: UserRoleType.PRACTITIONER }],
            emails: [],
            phones: [],
          },
        } as any);

        await expect(
          useCase.execute({ email: 'doctor@example.com', locale: 'en' }),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(rateLimitService.check).not.toHaveBeenCalled();
      });
    });
  });
});
