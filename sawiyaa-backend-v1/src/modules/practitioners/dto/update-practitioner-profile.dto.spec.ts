import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdatePractitionerProfileDto } from './update-practitioner-profile.dto';

describe('UpdatePractitionerProfileDto', () => {
  it('accepts positive dual-currency session prices', () => {
    const dto = plainToInstance(UpdatePractitionerProfileDto, {
      sessionPrice30Egp: 250,
      sessionPrice30Usd: 8,
      sessionPrice60Egp: 450,
      sessionPrice60Usd: 15,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects zero or negative session prices', () => {
    const dto = plainToInstance(UpdatePractitionerProfileDto, {
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

  it('accepts a package availability toggle', () => {
    const dto = plainToInstance(UpdatePractitionerProfileDto, {
      acceptsPackage: true,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
