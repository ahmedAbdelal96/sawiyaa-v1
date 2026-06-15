import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateAdminPractitionerDto } from './create-admin-practitioner.dto';

describe('CreateAdminPractitionerDto', () => {
  const basePayload = {
    email: 'new.practitioner@example.com',
    password: 'StrongP@ssw0rd',
    displayName: 'Dr. Nour',
    practitionerType: 'PSYCHOLOGIST',
    professionalTitle: 'Clinical Psychologist',
    bio: 'Experienced psychologist focused on adult anxiety support.',
    yearsOfExperience: 6,
    countryCode: 'EG',
    languageCodes: ['en'],
    specialtySelection: {
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      specialtyIds: ['22222222-2222-4222-8222-222222222222'],
    },
    payoutDestination: {
      methodType: 'BANK_ACCOUNT',
      accountHolderName: 'Dr. Nour',
      bankName: 'Bank',
      bankAccountNumber: '123456789',
    },
    credentials: [
      {
        credentialType: 'DEGREE',
        fileUrl:
          '/uploads/practitioners/admin-direct-create/credentials/degree.pdf',
      },
    ],
  };

  it('accepts positive dual-currency session prices', () => {
    const dto = plainToInstance(CreateAdminPractitionerDto, {
      ...basePayload,
      sessionPrice30Egp: 250,
      sessionPrice30Usd: 8,
      sessionPrice60Egp: 450,
      sessionPrice60Usd: 15,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects zero or negative session prices', () => {
    const dto = plainToInstance(CreateAdminPractitionerDto, {
      ...basePayload,
      sessionPrice30Egp: 0,
      sessionPrice30Usd: -1,
      sessionPrice60Egp: 0,
      sessionPrice60Usd: -10,
    });

    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'sessionPrice30Egp')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'sessionPrice30Usd')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'sessionPrice60Egp')).toBe(
      true,
    );
    expect(errors.some((error) => error.property === 'sessionPrice60Usd')).toBe(
      true,
    );
  });

  it('rejects weak passwords and unmanaged credential file paths', () => {
    const dto = plainToInstance(CreateAdminPractitionerDto, {
      ...basePayload,
      password: 'password',
      credentials: [
        {
          credentialType: 'DEGREE',
          fileUrl: 'https://files.example.com/degree.pdf',
        },
      ],
    });

    const errors = validateSync(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
    expect(
      errors.some((error) => error.property === 'credentials'),
    ).toBe(true);
  });
});
