import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { CreateAcademyProgramSessionDto } from '../dto/create-academy-program-session.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  parseAcademyProgramDate,
} from '../utils/academy-program.util';

@Injectable()
export class CreateAcademyProgramSessionUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    programId: string;
    createdByUserId: string;
    actorRoles?: string[];
    payload: CreateAcademyProgramSessionDto;
  }) {
    const program = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const startsAt = parseAcademyProgramDate(input.payload.startsAt) as Date;
    const endsAt = parseAcademyProgramDate(input.payload.endsAt) as Date;
    ensureAcademyProgramWindowIsValid({ startAt: startsAt, endAt: endsAt });

    const data = {
      academyProgramId: input.programId,
      titleAr: input.payload.titleAr.trim(),
      titleEn: input.payload.titleEn.trim(),
      descriptionAr: input.payload.descriptionAr?.trim() || null,
      descriptionEn: input.payload.descriptionEn?.trim() || null,
      startsAt,
      endsAt,
      deliveryMethod: input.payload.deliveryMethod,
      internalDeliveryNote: input.payload.internalDeliveryNote?.trim() || null,
      internalDeliveryLink: input.payload.internalDeliveryLink?.trim() || null,
      sortOrder: input.payload.sortOrder ?? 0,
      isPublished: input.payload.isPublished ?? false,
      publishedAt: input.payload.isPublished ? new Date() : null,
      createdByUserId: input.createdByUserId,
    };
    const created = this.prisma && this.securityAuditService
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.createSession(data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action: 'academy.program.session.create',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.createdByUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgramSession',
            resourceId: record.id,
            metadata: { academyProgramId: input.programId, isPublished: record.isPublished },
          });
          return record;
        })
      : await this.academyProgramRepository.createSession(data);

    return {
      item: this.academyProgramPresenter.presentAdminSessionItem(created),
    };
  }
}
