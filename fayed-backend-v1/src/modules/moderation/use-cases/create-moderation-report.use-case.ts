import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateModerationReportDto } from '../dto/create-moderation-report.dto';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { ResolveModerationReporterRoleService } from '../services/resolve-moderation-reporter-role.service';
import { MODERATION_SUPPORTED_TARGET_TYPES } from '../types/moderation.types';

@Injectable()
export class CreateModerationReportUseCase {
  constructor(
    private readonly moderationRepository: ModerationRepository,
    private readonly resolveModerationReporterRoleService: ResolveModerationReporterRoleService,
    private readonly moderationPresenter: ModerationPresenter,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    currentUser: AuthenticatedUser;
    payload: CreateModerationReportDto;
  }) {
    if (!MODERATION_SUPPORTED_TARGET_TYPES.includes(input.payload.targetType)) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.unsupportedTargetType',
        error: 'MODERATION_UNSUPPORTED_TARGET_TYPE',
      });
    }

    const reporterRole = this.resolveModerationReporterRoleService.resolve(
      input.currentUser,
    );

    const accessibleTarget = await this.moderationRepository.findAccessibleTarget({
      targetType: input.payload.targetType,
      targetId: input.payload.targetId,
      userId: input.currentUser.id,
      reporterRole,
    });
    if (!accessibleTarget) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.targetNotFoundOrNotAccessible',
        error: 'MODERATION_TARGET_NOT_FOUND_OR_NOT_ACCESSIBLE',
      });
    }

    const duplicate = await this.moderationRepository.findRecentDuplicate({
      targetType: input.payload.targetType,
      targetId: input.payload.targetId,
      reason: input.payload.reason,
      reportedByUserId: input.currentUser.id,
      reportedByRole: reporterRole,
      after: new Date(Date.now() - 5 * 60_000),
    });
    if (duplicate) {
      throw new ConflictException({
        messageKey: 'moderation.errors.duplicateRecentReport',
        error: 'MODERATION_DUPLICATE_RECENT_REPORT',
      });
    }

    const created = await this.moderationRepository.createReportWithAudit({
      targetType: input.payload.targetType,
      targetId: input.payload.targetId,
      reason: input.payload.reason,
      note: input.payload.note?.trim() || null,
      reporterUserId: input.currentUser.id,
      reporterRole,
    });

    this.logger.info(
      {
        message: 'Moderation report created',
        moderationReportId: created.id,
        targetType: created.targetType,
        targetId: created.targetId,
        reporterRole,
      },
      undefined,
      'Moderation',
    );

    return {
      item: this.moderationPresenter.presentReportItem(created),
    };
  }
}

