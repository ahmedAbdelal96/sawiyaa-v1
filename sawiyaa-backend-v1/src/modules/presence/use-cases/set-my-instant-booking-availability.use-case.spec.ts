import { BadRequestException } from '@nestjs/common';
import { SetMyInstantBookingAvailabilityUseCase } from './set-my-instant-booking-availability.use-case';

describe('SetMyInstantBookingAvailabilityUseCase', () => {
  const i18n = { t: jest.fn((key: string) => key) } as never;
  const practitionerRepository = { findByUserId: jest.fn() } as never;
  const presenceRepository = { updateInstantBookingEnabled: jest.fn() } as never;
  const mapper = { toViewModel: jest.fn(() => ({ isInstantBookingEnabled: true })) } as never;
  const useCase = new SetMyInstantBookingAvailabilityUseCase(i18n, practitionerRepository, presenceRepository, mapper);

  beforeEach(() => jest.clearAllMocks());

  it('rejects enabling when any independent instant-booking price is missing', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      instantBookingPrice30Egp: 300,
      instantBookingPrice30Usd: 10,
      instantBookingPrice60Egp: 500,
      instantBookingPrice60Usd: null,
    });

    await expect(useCase.execute({ userId: 'user-1', locale: 'en', isInstantBookingEnabled: true }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(presenceRepository.updateInstantBookingEnabled).not.toHaveBeenCalled();
  });

  it('enables when all four independent prices are present', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      instantBookingPrice30Egp: 300,
      instantBookingPrice30Usd: 10,
      instantBookingPrice60Egp: 500,
      instantBookingPrice60Usd: 16,
    });
    (presenceRepository.updateInstantBookingEnabled as jest.Mock).mockResolvedValue({});

    await useCase.execute({ userId: 'user-1', locale: 'en', isInstantBookingEnabled: true });
    expect(presenceRepository.updateInstantBookingEnabled).toHaveBeenCalledWith('practitioner-1', true);
  });
});
