import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SessionMode } from '@prisma/client';
import { PackagePlanQuoteRequestDto } from './package-plan-quote-request.dto';

describe('PackagePlanQuoteRequestDto', () => {
  it('rejects an unsupported session mode', () => {
    const dto = plainToInstance(PackagePlanQuoteRequestDto, {
      packagePlanCode: 'SESSIONS_4',
      practitionerSlug: 'dr-youssef-abdallah',
      durationMinutes: 60,
      sessionMode: 'INVALID',
      currencyCode: 'EGP',
    });

    const errors = validateSync(dto);

    expect(errors.some((error) => error.property === 'sessionMode')).toBe(true);
  });

  it('keeps supported session modes valid', () => {
    const dto = plainToInstance(PackagePlanQuoteRequestDto, {
      packagePlanCode: 'SESSIONS_4',
      practitionerSlug: 'dr-youssef-abdallah',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      currencyCode: 'EGP',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });
});
