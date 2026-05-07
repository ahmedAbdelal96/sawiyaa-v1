import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PackageSchedulePolicy,
  Prisma,
  PractitionerPackageStatus,
  SessionMode,
} from '@prisma/client';
import { UpdatePractitionerPackageDto } from '../dto/update-practitioner-package.dto';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';

@Injectable()
export class UpdatePractitionerPackageUseCase {
  constructor(
    private readonly practitionerPackageRepository: PractitionerPackageRepository,
    private readonly validatePractitionerPackageService: ValidatePractitionerPackageService,
    private readonly practitionerPackagePresenter: PractitionerPackagePresenter,
  ) {}

  async execute(input: {
    userId: string;
    packageId: string;
    payload: UpdatePractitionerPackageDto;
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

    const packageTemplate =
      await this.practitionerPackageRepository.findByIdAndPractitionerId(
        input.packageId,
        profile.id,
      );

    if (!packageTemplate) {
      throw new NotFoundException({
        messageKey: 'packages.errors.packageNotFound',
        error: 'PACKAGE_NOT_FOUND',
      });
    }

    if (packageTemplate.archivedAt) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageArchived',
        error: 'PACKAGE_ARCHIVED',
      });
    }

    if (packageTemplate.status === PractitionerPackageStatus.DISABLED_BY_ADMIN) {
      throw new ConflictException({
        messageKey: 'packages.errors.packageDisabledByAdmin',
        error: 'PACKAGE_DISABLED_BY_ADMIN',
      });
    }

    const merged = this.mergePackageValues({
      current: packageTemplate,
      payload: input.payload,
    });

    this.validatePractitionerPackageService.validateDraft({
      title: merged.title,
      sessionCount: merged.sessionCount,
      sessionDurationMinutes: merged.sessionDurationMinutes,
      sessionMode: merged.sessionMode,
      priceEgp: Number(merged.priceEgp.toString()),
      priceUsd: Number(merged.priceUsd.toString()),
      schedulePolicy: merged.schedulePolicy,
    });

    const hasCustomerFacingChanges = this.hasCustomerFacingChanges({
      current: packageTemplate,
      merged,
    });

    const updated = await this.practitionerPackageRepository.updateById(
      packageTemplate.id,
      {
        title: merged.title.trim(),
        description: merged.description,
        sessionCount: merged.sessionCount,
        sessionDurationMinutes: merged.sessionDurationMinutes,
        sessionMode: merged.sessionMode,
        priceEgp: merged.priceEgp,
        priceUsd: merged.priceUsd,
        schedulePolicy: merged.schedulePolicy,
        version: hasCustomerFacingChanges
          ? packageTemplate.version + 1
          : packageTemplate.version,
      } satisfies Prisma.PractitionerPackageUncheckedUpdateInput,
    );

    return {
      item: this.practitionerPackagePresenter.toDetail(updated),
    };
  }

  private mergePackageValues(input: {
    current: {
      title: string;
      description: string | null;
      sessionCount: number;
      sessionDurationMinutes: number;
      sessionMode: SessionMode;
      priceEgp: Prisma.Decimal;
      priceUsd: Prisma.Decimal;
      schedulePolicy: PackageSchedulePolicy;
    };
    payload: UpdatePractitionerPackageDto;
  }) {
    return {
      title: input.payload.title ?? input.current.title,
      description:
        input.payload.description === undefined
          ? input.current.description
          : input.payload.description?.trim() || null,
      sessionCount: input.payload.sessionCount ?? input.current.sessionCount,
      sessionDurationMinutes:
        input.payload.sessionDurationMinutes ??
        input.current.sessionDurationMinutes,
      sessionMode: input.payload.sessionMode ?? input.current.sessionMode,
      priceEgp: input.payload.priceEgp !== undefined
        ? new Prisma.Decimal(input.payload.priceEgp)
        : input.current.priceEgp,
      priceUsd: input.payload.priceUsd !== undefined
        ? new Prisma.Decimal(input.payload.priceUsd)
        : input.current.priceUsd,
      schedulePolicy:
        input.payload.schedulePolicy ?? input.current.schedulePolicy,
    };
  }

  private hasCustomerFacingChanges(input: {
    current: {
      title: string;
      description: string | null;
      sessionCount: number;
      sessionDurationMinutes: number;
      sessionMode: SessionMode;
      priceEgp: Prisma.Decimal;
      priceUsd: Prisma.Decimal;
      schedulePolicy: PackageSchedulePolicy;
    };
    merged: {
      title: string;
      description: string | null;
      sessionCount: number;
      sessionDurationMinutes: number;
      sessionMode: SessionMode;
      priceEgp: Prisma.Decimal;
      priceUsd: Prisma.Decimal;
      schedulePolicy: PackageSchedulePolicy;
    };
  }) {
    return (
      input.current.title.trim() !== input.merged.title.trim() ||
      (input.current.description ?? null) !==
        (input.merged.description ?? null) ||
      input.current.sessionCount !== input.merged.sessionCount ||
      input.current.sessionDurationMinutes !==
        input.merged.sessionDurationMinutes ||
      input.current.sessionMode !== input.merged.sessionMode ||
      input.current.priceEgp.toString() !== input.merged.priceEgp.toString() ||
      input.current.priceUsd.toString() !== input.merged.priceUsd.toString() ||
      input.current.schedulePolicy !== input.merged.schedulePolicy
    );
  }
}
