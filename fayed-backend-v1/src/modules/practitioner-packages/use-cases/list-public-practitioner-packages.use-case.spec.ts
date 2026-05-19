import { NotFoundException } from '@nestjs/common';
import { PractitionerStatus, UserStatus } from '@prisma/client';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ListPublicPractitionerPackagesUseCase } from './list-public-practitioner-packages.use-case';

describe('ListPublicPractitionerPackagesUseCase', () => {
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;

  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as unknown as PublicPractitionerVisibilityPolicy;

  const practitionerPackageRepository = {
    listPublicActiveByPractitionerId: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toListItem: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new ListPublicPractitionerPackagesUseCase(
    publicPractitionerReadRepository,
    publicPractitionerVisibilityPolicy,
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only public active packages for visible practitioners who accept packages', async () => {
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      publicSlug: 'dr-example',
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
      isPublicProfilePublished: true,
      user: {
        status: UserStatus.ACTIVE,
        displayName: 'Dr Example',
      },
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{}],
    });
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
      isVerified: true,
    });
    (
      practitionerPackageRepository.listPublicActiveByPractitionerId as jest.Mock
    ).mockResolvedValue([[{ id: 'package-1' }], 1]);

    const result = await useCase.execute({
      slug: 'dr-example',
      locale: 'en',
      query: { page: 1, limit: 20 },
    } as never);

    expect(
      practitionerPackageRepository.listPublicActiveByPractitionerId,
    ).toHaveBeenCalledWith({
      practitionerId: 'practitioner-1',
      page: 1,
      limit: 20,
    });
    expect(result.item.items).toHaveLength(1);
  });

  it('rejects practitioners that do not accept packages', async () => {
    (
      publicPractitionerReadRepository.findByPublicSlug as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      publicSlug: 'dr-example',
      status: PractitionerStatus.APPROVED,
      acceptsPackages: false,
      isPublicProfilePublished: true,
      user: {
        status: UserStatus.ACTIVE,
        displayName: 'Dr Example',
      },
      professionalTitle: 'Therapist',
      bio: 'Bio',
      specialties: [{}],
    });
    (publicPractitionerVisibilityPolicy.evaluate as jest.Mock).mockReturnValue({
      isVisible: true,
      isVerified: true,
    });

    await expect(
      useCase.execute({
        slug: 'dr-example',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
