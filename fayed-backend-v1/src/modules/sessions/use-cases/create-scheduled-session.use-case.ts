import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionBookingRequestService } from '../services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '../services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '../services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '../services/validate-session-schedule-compatibility.service';

/**
 * Scheduled session creation is the Phase 2 booking baseline.
 * It validates public practitioner visibility, availability compatibility, and collision rules without faking payment confirmation.
 */
@Injectable()
export class CreateScheduledSessionUseCase {
  private readonly paymentReservationMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly validateSessionDurationService: ValidateSessionDurationService,
    private readonly validateSessionBookingRequestService: ValidateSessionBookingRequestService,
    private readonly validateSessionScheduleCompatibilityService: ValidateSessionScheduleCompatibilityService,
    private readonly validateSessionConflictsService: ValidateSessionConflictsService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {
    this.paymentReservationMinutes = this.configService.get<number>(
      'session.paymentReservationMinutes',
      15,
    );
  }

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    practitionerSlug: string;
    scheduledStartAt: string;
    durationMinutes: 30 | 60;
    sessionMode: SessionMode;
  }) {
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const practitioner =
      await this.sessionPractitionerRepository.findByPublicSlug(
        input.practitionerSlug,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotBookable',
        error: 'SESSION_PRACTITIONER_NOT_BOOKABLE',
      });
    }

    this.validateSessionDurationService.validate(input.durationMinutes);

    const scheduledStartAtUtc = new Date(input.scheduledStartAt);
    this.validateSessionBookingRequestService.assertUtcDateIsValid(
      scheduledStartAtUtc,
      'sessions.errors.invalidScheduledStartAt',
      'SESSION_INVALID_SCHEDULED_START_AT',
    );
    this.validateSessionBookingRequestService.assertScheduledStartIsFuture(
      scheduledStartAtUtc,
    );

    const scheduledEndAtUtc = new Date(
      scheduledStartAtUtc.getTime() + input.durationMinutes * 60 * 1000,
    );

    const availabilityResult =
      await this.validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability(
        {
          practitionerId: practitioner.id,
          practitionerTimezone: practitioner.user.timezone,
          requestedStartAtUtc: scheduledStartAtUtc,
          requestedEndAtUtc: scheduledEndAtUtc,
          requestedDurationMinutes: input.durationMinutes,
        },
      );

    await Promise.all([
      this.validateSessionConflictsService.assertNoPractitionerConflict({
        practitionerId: practitioner.id,
        scheduledStartAtUtc,
        scheduledEndAtUtc,
      }),
      this.validateSessionConflictsService.assertNoPatientConflict({
        patientId: patient.id,
        scheduledStartAtUtc,
        scheduledEndAtUtc,
      }),
    ]);

    const expiresAt = new Date(
      Date.now() + this.paymentReservationMinutes * 60 * 1000,
    );

    const session = await this.prisma.$transaction(async (tx) => {
      const sessionCode = await this.sessionRepository.reserveNextSessionCode(
        scheduledStartAtUtc,
        tx,
      );

      const createdSession = await this.sessionRepository.createSession(
        {
          sessionCode,
          patientId: patient.id,
          practitionerId: practitioner.id,
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: input.sessionMode,
          durationMinutes: input.durationMinutes,
          status: SessionStatus.PENDING_PAYMENT,
          requestedStartAt: scheduledStartAtUtc,
          scheduledStartAt: scheduledStartAtUtc,
          scheduledEndAt: scheduledEndAtUtc,
          expiresAt,
          timezoneSnapshot: availabilityResult.timezone,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: createdSession.id,
          eventType: SessionEventType.SESSION_CREATED,
          actorUserId: input.userId,
          metadataJson: {
            source: 'patientScheduledBooking',
            locale: input.locale,
          },
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: createdSession.id,
          eventType: SessionEventType.PAYMENT_PENDING,
          actorUserId: input.userId,
          metadataJson: {
            expiresAt: expiresAt.toISOString(),
          },
        },
        tx,
      );

      return createdSession;
    });

    return {
      item: this.sessionMapper.toDetails(session),
    };
  }
}
