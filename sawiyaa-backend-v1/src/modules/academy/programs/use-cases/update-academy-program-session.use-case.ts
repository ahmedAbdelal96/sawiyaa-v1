import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { UpdateAcademyProgramSessionDto } from '../dto/update-academy-program-session.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  parseAcademyProgramDate,
} from '../utils/academy-program.util';

@Injectable()
export class UpdateAcademyProgramSessionUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    programId: string;
    sessionId: string;
    payload: UpdateAcademyProgramSessionDto;
    actorUserId?: string;
    actorRoles?: string[];
  }) {
    const existing = await this.academyProgramRepository.findSessionByProgramAndId(
      input.programId,
      input.sessionId,
    );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.sessionNotFound',
        error: 'ACADEMY_PROGRAM_SESSION_NOT_FOUND',
      });
    }

    const startsAt =
      input.payload.startsAt !== undefined
        ? (parseAcademyProgramDate(input.payload.startsAt) as Date)
        : existing.startsAt;
    const endsAt =
      input.payload.endsAt !== undefined
        ? (parseAcademyProgramDate(input.payload.endsAt) as Date)
        : existing.endsAt;
    ensureAcademyProgramWindowIsValid({ startAt: startsAt, endAt: endsAt });

    const isPublished =
      input.payload.isPublished !== undefined
        ? input.payload.isPublished
        : existing.isPublished;

    const data = {
        titleAr:
          input.payload.titleAr !== undefined
            ? input.payload.titleAr.trim()
            : undefined,
        titleEn:
          input.payload.titleEn !== undefined
            ? input.payload.titleEn.trim()
            : undefined,
        descriptionAr:
          input.payload.descriptionAr !== undefined
            ? input.payload.descriptionAr.trim() || null
            : undefined,
        descriptionEn:
          input.payload.descriptionEn !== undefined
            ? input.payload.descriptionEn.trim() || null
            : undefined,
        startsAt,
        endsAt,
        deliveryMethod: input.payload.deliveryMethod,
        internalDeliveryNote:
          input.payload.internalDeliveryNote !== undefined
            ? input.payload.internalDeliveryNote.trim() || null
            : undefined,
        internalDeliveryLink:
          input.payload.internalDeliveryLink !== undefined
            ? input.payload.internalDeliveryLink.trim() || null
            : undefined,
        sortOrder:
          input.payload.sortOrder !== undefined
            ? input.payload.sortOrder
            : undefined,
        isPublished,
        publishedAt: isPublished ? existing.publishedAt ?? new Date() : null,
      };
    const updated = this.prisma && this.securityAuditService && input.actorUserId
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.updateSession(input.sessionId, data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action:
              !existing.isPublished && record.isPublished
                ? 'academy.program.session.publish'
                : 'academy.program.session.update',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.actorUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgramSession',
            resourceId: record.id,
            metadata: {
              academyProgramId: input.programId,
              previousIsPublished: existing.isPublished,
              isPublished: record.isPublished,
            },
          });
          return record;
        })
      : await this.academyProgramRepository.updateSession(input.sessionId, data);

    return {
      item: this.academyProgramPresenter.presentAdminSessionItem(updated),
    };
  }
}
