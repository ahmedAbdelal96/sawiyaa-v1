import { NotFoundException } from '@nestjs/common';
import {
  PractitionerStatus,
  UserStatus,
  PractitionerPackageStatus,
} from '@prisma/client';
import { PublicPractitionerReadRepository } from '@modules/practitioners/repositories/public-practitioner-read.repository';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { GetPublicPractitionerPackageUseCase } from './get-public-practitioner-package.use-case';

describe('GetPublicPractitionerPackageUseCase', () => {
  const publicPractitionerReadRepository = {
    findByPublicSlug: jest.fn(),
  } as unknown as PublicPractitionerReadRepository;

  const publicPractitionerVisibilityPolicy = {
    evaluate: jest.fn(),
  } as unknown as PublicPractitionerVisibilityPolicy;

  const practitionerPackageRepository = {
    findPublicByPractitionerSlugAndPackageSlug: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new GetPublicPractitionerPackageUseCase(
    publicPractitionerReadRepository,
    publicPractitionerVisibilityPolicy,
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one public package when the practitioner is visible and package is active', async () => {
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
      practitionerPackageRepository.findPublicByPractitionerSlugAndPackageSlug as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
    });

    const result = await useCase.execute({
      practitionerSlug: 'dr-example',
      packageSlug: 'starter',
      locale: 'en',
    } as never);

    expect(result.item.item.id).toBe('package-1');
  });

  it('rejects inactive public packages', async () => {
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
      practitionerPackageRepository.findPublicByPractitionerSlugAndPackageSlug as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        practitionerSlug: 'dr-example',
        packageSlug: 'starter',
        locale: 'en',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
