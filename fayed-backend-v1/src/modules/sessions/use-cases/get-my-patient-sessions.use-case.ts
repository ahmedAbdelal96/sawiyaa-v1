import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListSessionsDto } from '../dto/list-sessions.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';

/**
 * Patient session listing is intentionally ownership-scoped.
 * This module exposes scheduled consultation records, not broader patient dashboard concerns.
 */
@Injectable()
export class GetMyPatientSessionsUseCase {
  constructor(
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListSessionsDto;
  }) {
    const patient = await this.sessionPatientRepository.findByUserId(input.userId);

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [sessions, totalItems] = await this.sessionRepository.listPatientSessions({
      patientId: patient.id,
      status: input.query.status as SessionStatus | undefined,
      skip,
      take: limit,
    });

    return {
      items: sessions.map((session) => this.sessionMapper.toListItem(session)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
