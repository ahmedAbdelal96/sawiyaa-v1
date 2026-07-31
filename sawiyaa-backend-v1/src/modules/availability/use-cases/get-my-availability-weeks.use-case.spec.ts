import { BadRequestException } from '@nestjs/common';
import { GetMyAvailabilityWeeksUseCase } from './get-my-availability-weeks.use-case';

describe('GetMyAvailabilityWeeksUseCase timezone requirements', () => {
  it.each([null, 'Not/AZone'])('rejects a missing or invalid practitioner timezone: %s', async (timezone) => {
    const useCase = new GetMyAvailabilityWeeksUseCase(
      { t: jest.fn() } as never,
      { findByUserId: jest.fn().mockResolvedValue({ id: 'p1', user: { timezone } }) } as never,
      { buildForPractitioner: jest.fn() } as never,
    );

    await expect(
      useCase.execute({ userId: 'u1', locale: 'en' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        messageKey: 'availability.errors.timezoneRequired',
        error: 'AVAILABILITY_TIMEZONE_REQUIRED',
      }),
    });
  });
});
