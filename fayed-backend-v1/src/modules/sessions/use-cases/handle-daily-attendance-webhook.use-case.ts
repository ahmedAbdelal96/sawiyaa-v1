import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionAttendanceParticipantRole,
  SessionProvider,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createHash } from 'crypto';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionRepository } from '../repositories/session.repository';
import { ParseDailyAttendanceWebhookService } from '../services/parse-daily-attendance-webhook.service';

type AttendanceWebhookHandledReason =
  | 'ATTENDANCE_EVENT_STORED'
  | 'ATTENDANCE_EVENT_DUPLICATE'
  | 'ATTENDANCE_EVENT_UNSUPPORTED'
  | 'ATTENDANCE_EVENT_SESSION_UNMAPPABLE';

@Injectable()
export class HandleDailyAttendanceWebhookUseCase {
  constructor(
    private readonly parseDailyAttendanceWebhookService: ParseDailyAttendanceWebhookService,
    private readonly sessionRepository: SessionRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const parsed = this.parseDailyAttendanceWebhookService.parse(input);
    const roomNameCandidate = parsed.providerRoomName;
    const roomUrlCandidate = parsed.providerRoomUrl;
    const ingestionKey = this.buildIngestionKey(parsed);

    const duplicateByKey =
      await this.sessionRepository.findAttendanceEventByIngestionKey(
        ingestionKey,
      );

    if (duplicateByKey) {
      return this.buildResponse({
        handled: true,
        reason: 'ATTENDANCE_EVENT_DUPLICATE',
        sessionId: duplicateByKey.sessionId,
      });
    }

    if (parsed.providerEventRef) {
      const duplicateByProviderRef =
        await this.sessionRepository.findAttendanceEventByProviderEventRef({
          provider: SessionProvider.DAILY,
          providerEventRef: parsed.providerEventRef,
        });

      if (duplicateByProviderRef) {
        return this.buildResponse({
          handled: true,
          reason: 'ATTENDANCE_EVENT_DUPLICATE',
          sessionId: duplicateByProviderRef.sessionId,
        });
      }
    }

    if (!parsed.attendanceEventType) {
      this.logger.info(
        {
          message: 'Ignored unsupported Daily attendance webhook event',
          providerEventType: parsed.providerEventType,
          providerEventRef: parsed.providerEventRef,
        },
        undefined,
        'Sessions',
      );

      return this.buildResponse({
        handled: false,
        reason: 'ATTENDANCE_EVENT_UNSUPPORTED',
        sessionId: null,
      });
    }

    const session = await this.sessionRepository.findByDailyRoomReference({
      roomName: roomNameCandidate,
      roomUrl: roomUrlCandidate,
    });

    if (!session) {
      this.logger.warn(
        {
          message: 'Daily attendance webhook could not be linked to a session',
          providerEventType: parsed.providerEventType,
          providerEventRef: parsed.providerEventRef,
          providerRoomName: parsed.providerRoomName,
          providerRoomUrl: parsed.providerRoomUrl,
        },
        'Sessions',
      );

      return this.buildResponse({
        handled: false,
        reason: 'ATTENDANCE_EVENT_SESSION_UNMAPPABLE',
        sessionId: null,
      });
    }

    const roleResolution = this.resolveParticipantRole({
      participantUserId: parsed.participantUserId,
      participantDisplayName: parsed.participantDisplayName,
      session,
    });

    try {
      await this.sessionRepository.createAttendanceEvent({
        sessionId: session.id,
        provider: SessionProvider.DAILY,
        attendanceEventType: parsed.attendanceEventType,
        participantRole: roleResolution.role,
        participantUserId: roleResolution.participantUserId,
        providerEventType: parsed.providerEventType,
        providerEventRef: parsed.providerEventRef,
        providerRoomRef: parsed.providerRoomName ?? parsed.providerRoomUrl,
        providerParticipantRef: parsed.providerParticipantRef,
        occurredAt: parsed.occurredAt,
        ingestionKey,
        payloadJson: parsed.payload as Prisma.InputJsonValue,
        ingestionMetaJson: {
          source: parsed.source,
          participantDisplayName: parsed.participantDisplayName,
          roleResolutionBy: roleResolution.reason,
        } as Prisma.InputJsonValue,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return this.buildResponse({
          handled: true,
          reason: 'ATTENDANCE_EVENT_DUPLICATE',
          sessionId: session.id,
        });
      }
      throw error;
    }

    return this.buildResponse({
      handled: true,
      reason: 'ATTENDANCE_EVENT_STORED',
      sessionId: session.id,
    });
  }

  private resolveParticipantRole(input: {
    participantUserId: string | null;
    participantDisplayName: string | null;
    session: Awaited<ReturnType<SessionRepository['findById']>>;
  }): {
    role: SessionAttendanceParticipantRole;
    participantUserId: string | null;
    reason: 'USER_ID_MATCH' | 'DISPLAY_NAME_MATCH' | 'UNRESOLVED';
  } {
    const session = input.session;

    if (!session) {
      return {
        role: SessionAttendanceParticipantRole.UNKNOWN,
        participantUserId: null,
        reason: 'UNRESOLVED',
      };
    }

    const patientUserId = session.patient.user.id;
    const practitionerUserId = session.practitioner.user.id;

    if (input.participantUserId) {
      if (input.participantUserId === patientUserId) {
        return {
          role: SessionAttendanceParticipantRole.PATIENT,
          participantUserId: input.participantUserId,
          reason: 'USER_ID_MATCH',
        };
      }

      if (input.participantUserId === practitionerUserId) {
        return {
          role: SessionAttendanceParticipantRole.PRACTITIONER,
          participantUserId: input.participantUserId,
          reason: 'USER_ID_MATCH',
        };
      }
    }

    const participantName = input.participantDisplayName?.trim();
    const patientName = session.patient.user.displayName?.trim();
    const practitionerName = session.practitioner.user.displayName?.trim();

    if (
      participantName &&
      patientName &&
      practitionerName &&
      patientName !== practitionerName
    ) {
      if (participantName === patientName) {
        return {
          role: SessionAttendanceParticipantRole.PATIENT,
          participantUserId: patientUserId,
          reason: 'DISPLAY_NAME_MATCH',
        };
      }

      if (participantName === practitionerName) {
        return {
          role: SessionAttendanceParticipantRole.PRACTITIONER,
          participantUserId: practitionerUserId,
          reason: 'DISPLAY_NAME_MATCH',
        };
      }
    }

    return {
      role: SessionAttendanceParticipantRole.UNKNOWN,
      participantUserId: null,
      reason: 'UNRESOLVED',
    };
  }

  private buildIngestionKey(input: {
    providerEventRef: string | null;
    providerEventType: string;
    providerRoomName: string | null;
    providerRoomUrl: string | null;
    providerParticipantRef: string | null;
    participantUserId: string | null;
    attendanceEventType: string | null;
    occurredAt: Date;
  }): string {
    const material = [
      'daily',
      input.providerEventRef ?? '',
      input.providerEventType,
      input.providerRoomName ?? '',
      input.providerRoomUrl ?? '',
      input.providerParticipantRef ?? '',
      input.participantUserId ?? '',
      input.attendanceEventType ?? '',
      input.occurredAt.toISOString(),
    ].join('|');

    return createHash('sha256').update(material).digest('hex');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }

  private buildResponse(input: {
    handled: boolean;
    reason: AttendanceWebhookHandledReason;
    sessionId: string | null;
  }) {
    return {
      received: true,
      handled: input.handled,
      reason: input.reason,
      sessionId: input.sessionId,
    };
  }
}
