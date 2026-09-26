import { AppRole } from '@common/enums/app-role.enum';
import { PatchCurrentUserProfileUseCase } from './patch-current-user-profile.use-case';

describe('PatchCurrentUserProfileUseCase', () => {
  it('routes patient display-name edits through the canonical profile path', async () => {
    const userRepository = {
      patchCurrentUserProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'Ahmed A.',
      }),
    };
    const i18nService = { t: jest.fn().mockReturnValue('updated') };
    const useCase = new PatchCurrentUserProfileUseCase(
      userRepository as never,
      i18nService as never,
    );

    await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      displayName: 'Ahmed A.',
      roles: [AppRole.PATIENT],
    });

    expect(userRepository.patchCurrentUserProfile).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'Ahmed A.',
      isPatient: true,
    });
  });

  it('preserves generic user-name behavior for non-patients', async () => {
    const userRepository = {
      patchCurrentUserProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'Admin',
      }),
    };
    const i18nService = { t: jest.fn().mockReturnValue('updated') };
    const useCase = new PatchCurrentUserProfileUseCase(
      userRepository as never,
      i18nService as never,
    );

    await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      displayName: 'Admin',
      roles: [AppRole.ADMIN],
    });

    expect(userRepository.patchCurrentUserProfile).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'Admin',
      isPatient: false,
    });
  });
});
