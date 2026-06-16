import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListPatientInstantBookingPractitionersDto } from './list-patient-instant-booking-practitioners.dto';

describe('ListPatientInstantBookingPractitionersDto', () => {
  it('rejects invalid duration, currency, and pagination values', () => {
    const dto = plainToInstance(ListPatientInstantBookingPractitionersDto, {
      duration: 45,
      currency: 'cad',
      page: 0,
      limit: 51,
    });

    const errors = validateSync(dto);
    const errorProperties = errors.map((error) => error.property);

    expect(errorProperties).toEqual(
      expect.arrayContaining(['duration', 'currency', 'page', 'limit']),
    );
  });

  it('accepts supported discovery filters', () => {
    const dto = plainToInstance(ListPatientInstantBookingPractitionersDto, {
      duration: 30,
      currency: 'egp',
      page: 1,
      limit: 20,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.currency).toBe('EGP');
  });
});
