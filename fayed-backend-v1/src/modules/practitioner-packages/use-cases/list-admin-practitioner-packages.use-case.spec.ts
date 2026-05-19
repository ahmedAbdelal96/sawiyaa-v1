import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ListAdminPractitionerPackagesUseCase } from './list-admin-practitioner-packages.use-case';

describe('ListAdminPractitionerPackagesUseCase', () => {
  const practitionerPackageRepository = {
    listAdminPackages: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toListItem: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new ListAdminPractitionerPackagesUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes admin filters through and maps practitioner context', async () => {
    (
      practitionerPackageRepository.listAdminPackages as jest.Mock
    ).mockResolvedValue([
      [
        {
          id: 'package-1',
          practitioner: {
            id: 'practitioner-1',
            publicSlug: 'dr-example',
            status: 'APPROVED',
            acceptsPackages: true,
            user: { displayName: 'Dr Example', status: 'ACTIVE' },
          },
        },
      ],
      1,
    ]);

    const result = await useCase.execute({
      query: {
        page: 1,
        limit: 10,
        q: 'starter',
      } as never,
    });

    expect(
      practitionerPackageRepository.listAdminPackages,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'starter',
      }),
    );
    expect(result.items[0].practitioner.publicSlug).toBe('dr-example');
  });
});
