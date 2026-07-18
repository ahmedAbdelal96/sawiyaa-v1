import { PractitionerStatus } from '@prisma/client';
import { AdminPractitionerProfileRepository } from './admin-practitioner-profile.repository';

describe('AdminPractitionerProfileRepository', () => {
  it('publishes the profile atomically with approval status', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'profile-1',
      status: PractitionerStatus.APPROVED,
      isPublicProfilePublished: true,
    });
    const repository = new AdminPractitionerProfileRepository({
      practitionerProfile: { update },
    } as never);

    await repository.updateStatusAndPublish(
      'profile-1',
      PractitionerStatus.APPROVED,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: {
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      select: {
        id: true,
        status: true,
        isPublicProfilePublished: true,
      },
    });
  });
});
