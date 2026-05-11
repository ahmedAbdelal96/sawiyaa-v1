import { GetCurrentUserProfileLinksUseCase } from './get-current-user-profile-links.use-case';

describe('GetCurrentUserProfileLinksUseCase', () => {
  const getCurrentUserUseCase = {
    execute: jest.fn(),
  };

  const useCase = new GetCurrentUserProfileLinksUseCase(
    getCurrentUserUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only the user id and profile links projection', async () => {
    getCurrentUserUseCase.execute.mockResolvedValue({
      userId: 'user-1',
      profileLinks: {
        patientProfileId: 'patient-profile-1',
        practitionerProfileId: 'practitioner-profile-1',
        practitionerStateSummary: null,
      },
    });

    await expect(useCase.execute({ id: 'user-1' } as any)).resolves.toEqual({
      userId: 'user-1',
      profileLinks: {
        patientProfileId: 'patient-profile-1',
        practitionerProfileId: 'practitioner-profile-1',
        practitionerStateSummary: null,
      },
    });

    expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith({
      id: 'user-1',
    });
  });
});
