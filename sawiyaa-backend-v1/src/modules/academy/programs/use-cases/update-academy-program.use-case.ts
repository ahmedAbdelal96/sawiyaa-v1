import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { UpdateAcademyProgramDto } from '../dto/update-academy-program.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  ensureAcademyProgramRequiredFields,
  normalizeAcademyProgramPriceValue,
  parseAcademyProgramDate,
  resolveAcademyProgramSlugSource,
} from '../utils/academy-program.util';

@Injectable()
export class UpdateAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    programId: string;
    payload: UpdateAcademyProgramDto;
    actorUserId?: string;
    actorRoles?: string[];
  }) {
    const existing = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const categoryId =
      input.payload.categoryId !== undefined
        ? input.payload.categoryId.trim() || null
        : undefined;
    if (categoryId) {
      const category = await this.academyProgramRepository.findCategoryById(
        categoryId,
      );
      if (!category) {
        throw new NotFoundException({
          messageKey: 'academyProgram.errors.categoryNotFound',
          error: 'ACADEMY_PROGRAM_CATEGORY_NOT_FOUND',
        });
      }
    }

    const startAt =
      input.payload.startAt !== undefined
        ? parseAcademyProgramDate(input.payload.startAt)
        : existing.startAt;
    const endAt =
      input.payload.endAt !== undefined
        ? parseAcademyProgramDate(input.payload.endAt)
        : existing.endAt;
    const titleAr =
      input.payload.titleAr !== undefined ? input.payload.titleAr : existing.titleAr;
    const titleEn =
      input.payload.titleEn !== undefined ? input.payload.titleEn : existing.titleEn;
    const descriptionAr =
      input.payload.descriptionAr !== undefined
        ? input.payload.descriptionAr
        : existing.descriptionAr;
    const descriptionEn =
      input.payload.descriptionEn !== undefined
        ? input.payload.descriptionEn
        : existing.descriptionEn;
    const priceEgpRaw =
      input.payload.priceEgp !== undefined
        ? input.payload.priceEgp
        : existing.priceEgp?.toString() ?? null;
    const priceUsdRaw =
      input.payload.priceUsd !== undefined
        ? input.payload.priceUsd
        : existing.priceUsd?.toString() ?? null;
    ensureAcademyProgramRequiredFields({
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      priceEgp: priceEgpRaw,
      priceUsd: priceUsdRaw,
      startAt,
      endAt,
    });
    ensureAcademyProgramWindowIsValid({ startAt, endAt });

    const slug =
      input.payload.slug !== undefined
        ? await this.resolveUniqueSlug(
            resolveAcademyProgramSlugSource({
              slug: input.payload.slug,
              titleAr,
              titleEn,
            }),
            existing.id,
          )
        : undefined;

    const priceEgp =
      input.payload.priceEgp !== undefined
        ? normalizeAcademyProgramPriceValue(input.payload.priceEgp)
        : existing.priceEgp?.toString() ?? null;
    const priceUsd =
      input.payload.priceUsd !== undefined
        ? normalizeAcademyProgramPriceValue(input.payload.priceUsd)
        : existing.priceUsd?.toString() ?? null;

    const data: Prisma.AcademyProgramUncheckedUpdateInput = {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
        descriptionAr: descriptionAr?.trim() || null,
        descriptionEn: descriptionEn?.trim() || null,
        slug,
        coverImageUrl:
          input.payload.coverImageUrl !== undefined
            ? input.payload.coverImageUrl.trim() || null
            : undefined,
        categoryId,
        priceEgp,
        priceUsd,
        registrationOpen: input.payload.registrationOpen,
        maxSeats:
          input.payload.maxSeats !== undefined ? input.payload.maxSeats : undefined,
        startAt,
        endAt,
    };
    const updated = this.prisma && this.securityAuditService && input.actorUserId
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.updateProgram(input.programId, data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action: 'academy.program.update',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.actorUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgram',
            resourceId: record.id,
            metadata: {
              slug: record.slug,
              changedFields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
              status: record.status,
              registrationOpen: record.registrationOpen,
            },
          });
          return record;
        })
      : await this.academyProgramRepository.updateProgram(input.programId, data);

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }

  private async resolveUniqueSlug(baseSlug: string, programId?: string) {
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.academyProgramRepository.findProgramBySlug(
        candidate,
      );

      if (!existing || existing.id === programId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }
}
