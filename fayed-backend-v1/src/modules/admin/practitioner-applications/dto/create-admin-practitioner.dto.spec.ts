import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateAdminPractitionerDto } from './create-admin-practitioner.dto';

describe('CreateAdminPractitionerDto', () => {
  const basePayload = {
    email: 'new.practitioner@example.com',
    password: 'StrongP@ssw0rd',
    languageCodes: ['en'],
    specialtySelection: {
      primarySpecialtyCategoryId: '11111111-1111-4111-8111-111111111111',
      specialtyIds: ['22222222-2222-4222-8222-222222222222'],
    },
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
});
