import {
  SessionProvider,
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
} from '@prisma/client';
import { NormalizeSessionAttendanceReconciliationService } from './normalize-session-attendance-reconciliation.service';

describe('NormalizeSessionAttendanceReconciliationService', () => {
  it('deduplicates reason codes and clamps unsafe counters without raw payloads', () => {
    const result =
      new NormalizeSessionAttendanceReconciliationService().normalize({
        status: SessionReconciliationStatus.CONFIRMED,
        provider: SessionProvider.DAILY,
        roomFound: true,
        meetingStarted: true,
        meetingEnded: true,
        patient: {
          identityConfirmed: true,
          joined: true,
          totalPresenceSeconds: -5,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        practitioner: {
          identityConfirmed: true,
          joined: false,
          totalPresenceSeconds: 20,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        unknownParticipantCount: -1,
        providerMeetingId: 'meeting-1',
        reconciledAt: new Date('2026-08-03T12:00:00.000Z'),
        providerDataObservedUntil: null,
        confidence: SessionReconciliationConfidence.HIGH,
        reasonCodes: ['EVIDENCE_INCOMPLETE', 'EVIDENCE_INCOMPLETE'],
        attemptNumber: 0,
        requestStatus: 'SUCCEEDED',
        failureCategory: null,
        eligibleForAutomaticFinalization: true,
      });

    expect(result.patient.totalPresenceSeconds).toBe(0);
    expect(result.unknownParticipantCount).toBe(0);
    expect(result.attemptNumber).toBe(1);
    expect(result.reasonCodes).toEqual(['EVIDENCE_INCOMPLETE']);
  });
});
