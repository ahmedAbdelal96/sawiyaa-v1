import { UpdatePractitionerAvatarUseCase } from './update-practitioner-avatar.use-case';
import { RemovePractitionerAvatarUseCase } from './remove-practitioner-avatar.use-case';

describe('approved practitioner avatar governance', () => {
  const i18n = { t: jest.fn((key: string) => key) } as never;
  const profileRepository = {
    findByUserId: jest.fn(),
    updateAvatarByUserId: jest.fn(),
  } as never;
  const storage = {
    isAllowedMimeType: jest.fn(() => true),
    saveAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
  } as never;
  const changeReviewService = { upsert: jest.fn() } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (profileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'profile-1',
      status: 'APPROVED',
      avatarUrl: 'https://cdn/current.webp',
    });
    (storage.saveAvatar as jest.Mock).mockResolvedValue({
      avatarUrl: 'https://cdn/proposed.webp',
    });
  });

  it('stages an uploaded avatar and keeps the approved avatar live', async () => {
    const useCase = new UpdatePractitionerAvatarUseCase(
      i18n,
      profileRepository,
      storage,
      changeReviewService,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      file: { buffer: Buffer.from('image'), mimetype: 'image/webp', size: 5 },
    });

    expect(changeReviewService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'profile-1',
        profile: { avatarUrl: 'https://cdn/proposed.webp' },
      }),
    );
    expect(profileRepository.updateAvatarByUserId).not.toHaveBeenCalled();
    expect(result.avatar.avatarUrl).toBe('https://cdn/current.webp');
  });

  it('stages avatar removal without deleting the approved file', async () => {
    const useCase = new RemovePractitionerAvatarUseCase(
      i18n,
      profileRepository,
      storage,
      changeReviewService,
    );

    const result = await useCase.execute({ userId: 'user-1', locale: 'en' });

    expect(changeReviewService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'profile-1',
        profile: { avatarUrl: null },
      }),
    );
    expect(storage.deleteAvatar).not.toHaveBeenCalled();
    expect(result.avatar.avatarUrl).toBe('https://cdn/current.webp');
  });
});
