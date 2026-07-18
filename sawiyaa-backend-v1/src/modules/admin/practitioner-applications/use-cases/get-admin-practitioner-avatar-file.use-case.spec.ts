import { NotFoundException } from '@nestjs/common';
import { GetAdminPractitionerAvatarFileUseCase } from './get-admin-practitioner-avatar-file.use-case';

describe('GetAdminPractitionerAvatarFileUseCase', () => {
  it('returns only the stored avatar file for an admin-visible profile', async () => {
    const profileRepository = {
      findById: jest.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const avatarStorage = {
      getAvatarFile: jest.fn().mockResolvedValue({
        absolutePath: 'C:/safe/avatar.jpg',
        mimeType: 'image/jpeg',
      }),
    };

    const result = await new GetAdminPractitionerAvatarFileUseCase(
      profileRepository as never,
      avatarStorage as never,
    ).execute('profile-1');

    expect(avatarStorage.getAvatarFile).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      absolutePath: 'C:/safe/avatar.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('returns not found when the profile has no avatar', async () => {
    const profileRepository = {
      findById: jest.fn().mockResolvedValue({ userId: 'user-1' }),
    };
    const avatarStorage = {
      getAvatarFile: jest.fn().mockResolvedValue(null),
    };

    await expect(
      new GetAdminPractitionerAvatarFileUseCase(
        profileRepository as never,
        avatarStorage as never,
      ).execute('profile-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
