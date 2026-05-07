import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PackageSchedulePolicy, PractitionerPackageStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreatePractitionerPackageDto } from '../dto/create-practitioner-package.dto';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PackageLimitPolicy } from '../policies/package-limit.policy';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';

@Injectable()
export class CreatePractitionerPackageUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly packageLimitPolicy: PackageLimitPolicy,
    private readonly validatePractitionerPackageService: ValidatePractitionerPackageService,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: {
    userId: string;
    payload: CreatePractitionerPackageDto;
  }) {
    const profile = await this.practitionerPackageRepository.findPractitionerProfileByUserId(
      input.userId,
    );

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'packages.errors.practitionerProfileNotFound',
        error: 'PACKAGE_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    this.validatePractitionerPackageService.validateDraft({
      title: input.payload.title,
      sessionCount: input.payload.sessionCount,
      sessionDurationMinutes: input.payload.sessionDurationMinutes,
      sessionMode: input.payload.sessionMode,
      priceEgp: input.payload.priceEgp,
      priceUsd: input.payload.priceUsd,
      schedulePolicy:
        input.payload.schedulePolicy ??
        PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
    });

    await this.packageLimitPolicy.assertCanCreatePackage(profile.id);

    const slug = await this.resolveUniqueSlug(profile.id, input.payload.title);

    try {
      const created = await this.practitionerPackageRepository.createDraft({
        practitionerId: profile.id,
        slug,
        title: input.payload.title.trim(),
        description: input.payload.description?.trim() || null,
        sessionCount: input.payload.sessionCount,
        sessionDurationMinutes: input.payload.sessionDurationMinutes,
        sessionMode: input.payload.sessionMode,
        priceEgp: input.payload.priceEgp,
        priceUsd: input.payload.priceUsd,
        status: PractitionerPackageStatus.DRAFT,
        schedulePolicy:
          input.payload.schedulePolicy ??
          PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
        version: 1,
      });

      return {
        item: this.practitionerPackagePresenter.toDetail(created),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'packages.errors.slugAlreadyExists',
          error: 'PACKAGE_SLUG_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }

  private async resolveUniqueSlug(
    practitionerId: string,
    title: string,
  ): Promise<string> {
    const base = this.slugifyTitle(title);
    let candidate = base;
    let suffix = 2;

    while (
      await this.practitionerPackageRepository.findByPractitionerIdAndSlug(
        practitionerId,
        candidate,
      )
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugifyTitle(title: string): string {
    const normalized = title.trim().toLowerCase().normalize('NFKD');
    const slug = normalized
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'package';
  }
}
