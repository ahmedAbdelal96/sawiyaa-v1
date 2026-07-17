import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AcademyProgramStatus, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class ArchiveAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: { programId: string; actorUserId?: string; actorRoles?: string[]; reason?: string }) {
    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.archiveReasonRequired',
        error: 'ACADEMY_PROGRAM_ARCHIVE_REASON_REQUIRED',
      });
    }
    const existing = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const data = {
        status: AcademyProgramStatus.ARCHIVED,
        archivedAt: new Date(),
      };
    const updated = this.prisma && this.securityAuditService && input.actorUserId
      ? await this.prisma.$transaction(async (tx) => {
          const record = await this.academyProgramRepository.updateProgram(input.programId, data, tx);
          await this.securityAuditService!.recordRequired(tx, {
            action: 'academy.program.archive',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.actorUserId,
            actorRoles: input.actorRoles,
            resourceType: 'AcademyProgram',
            resourceId: record.id,
            reason,
            metadata: { slug: record.slug, previousStatus: existing.status, status: record.status, archivedAt: record.archivedAt },
          });
          return record;
        })
      : await this.academyProgramRepository.updateProgram(input.programId, data);

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }
}
