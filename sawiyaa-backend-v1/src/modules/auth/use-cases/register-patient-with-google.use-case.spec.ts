import { ConflictException } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@common/prisma/prisma.service';
import { CountryRepository } from '../../patients/repositories/country.repository';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { UserRepository } from '../repositories/user.repository';
import { GoogleIdentityService } from '../services/google-identity.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import { RegisterPatientWithGoogleUseCase } from './register-patient-with-google.use-case';

describe('RegisterPatientWithGoogleUseCase', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: never) => unknown) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const googleIdentityService = {
    verifyIdToken: jest.fn(),
  } as unknown as GoogleIdentityService;

  const userRepository = {
    createUser: jest.fn(),
    ensureRole: jest.fn(),
    createPatientProfileIfMissing: jest.fn(),
  } as unknown as UserRepository;

  const userEmailRepository = {
    findByEmailForAuth: jest.fn(),
    upsertPrimaryEmail: jest.fn(),
  } as unknown as UserEmailRepository;

  const authIdentityRepository = {
    findByProviderSubject: jest.fn(),
    upsertGoogleIdentity: jest.fn(),
  } as unknown as AuthIdentityRepository;

  const countryRepository = {
    findByIsoCode: jest.fn(),
  } as unknown as CountryRepository;

  const issueAuthTokensUseCase = {
    execute: jest.fn(),
  } as unknown as IssueAuthTokensUseCase;

  const useCase = new RegisterPatientWithGoogleUseCase(
    prisma,
    googleIdentityService,
    userRepository,
    userEmailRepository,
    authIdentityRepository,
    countryRepository,
    issueAuthTokensUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a transaction-time unique violation to a friendly conflict', async () => {
    (googleIdentityService.verifyIdToken as jest.Mock).mockResolvedValue({
      providerSubject: 'google-subject-1',
      email: 'google.patient@example.com',
      emailVerified: true,
      displayName: 'Google Patient',
    });
    (authIdentityRepository.findByProviderSubject as jest.Mock).mockResolvedValue(
      null,
    );
    (userEmailRepository.findByEmailForAuth as jest.Mock).mockResolvedValue(
      null,
    );
    (userRepository.createUser as jest.Mock).mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      roles: [{ role: UserRoleType.PATIENT }],
    });
    (userRepository.ensureRole as jest.Mock).mockResolvedValue(undefined);
    (userRepository.createPatientProfileIfMissing as jest.Mock).mockResolvedValue(
      undefined,
    );
    (userEmailRepository.upsertPrimaryEmail as jest.Mock).mockResolvedValue(
      undefined,
    );
    (authIdentityRepository.upsertGoogleIdentity as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const error = await useCase
      .execute({
        idToken: 'token-1',
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
    expect(issueAuthTokensUseCase.execute).not.toHaveBeenCalled();
  });
});
