import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { GetAdminPractitionerPackageUseCase } from './get-admin-practitioner-package.use-case';

describe('GetAdminPractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findAdminById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new GetAdminPractitionerPackageUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns package detail with practitioner context', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: 'APPROVED',
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: 'ACTIVE' },
      },
      statusBeforeAdminDisable: null,
    });

    const result = await useCase.execute({ packageId: 'package-1' });

    expect(result.item.practitioner.publicSlug).toBe('dr-example');
  });
});
