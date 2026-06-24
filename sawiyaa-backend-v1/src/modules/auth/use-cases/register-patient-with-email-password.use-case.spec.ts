import { ConflictException } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@common/prisma/prisma.service';
import { CountryRepository } from '../../patients/repositories/country.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserPhoneRepository } from '../repositories/user-phone.repository';
import { UserRepository } from '../repositories/user.repository';
import { RegisterPatientWithEmailPasswordUseCase } from './register-patient-with-email-password.use-case';

describe('RegisterPatientWithEmailPasswordUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => unknown) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const userRepository = {
    createUser: jest.fn(),
    ensureRole: jest.fn(),
    createPatientProfileIfMissing: jest.fn(),
  } as unknown as UserRepository;

  const userEmailRepository = {
    findByEmailForAuth: jest.fn(),
    upsertPrimaryEmail: jest.fn(),
  } as unknown as UserEmailRepository;

  const userPhoneRepository = {
    upsertPrimaryPhone: jest.fn(),
  } as unknown as UserPhoneRepository;

  const authIdentityRepository = {
    createPasswordIdentity: jest.fn(),
  } as unknown as AuthIdentityRepository;

  const countryRepository = {
    findByIsoCode: jest.fn(),
  } as unknown as CountryRepository;

  const hashPasswordUseCase = {
    execute: jest.fn(),
  } as unknown as HashPasswordUseCase;

  const issueAuthTokensUseCase = {
    execute: jest.fn(),
  } as unknown as IssueAuthTokensUseCase;

  const useCase = new RegisterPatientWithEmailPasswordUseCase(
    prisma,
    userRepository,
    userEmailRepository,
    userPhoneRepository,
    authIdentityRepository,
    countryRepository,
    hashPasswordUseCase,
    issueAuthTokensUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new patient with a fresh email', async () => {
    (userEmailRepository.findByEmailForAuth as jest.Mock).mockResolvedValue(
      null,
    );
    (hashPasswordUseCase.execute as jest.Mock).mockResolvedValue('hashed');
    (userRepository.createUser as jest.Mock).mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
    });
    (userRepository.ensureRole as jest.Mock).mockResolvedValue(undefined);
    (userRepository.createPatientProfileIfMissing as jest.Mock).mockResolvedValue(
      undefined,
    );
    (userEmailRepository.upsertPrimaryEmail as jest.Mock).mockResolvedValue(
      undefined,
    );
    (authIdentityRepository.createPasswordIdentity as jest.Mock).mockResolvedValue(
      undefined,
    );
    (issueAuthTokensUseCase.execute as jest.Mock).mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date('2026-06-18T10:00:00.000Z'),
        refreshTokenExpiresAt: new Date('2026-06-18T11:00:00.000Z'),
      },
      user: { id: 'user-1' },
    });

    const result = await useCase.execute({
      email: 'New.Patient@example.com',
      password: 'Password123!',
      displayName: 'New Patient',
      deviceContext: {
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });

    expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
      'new.patient@example.com',
    );
    expect(issueAuthTokensUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: UserRoleType.PATIENT,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        tokens: expect.any(Object),
        user: { id: 'user-1' },
      }),
    );
  });

  it('returns a friendly conflict for an existing email with the same casing', async () => {
    (userEmailRepository.findByEmailForAuth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
    });

    const error = await useCase
      .execute({
        email: 'Ahmed.Test@example.com',
        password: 'Password123!',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      })
      .catch((caught: unknown) => caught as ConflictException);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      messageKey: 'auth.errors.emailAlreadyRegistered',
      error: 'EMAIL_ALREADY_REGISTERED',
    });
    expect(issueAuthTokensUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns a friendly conflict for an existing email with different casing', async () => {
    (userEmailRepository.findByEmailForAuth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
    });

    const error = await useCase
      .execute({
        email: 'ahmed.test@example.com',
        password: 'Password123!',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      })
      .catch((caught: unknown) => caught as ConflictException);

    expect(error).toBeInstanceOf(ConflictException);
    expect(userEmailRepository.findByEmailForAuth).toHaveBeenCalledWith(
      'ahmed.test@example.com',
    );
    expect(error.getResponse()).toEqual({
      messageKey: 'auth.errors.emailAlreadyRegistered',
      error: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('maps a password identity unique violation to a friendly conflict', async () => {
    (userEmailRepository.findByEmailForAuth as jest.Mock).mockResolvedValue(
      null,
    );
    (hashPasswordUseCase.execute as jest.Mock).mockResolvedValue('hashed');
    (userRepository.createUser as jest.Mock).mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
    });
    (userRepository.ensureRole as jest.Mock).mockResolvedValue(undefined);
    (userRepository.createPatientProfileIfMissing as jest.Mock).mockResolvedValue(
      undefined,
    );
    (userEmailRepository.upsertPrimaryEmail as jest.Mock).mockResolvedValue(
      undefined,
    );
    (authIdentityRepository.createPasswordIdentity as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const error = await useCase
      .execute({
        email: 'patient.dup@example.com',
        password: 'Password123!',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      })
      .catch((caught: unknown) => caught as ConflictException);

    expect(error).toBeInstanceOf(ConflictException);
    expect(JSON.stringify(error.getResponse())).not.toContain('P2002');
    expect(JSON.stringify(error.getResponse())).not.toContain(
      'AuthIdentity_user_password_unique_idx',
    );
  });
});
