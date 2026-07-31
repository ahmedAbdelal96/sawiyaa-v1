import { GetMyBookingSettingsUseCase } from './get-my-booking-settings.use-case';
import { UpdateMyBookingSettingsUseCase } from './update-my-booking-settings.use-case';

describe('practitioner booking settings', () => {
  it('defaults the normal intake state to true and keeps instant state independent', async () => {
    const prisma = {
      practitionerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          acceptsNormalBookings: true,
          presence: { isInstantBookingEnabled: false },
        }),
      },
    };
    const result = await new GetMyBookingSettingsUseCase(prisma as any).execute({ userId: 'user-1' });
    expect(result).toEqual(expect.objectContaining({ acceptsNormalBookings: true, isInstantBookingEnabled: false }));
  });

  it('updates only normal booking intake and returns the current instant setting', async () => {
    const prisma = {
      practitionerProfile: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'profile-1', acceptsNormalBookings: true })
          .mockResolvedValueOnce({
            acceptsNormalBookings: false,
            presence: { isInstantBookingEnabled: true },
          }),
        update: jest.fn().mockResolvedValue({
          acceptsNormalBookings: false,
          presence: { isInstantBookingEnabled: true },
        }),
      },
    };
    const result = await new UpdateMyBookingSettingsUseCase(prisma as any).execute({
      userId: 'user-1',
      acceptsNormalBookings: false,
      currentUser: { id: 'user-1', roles: [] } as any,
    });
    expect(prisma.practitionerProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { acceptsNormalBookings: false },
    }));
    expect(result).toEqual(expect.objectContaining({ acceptsNormalBookings: false, isInstantBookingEnabled: true }));
  });
});
