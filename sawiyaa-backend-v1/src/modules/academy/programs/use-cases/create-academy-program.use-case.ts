import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AcademyProgramStatus, Prisma, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { CreateAcademyProgramDto } from '../dto/create-academy-program.dto';
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
export class CreateAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    createdByUserId: string;
    actorRoles?: string[];
    payload: CreateAcademyProgramDto;
  }) {
    const payload = input.payload;
    const categoryId = payload.categoryId?.trim() || null;
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

    const startAt = parseAcademyProgramDate(payload.startAt ?? null);
    const endAt = parseAcademyProgramDate(payload.endAt ?? null);
    ensureAcademyProgramRequiredFields({
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
      descriptionAr: payload.descriptionAr,
      descriptionEn: payload.descriptionEn,
      priceEgp: payload.priceEgp,
      priceUsd: payload.priceUsd,
      startAt,
      endAt,
    });
    ensureAcademyProgramWindowIsValid({ startAt, endAt });

    const slugBase = resolveAcademyProgramSlugSource({
      slug: payload.slug ?? null,
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
    });
    const slug = await this.resolveUniqueSlug(slugBase);

    const priceEgp = normalizeAcademyProgramPriceValue(payload.priceEgp);
    const priceUsd = normalizeAcademyProgramPriceValue(payload.priceUsd);

    const data: Prisma.AcademyProgramUncheckedCreateInput = {
      slug,
      titleAr: payload.titleAr.trim(),
      titleEn: payload.titleEn.trim(),
      descriptionAr: payload.descriptionAr?.trim() || null,
      descriptionEn: payload.descriptionEn?.trim() || null,
      coverImageUrl: payload.coverImageUrl?.trim() || null,
      categoryId,
      priceEgp,
      priceUsd,
      registrationOpen: payload.registrationOpen ?? true,
      maxSeats: payload.maxSeats ?? null,
      startAt,
      endAt,
      status: AcademyProgramStatus.DRAFT,
      createdByUserId: input.createdByUserId,
      publishedAt: null,
      archivedAt: null,
    };
    const created = this.prisma && this.securityAuditService
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.createProgram(data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action: 'academy.program.create',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.createdByUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgram',
            resourceId: record.id,
            metadata: { slug: record.slug, status: record.status, registrationOpen: record.registrationOpen },
          });
          return record;
        })
      : await this.academyProgramRepository.createProgram(data);

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(created),
    };
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (await this.academyProgramRepository.findProgramBySlug(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
