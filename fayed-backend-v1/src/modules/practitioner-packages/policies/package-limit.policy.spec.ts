import { ConflictException } from '@nestjs/common';
import { ConfigResolverService } from '@modules/config/services/config-resolver.service';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { PackageLimitPolicy } from './package-limit.policy';

describe('PackageLimitPolicy', () => {
  const configResolverService = {
    getNumber: jest.fn(),
  } as unknown as ConfigResolverService;

  const practitionerPackageRepository = {
    countNonArchivedByPractitionerId: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const policy = new PackageLimitPolicy(
    configResolverService,
    practitionerPackageRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows creation when the count is below the configured limit', async () => {
    (configResolverService.getNumber as jest.Mock).mockResolvedValue(4);
    (
      practitionerPackageRepository.countNonArchivedByPractitionerId as jest.Mock
    ).mockResolvedValue(2);

    await expect(
      policy.assertCanCreatePackage('practitioner-1'),
    ).resolves.toEqual({
      maxNonArchivedPackages: 4,
      currentNonArchivedPackages: 2,
    });
  });

  it('blocks creation when the practitioner is already at the configured limit', async () => {
    (configResolverService.getNumber as jest.Mock).mockResolvedValue(4);
    (
      practitionerPackageRepository.countNonArchivedByPractitionerId as jest.Mock
    ).mockResolvedValue(4);

    await expect(
      policy.assertCanCreatePackage('practitioner-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
