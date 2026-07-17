import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AcademyProgramStatus, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramRequiredFields,
  ensureAcademyProgramWindowIsValid,
} from '../utils/academy-program.util';

@Injectable()
export class PublishAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: { programId: string; actorUserId?: string; actorRoles?: string[] }) {
    const existing = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    if (existing.status === AcademyProgramStatus.ARCHIVED) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.archivedProgramCannotBePublished',
        error: 'ACADEMY_PROGRAM_ARCHIVED_CANNOT_BE_PUBLISHED',
      });
    }

    ensureAcademyProgramRequiredFields({
      titleAr: existing.titleAr,
      titleEn: existing.titleEn,
      descriptionAr: existing.descriptionAr,
      descriptionEn: existing.descriptionEn,
      priceEgp: existing.priceEgp?.toString() ?? null,
      priceUsd: existing.priceUsd?.toString() ?? null,
      startAt: existing.startAt,
      endAt: existing.endAt,
    });
    ensureAcademyProgramWindowIsValid({
      startAt: existing.startAt,
      endAt: existing.endAt,
    });

    const data = {
        status: AcademyProgramStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
        archivedAt: null,
      };
    const updated = this.prisma && this.securityAuditService && input.actorUserId
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.updateProgram(input.programId, data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action: 'academy.program.publish',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.actorUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgram',
            resourceId: record.id,
            metadata: { slug: record.slug, previousStatus: existing.status, status: record.status, publishedAt: record.publishedAt },
          });
          return record;
        })
      : await this.academyProgramRepository.updateProgram(input.programId, data);

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }
}
