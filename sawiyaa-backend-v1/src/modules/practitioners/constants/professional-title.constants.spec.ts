import {
  assertProfessionalTitle,
  normalizeProfessionalTitle,
  PROFESSIONAL_TITLE_VALUES,
} from './professional-title.constants';
import { BadRequestException } from '@nestjs/common';

describe('professional title contract', () => {
  it.each(PROFESSIONAL_TITLE_VALUES)('accepts %s', (value) => {
    expect(assertProfessionalTitle(value, { required: true })).toBe(value);
  });

  it('normalizes only unambiguous legacy labels', () => {
    expect(normalizeProfessionalTitle('Psychologist')).toBe('PSYCHOLOGIST');
    expect(normalizeProfessionalTitle('Clinical Psychologist')).toBe(
      'CLINICAL_PSYCHOLOGIST',
    );
    expect(normalizeProfessionalTitle('Consultant')).toBeNull();
  });

  it('rejects arbitrary new values', () => {
    expect(() => assertProfessionalTitle('Consultant')).toThrow(BadRequestException);
    expect(() => assertProfessionalTitle('', { required: true })).toThrow(BadRequestException);
  });
});
