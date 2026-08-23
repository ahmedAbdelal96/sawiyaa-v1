import { ConflictException } from '@nestjs/common';
import { PractitionerType, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@common/prisma/prisma.service';
import { HashPasswordUseCase } from './hash-password.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { TwoFactorSettingRepository } from '../repositories/two-factor-setting.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserRepository } from '../repositories/user.repository';
import { RegisterPractitionerAccountUseCase } from './register-practitioner-account.use-case';
import { PhoneNumberValidationService } from '@common/validation/phone-number-validation.service';

describe('RegisterPractitionerAccountUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => unknown) => callback({} as never)),
  } as unknown as PrismaService;
  const userRepository = { createUser: jest.fn(), ensureRole: jest.fn() } as unknown as UserRepository;
  const userEmailRepository = { findByEmail: jest.fn(), createPrimaryEmail: jest.fn() } as unknown as UserEmailRepository;
  const authIdentityRepository = { createPasswordIdentity: jest.fn() } as unknown as AuthIdentityRepository;
  const userPhoneRepository = { upsertPrimaryPhone: jest.fn() } as any;
  const phoneNumberValidationService = {
    validate: jest.fn().mockReturnValue({ valid: true, e164: '+201012345678', countryCode: 'EG' }),
  } as unknown as PhoneNumberValidationService;
  const twoFactorSettingRepository = { upsertPractitionerDefault: jest.fn() } as unknown as TwoFactorSettingRepository;
  const hashPasswordUseCase = { execute: jest.fn() } as unknown as HashPasswordUseCase;

  const useCase = new RegisterPractitionerAccountUseCase(
    prisma,
    userRepository,
    userEmailRepository,
    userPhoneRepository,
    authIdentityRepository,
    twoFactorSettingRepository,
    hashPasswordUseCase,
    phoneNumberValidationService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates the account and an empty application specialty selection', async () => {
    (userEmailRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (hashPasswordUseCase.execute as jest.Mock).mockResolvedValue('hashed');
    const tx = { practitionerApplication: { create: jest.fn().mockResolvedValue(undefined) } };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(
      async (callback: (tx: never) => unknown) => callback(tx as never),
    );
    (userRepository.createUser as jest.Mock).mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE });

    const result = await useCase.execute({
      email: 'practitioner.new@example.com',
      phone: '01012345678',
      phoneCountryCode: 'EG',
      password: 'Password123!',
      displayName: 'Practitioner New',
    });

    expect(result).toEqual({
      userId: 'user-1',
      requiresOtpOnLogin: true,
      phone: { status: 'SAVED' },
    });
    expect(tx.practitionerApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'DRAFT',
        submissionSnapshot: expect.objectContaining({
          profile: expect.objectContaining({
            practitionerType: PractitionerType.OTHER,
            practitionerTypeExplicit: false,
          }),
          specialtySelection: null,
        }),
      }),
    });
    expect(twoFactorSettingRepository.upsertPractitionerDefault).toHaveBeenCalledWith('user-1', 'EMAIL');
  });

  it('returns a friendly conflict for an existing email with different casing', async () => {
    (userEmailRepository.findByEmail as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });

    const error = await useCase
      .execute({ email: 'Practitioner.Dup@Example.com', password: 'Password123!' })
      .catch((caught: unknown) => caught as ConflictException);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      messageKey: 'auth.errors.emailAlreadyRegistered',
      error: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('does not mislabel a password identity unique violation as duplicate email', async () => {
    (userEmailRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (hashPasswordUseCase.execute as jest.Mock).mockResolvedValue('hashed');
    const tx = { practitionerApplication: { create: jest.fn().mockResolvedValue(undefined) } };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(
      async (callback: (tx: never) => unknown) => callback(tx as never),
    );
    (userRepository.createUser as jest.Mock).mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE });
    (authIdentityRepository.createPasswordIdentity as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'test' }),
    );

    await expect(
      useCase.execute({ email: 'practitioner.dup@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(PrismaClientKnownRequestError);
  });
});
