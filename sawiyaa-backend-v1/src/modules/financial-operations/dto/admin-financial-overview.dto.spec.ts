import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminFinancialOverviewQueryDto } from './admin-financial-overview.dto';

describe('AdminFinancialOverviewQueryDto', () => {
  it('whitelists the filters used by the financial overview pages', async () => {
    const dto = plainToInstance(AdminFinancialOverviewQueryDto, {
      currency: 'EGP',
      fromDate: '2026-08-05',
      toDate: '2026-08-06T00:00:00.000Z',
      reviewStatus: 'PENDING_REVIEW',
      payoutStatus: 'PROCESSING',
      bookingType: 'DIRECT',
      fulfillment: 'ORIGINAL',
    });
    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
  });

  it('rejects unknown query parameters instead of allowing them to reach the service', async () => {
    const dto = plainToInstance(AdminFinancialOverviewQueryDto, { unexpected: 'value' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((error) => error.property)).toContain('unexpected');
  });
});
