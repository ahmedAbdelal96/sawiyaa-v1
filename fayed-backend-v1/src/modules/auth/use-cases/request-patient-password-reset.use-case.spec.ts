import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OtpChannel, OtpPurpose, UserRoleType } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { RequestPatientPasswordResetUseCase } from './request-patient-password-reset.use-case';
import { PatientOtpChannelService } from '../services/patient-otp-channel.service';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { CreateOtpChallengeUseCase } from '../../verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '../../verification/use-cases/send-otp-challenge.use-case';

describe('RequestPatientPasswordResetUseCase', () => {
  let useCase: RequestPatientPasswordResetUseCase;
  let i18nService: jest.Mocked<I18nService>;
  let userEmailRepository: jest.Mocked<UserEmailRepository>;
  let twoFactorSettingRepository: jest.Mocked<TwoFactorSettingRepository>;
  let patientOtpChannelService: jest.Mocked<PatientOtpChannelService>;
  let createOtpChallengeUseCase: jest.Mocked<CreateOtpChallengeUseCase>;
  let sendOtpChallengeUseCase: jest.Mocked<SendOtpChallengeUseCase>;

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
  });

  describe('execute', () => {
    it('should return generic success when email does not exist (anti-enumeration)', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      const result = await useCase.execute({
        email: 'unknown@example.com',
        locale: 'en',
      });

      expect(result.message).toBe(
        'localized.auth.success.patientPasswordResetRequested',
      );
      expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return generic success when user has no patient role', async () => {
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

      const result = await useCase.execute({
        email: 'practitioner@example.com',
        locale: 'en',
      });

      expect(result.message).toBe(
        'localized.auth.success.patientPasswordResetRequested',
      );
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

    it('should return generic success when OTP channel resolution fails (anti-enumeration)', async () => {
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

      const result = await useCase.execute({
        email: 'patient@example.com',
        locale: 'en',
      });

      expect(result.message).toBe(
        'localized.auth.success.patientPasswordResetRequested',
      );
      expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    });

    it('should normalize email before lookup', async () => {
      userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

      await useCase.execute({
        email: '  PATIENT@EXAMPLE.COM  ',
        locale: 'en',
      });

      expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
        'patient@example.com',
      );
    });
  });
});
