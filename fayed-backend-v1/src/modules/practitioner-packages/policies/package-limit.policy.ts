import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigScopeType } from '@prisma/client';
import { ConfigResolverService } from '@modules/config/services/config-resolver.service';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';

@Injectable()
export class PackageLimitPolicy {
  constructor(
    private readonly configResolverService: ConfigResolverService,
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
  ) {}

  async resolveMaxNonArchivedPackages(practitionerId: string): Promise<number> {
    const limit = await this.configResolverService.getNumber(
      'packages.practitioner.maxNonArchivedPackages',
      {
        scopes: [
          {
            scopeType: ConfigScopeType.PRACTITIONER,
            scopeRefId: practitionerId,
          },
          {
            scopeType: ConfigScopeType.GLOBAL,
          },
        ],
      },
    );

    if (limit === null) {
      throw new InternalServerErrorException(
        'Package limit configuration is missing',
      );
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new InternalServerErrorException(
        'Package limit configuration must be a positive integer',
      );
    }

    return limit;
  }

  async assertCanCreatePackage(practitionerId: string): Promise<{
    maxNonArchivedPackages: number;
    currentNonArchivedPackages: number;
  }> {
    const [maxNonArchivedPackages, currentNonArchivedPackages] =
      await Promise.all([
        this.resolveMaxNonArchivedPackages(practitionerId),
        this.practitionerPackageRepository.countNonArchivedByPractitionerId(
          practitionerId,
        ),
      ]);

    if (currentNonArchivedPackages >= maxNonArchivedPackages) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageLimitReached',
        error: 'PACKAGE_LIMIT_REACHED',
        details: {
          maxNonArchivedPackages,
          currentNonArchivedPackages,
        },
      });
    }

    return {
      maxNonArchivedPackages,
      currentNonArchivedPackages,
    };
  }
}
