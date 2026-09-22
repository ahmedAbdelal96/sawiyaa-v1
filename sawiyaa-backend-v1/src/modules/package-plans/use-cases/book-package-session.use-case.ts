import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PatientPackagePurchaseStatus,
  Prisma,
  SessionEventType,
  SessionFlowType,
  SessionPaymentCoverageType,
  SessionStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { SessionMapper } from '@modules/sessions/mappers/session.mapper';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { ValidateSessionBookingRequestService } from '@modules/sessions/services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '@modules/sessions/services/validate-session-schedule-compatibility.service';
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { PackageEntitlementService } from '../services/package-entitlement.service';

@Injectable()
export class BookPackageSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionLifecycleService: SessionLifecycleService,
    private readonly validateSessionBookingRequestService: ValidateSessionBookingRequestService,
    private readonly validateSessionDurationService: ValidateSessionDurationService,
    private readonly validateSessionScheduleCompatibilityService: ValidateSessionScheduleCompatibilityService,
    private readonly validateSessionConflictsService: ValidateSessionConflictsService,
    private readonly sessionSchedulePolicyService: SessionSchedulePolicyService,
    private readonly packageEntitlementService: PackageEntitlementService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    purchaseId: string;
    scheduledStartAt: string;
  }) {
    this.validateSessionBookingRequestService.assertScheduledStartHasExplicitTimezone(
      input.scheduledStartAt,
    );

    const patient = await this.patientProfileRepository.findByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'patients.errors.notFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const scheduledStartAt = new Date(input.scheduledStartAt);
    this.validateSessionBookingRequestService.assertUtcDateIsValid(
      scheduledStartAt,
      'sessions.errors.invalidScheduledStartAt',
      'SESSION_INVALID_SCHEDULED_START_AT',
    );
    this.validateSessionBookingRequestService.assertScheduledStartIsFuture(
      scheduledStartAt,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // All entitlement mutations for a purchase serialize on this lock. The
      // database unique index on (purchase, packageSessionIndex) is a second
      // safety net, but the lock makes the available-count decision explicit.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`package-purchase:${input.purchaseId}`})::bigint)
      `;

      const purchase = await this.packagePurchaseRepository.findByIdForPatient({
        purchaseId: input.purchaseId,
        patientId: patient.id,
        tx,
      });
      if (!purchase) {
        throw new NotFoundException({
          messageKey: 'packagePurchases.errors.notFound',
          error: 'PACKAGE_PURCHASE_NOT_FOUND',
        });
      }
      if (purchase.status !== PatientPackagePurchaseStatus.ACTIVE) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.notActive',
          error: 'PACKAGE_PURCHASE_NOT_ACTIVE',
        });
      }
      if (purchase.payment?.status !== 'CAPTURED') {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.paymentNotCaptured',
          error: 'PACKAGE_PURCHASE_PAYMENT_NOT_CAPTURED',
        });
      }
      const entitlement = this.packageEntitlementService.summarize(
        purchase.sessionCountSnapshot,
        purchase.sessions,
      );
      if (entitlement.availableSessions <= 0) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.noAvailableSessions',
          error: 'PACKAGE_PURCHASE_NO_AVAILABLE_SESSIONS',
        });
      }

      this.validateSessionDurationService.validate(
        purchase.sessionDurationMinutesSnapshot as 30 | 60,
      );
      const scheduledEndAt = new Date(
        scheduledStartAt.getTime() +
          purchase.sessionDurationMinutesSnapshot * 60_000,
      );
      const availability =
        await this.validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability(
          {
            practitionerId: purchase.practitionerId,
            practitionerTimezone: purchase.practitioner.user.timezone,
            requestedStartAtUtc: scheduledStartAt,
            requestedEndAtUtc: scheduledEndAt,
            requestedDurationMinutes:
              purchase.sessionDurationMinutesSnapshot as 30 | 60,
          },
        );
      await this.validateSessionConflictsService.assertNoPractitionerConflict({
        practitionerId: purchase.practitionerId,
        scheduledStartAtUtc: scheduledStartAt,
        scheduledEndAtUtc: scheduledEndAt,
        tx,
      });
      await this.validateSessionConflictsService.assertNoPatientConflict({
        patientId: purchase.patientId,
        scheduledStartAtUtc: scheduledStartAt,
        scheduledEndAtUtc: scheduledEndAt,
        tx,
      });

      const usedIndices = new Set(
        purchase.sessions
          .map((session) => session.packageSessionIndex)
          .filter((index): index is number => Number.isInteger(index)),
      );
      let packageSessionIndex = 1;
      while (usedIndices.has(packageSessionIndex)) packageSessionIndex += 1;
      if (packageSessionIndex > purchase.sessionCountSnapshot) {
        packageSessionIndex =
          Math.max(...Array.from(usedIndices), purchase.sessionCountSnapshot) +
          1;
      }

      const created = await this.sessionRepository.createSession(
        {
          patientId: purchase.patientId,
          practitionerId: purchase.practitionerId,
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: purchase.sessionModeSnapshot,
          durationMinutes: purchase.sessionDurationMinutesSnapshot,
          status: SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
          requestedStartAt: scheduledStartAt,
          scheduledStartAt,
          scheduledEndAt,
          timezoneSnapshot: availability.timezone,
          packagePurchaseId: purchase.id,
          packageSessionIndex,
          packageSessionCount: purchase.sessionCountSnapshot,
          paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
        },
        tx,
        'package_booking',
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: created.id,
          eventType: SessionEventType.SESSION_CREATED,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.userId,
          source: SecurityAuditSource.HTTP_REQUEST,
          metadataJson: {
            source: 'package-session-booking',
            packagePurchaseId: purchase.id,
            packageSessionIndex,
            locale: input.locale,
          },
        },
        tx,
      );

      const schedulePolicy =
        this.sessionSchedulePolicyService.withScheduleRevision(
          await this.sessionSchedulePolicyService.resolve(),
          created.scheduleRevision,
        );
      const confirmed = await this.sessionLifecycleService.transition({
        session: created,
        to: SessionStatus.UPCOMING,
        data: {
          joinOpenAt: new Date(
            scheduledStartAt.getTime() -
              schedulePolicy.join.joinEarlyMinutes * 60_000,
          ),
          joinCloseAt: new Date(
            scheduledEndAt.getTime() +
              schedulePolicy.join.joinAfterEndGraceMinutes * 60_000,
          ),
          schedulePolicySnapshotJson:
            schedulePolicy as unknown as Prisma.InputJsonValue,
        },
        metadata: {
          source: 'package-session-booking',
          packagePurchaseId: purchase.id,
          packageSessionIndex,
          paymentId: purchase.payment?.id ?? null,
        },
        tx,
      });

      await this.sessionRepository.createEvent(
        {
          sessionId: created.id,
          eventType: SessionEventType.PAYMENT_CONFIRMED,
          source: SecurityAuditSource.HTTP_REQUEST,
          metadataJson: {
            source: 'package-session-booking',
            packagePurchaseId: purchase.id,
            paymentId: purchase.payment?.id ?? null,
            packageSessionIndex,
          },
        },
        tx,
      );

      return { purchase, session: confirmed };
    });

    await this.operationalNotificationService.notifySessionConfirmed({
      patientProfileId: result.purchase.patientId,
      practitionerProfileId: result.purchase.practitionerId,
      sessionId: result.session.id,
      scheduledStartAt: result.session.scheduledStartAt,
      scheduledEndAt: result.session.scheduledEndAt,
      scheduleRevision: result.session.scheduleRevision,
      packageContext: {
        packagePurchaseId: result.purchase.id,
        packagePlanCode: result.purchase.packagePlan?.code ?? '',
        packagePlanTitle: result.purchase.packagePlan?.title ?? null,
        packageSessionIndex: result.session.packageSessionIndex ?? 1,
        packageSessionCount: result.purchase.sessionCountSnapshot,
        packageDiscountPercent:
          result.purchase.packagePlan?.discountPercent == null
            ? null
            : Number(result.purchase.packagePlan.discountPercent),
      },
      schedulePolicySnapshot: result.session.schedulePolicySnapshotJson,
    });

    return { item: this.sessionMapper.toDetails(result.session) };
  }
}
