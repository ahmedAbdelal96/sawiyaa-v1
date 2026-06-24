import {
  buildEvidenceTimeline,
  buildPlatformTimeline,
  type AttendanceInputItem,
  type PlatformInputItem,
} from './evidence-timeline.util';

const session = {
  patientUserId: 'user_patient_1',
  practitionerUserId: 'user_pract_1',
};

const noNameResolver = (_userId: string | null) => null;
const namedResolver = (userId: string | null) => {
  if (userId === 'user_patient_1') return 'Layla Hassan';
  if (userId === 'user_pract_1') return 'Dr. Karim Saleh';
  if (userId === 'user_admin_1') return 'Admin User';
  return null;
};

function attendanceItem(
  partial: Partial<AttendanceInputItem> & { id: string; occurredAt: Date },
): AttendanceInputItem {
  return {
    sessionId: 'session_1',
    attendanceEventType: 'JOINED',
    participantRole: 'PATIENT',
    participantUserId: 'user_patient_1',
    provider: 'DAILY',
    providerEventType: 'participant.joined',
    providerEventRef: 'ref',
    providerRoomRef: 'room',
    providerParticipantRef: 'participant',
    ingestedAt: partial.occurredAt,
    ...partial,
  };
}

function platformItem(
  partial: Partial<PlatformInputItem> & { id: string; createdAt: Date },
): PlatformInputItem {
  return {
    sessionId: 'session_1',
    eventType: 'JOIN_ATTEMPTED',
    actorUserId: 'user_patient_1',
    metadataJson: null,
    ...partial,
  };
}

describe('buildPlatformTimeline', () => {
  it('returns an empty array when no platform events exist', () => {
    expect(
      buildPlatformTimeline({
        platformEvents: [],
        session,
        resolveActorDisplayName: noNameResolver,
      }),
    ).toEqual([]);
  });

  it('includes JOIN_ATTEMPTED with INFO severity and actorRole PATIENT', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_1',
          eventType: 'JOIN_ATTEMPTED',
          actorUserId: 'user_patient_1',
          metadataJson: { provider: 'DAILY', occurredAt: '2026-04-08T10:00:00.000Z' },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: namedResolver,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'plat_1',
      kind: 'PLATFORM',
      eventType: 'JOIN_ATTEMPTED',
      actorRole: 'PATIENT',
      actorUserId: 'user_patient_1',
      actorDisplayName: 'Layla Hassan',
      severity: 'INFO',
      titleKey: 'JOIN_ATTEMPTED',
      source: 'PLATFORM',
    });
    expect(result[0].safeMetadataSummary).toEqual({
      provider: 'DAILY',
      occurredAt: '2026-04-08T10:00:00.000Z',
    });
  });

  it('includes JOIN_BLOCKED with the safe blockedReason from metadata', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_blocked',
          eventType: 'JOIN_BLOCKED',
          actorUserId: 'user_patient_1',
          metadataJson: {
            blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
            provider: 'DAILY',
          },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].safeMetadataSummary.blockedReason).toBe(
      'SESSION_NOT_JOINABLE_STATUS',
    );
    expect(result[0].severity).toBe('WARNING');
  });

  it('includes JOIN_TOKEN_ISSUED but redacts any token field in metadata', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_token',
          eventType: 'JOIN_TOKEN_ISSUED',
          actorUserId: 'user_patient_1',
          metadataJson: {
            provider: 'DAILY',
            token: 'daily-room-token-LEAKED',
            joinToken: 'should-not-appear',
            expiresAt: '2026-04-08T11:00:00.000Z',
          },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].safeMetadataSummary.token).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.joinToken).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.expiresAt).toBe(
      '2026-04-08T11:00:00.000Z',
    );
    // The plain token MUST NOT appear anywhere in the serialized payload.
    const serialized = JSON.stringify(result[0]);
    expect(serialized).not.toContain('daily-room-token-LEAKED');
    expect(serialized).not.toContain('should-not-appear');
  });

  it('platform event metadata tokens plural key is redacted in safeMetadataSummary', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_tokens_plural',
          eventType: 'JOIN_TOKEN_ISSUED',
          actorUserId: 'user_patient_1',
          metadataJson: {
            provider: 'DAILY',
            tokens: ['tok1_LEAKED', 'tok2_LEAKED'],
            userTokens: ['userTok_LEAKED'],
            providerTokens: ['provTok_LEAKED'],
            dailyTokens: ['dailyTok_LEAKED'],
            safeField: 'visible',
          },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].safeMetadataSummary.tokens).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.userTokens).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.providerTokens).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.dailyTokens).toBe('[REDACTED]');
    expect(result[0].safeMetadataSummary.safeField).toBe('visible');
    // No token values must leak in the serialized timeline item.
    const serialized = JSON.stringify(result[0]);
    expect(serialized).not.toContain('tok1_LEAKED');
    expect(serialized).not.toContain('tok2_LEAKED');
    expect(serialized).not.toContain('userTok_LEAKED');
    expect(serialized).not.toContain('provTok_LEAKED');
    expect(serialized).not.toContain('dailyTok_LEAKED');
  });

  it('includes MEETING_STARTED with SYSTEM actorRole and DAILY_WEBHOOK source', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_started',
          eventType: 'MEETING_STARTED',
          actorUserId: null,
          metadataJson: {
            source: 'daily-webhook',
            providerEventType: 'meeting.started',
            occurredAt: '2026-04-08T10:30:00.000Z',
          },
          createdAt: new Date('2026-04-08T10:30:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0]).toMatchObject({
      eventType: 'MEETING_STARTED',
      actorRole: 'SYSTEM',
      source: 'DAILY_WEBHOOK',
      severity: 'SUCCESS',
    });
  });

  it('includes MEETING_ENDED with SYSTEM actorRole and NEUTRAL severity', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_ended',
          eventType: 'MEETING_ENDED',
          actorUserId: null,
          metadataJson: {
            source: 'daily-webhook',
            occurredAt: '2026-04-08T11:00:00.000Z',
          },
          createdAt: new Date('2026-04-08T11:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0]).toMatchObject({
      eventType: 'MEETING_ENDED',
      actorRole: 'SYSTEM',
      severity: 'NEUTRAL',
    });
  });

  it('maps an unknown actor to UNKNOWN', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_unknown',
          eventType: 'JOIN_ATTEMPTED',
          actorUserId: 'user_stranger',
          metadataJson: null,
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].actorRole).toBe('UNKNOWN');
  });

  it('sorts the platform timeline by occurredAt ascending', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_3',
          eventType: 'JOIN_BLOCKED',
          createdAt: new Date('2026-04-08T10:05:00.000Z'),
          metadataJson: { occurredAt: '2026-04-08T10:05:00.000Z' },
        }),
        platformItem({
          id: 'plat_1',
          eventType: 'JOIN_ATTEMPTED',
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
          metadataJson: { occurredAt: '2026-04-08T10:00:00.000Z' },
        }),
        platformItem({
          id: 'plat_2',
          eventType: 'JOIN_ALLOWED',
          createdAt: new Date('2026-04-08T10:02:00.000Z'),
          metadataJson: { occurredAt: '2026-04-08T10:02:00.000Z' },
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result.map((e) => e.id)).toEqual(['plat_1', 'plat_2', 'plat_3']);
  });
});

describe('buildEvidenceTimeline', () => {
  it('combines attendance and platform events sorted by occurredAt', () => {
    const attendance: AttendanceInputItem[] = [
      attendanceItem({
        id: 'att_join_patient',
        attendanceEventType: 'JOINED',
        participantRole: 'PATIENT',
        occurredAt: new Date('2026-04-08T10:00:00.000Z'),
      }),
      attendanceItem({
        id: 'att_leave_patient',
        attendanceEventType: 'LEFT',
        participantRole: 'PATIENT',
        occurredAt: new Date('2026-04-08T10:30:00.000Z'),
      }),
    ];
    const platform: PlatformInputItem[] = [
      platformItem({
        id: 'plat_started',
        eventType: 'MEETING_STARTED',
        actorUserId: null,
        metadataJson: {
          source: 'daily-webhook',
          occurredAt: '2026-04-08T10:05:00.000Z',
        },
        createdAt: new Date('2026-04-08T10:05:00.000Z'),
      }),
    ];

    const result = buildEvidenceTimeline({
      attendanceEvents: attendance,
      platformEvents: platform,
      session,
      resolveActorDisplayName: namedResolver,
    });

    expect(result.map((e) => `${e.kind}:${e.eventType}`)).toEqual([
      'ATTENDANCE:JOINED',
      'PLATFORM:MEETING_STARTED',
      'ATTENDANCE:LEFT',
    ]);
  });

  it('falls back to recordedAt when occurredAt is missing on platform events', () => {
    const platform: PlatformInputItem[] = [
      platformItem({
        id: 'plat_1',
        eventType: 'JOIN_TOKEN_ISSUED',
        actorUserId: 'user_patient_1',
        metadataJson: null,
        createdAt: new Date('2026-04-08T09:00:00.000Z'),
      }),
    ];
    const result = buildEvidenceTimeline({
      attendanceEvents: [],
      platformEvents: platform,
      session,
      resolveActorDisplayName: noNameResolver,
    });
    expect(result[0].occurredAt).toBe('2026-04-08T09:00:00.000Z');
    expect(result[0].recordedAt).toBe('2026-04-08T09:00:00.000Z');
  });

  it('uses stable secondary order when occurredAt is equal across kinds', () => {
    const sameTime = new Date('2026-04-08T10:00:00.000Z');
    const platform: PlatformInputItem[] = [
      platformItem({
        id: 'plat_meeting_started',
        eventType: 'MEETING_STARTED',
        actorUserId: null,
        metadataJson: { source: 'daily-webhook', occurredAt: sameTime.toISOString() },
        createdAt: sameTime,
      }),
    ];
    const attendance: AttendanceInputItem[] = [
      attendanceItem({
        id: 'att_join_patient',
        attendanceEventType: 'JOINED',
        participantRole: 'PATIENT',
        occurredAt: sameTime,
      }),
    ];

    const result = buildEvidenceTimeline({
      attendanceEvents: attendance,
      platformEvents: platform,
      session,
      resolveActorDisplayName: noNameResolver,
    });
    // Spec order: MEETING_STARTED (40) before JOINED (50).
    expect(result.map((e) => e.eventType)).toEqual([
      'MEETING_STARTED',
      'JOINED',
    ]);
  });

  // ---- Phase 3 Final Guard: unknown event type handling ----

  it('maps an unknown platform event type to titleKey UNKNOWN_PLATFORM_EVENT', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_unknown',
          eventType: 'SOME_FUTURE_EVENT_TYPE',
          actorUserId: 'user_patient_1',
          metadataJson: { provider: 'DAILY' },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].titleKey).toBe('UNKNOWN_PLATFORM_EVENT');
    // eventType stays technical for debugging purposes.
    expect(result[0].eventType).toBe('SOME_FUTURE_EVENT_TYPE');
  });

  it('unknown platform event does not throw and keeps safeMetadataSummary', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_unknown2',
          eventType: 'RUNTIME_PREPARE_ATTEMPTED',
          actorUserId: null,
          metadataJson: {
            provider: 'DAILY',
            occurredAt: '2026-04-08T10:00:00.000Z',
            errorCode: 'ROOM_NOT_READY',
          },
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].titleKey).toBe('UNKNOWN_PLATFORM_EVENT');
    expect(result[0].safeMetadataSummary.provider).toBe('DAILY');
    expect(result[0].safeMetadataSummary.errorCode).toBe('ROOM_NOT_READY');
  });

  it('known event types still map to their correct localized titleKeys', () => {
    const knownEvents: PlatformInputItem[] = [
      platformItem({ id: '1', eventType: 'JOIN_ATTEMPTED', createdAt: new Date('2026-04-08T10:00:00.000Z') }),
      platformItem({ id: '2', eventType: 'JOIN_ALLOWED', createdAt: new Date('2026-04-08T10:01:00.000Z') }),
      platformItem({ id: '3', eventType: 'JOIN_BLOCKED', createdAt: new Date('2026-04-08T10:02:00.000Z') }),
      platformItem({ id: '4', eventType: 'JOIN_TOKEN_ISSUED', createdAt: new Date('2026-04-08T10:03:00.000Z') }),
      platformItem({ id: '5', eventType: 'MEETING_STARTED', createdAt: new Date('2026-04-08T10:04:00.000Z') }),
      platformItem({ id: '6', eventType: 'MEETING_ENDED', createdAt: new Date('2026-04-08T10:05:00.000Z') }),
      platformItem({ id: '7', eventType: 'SESSION_CREATED', createdAt: new Date('2026-04-08T10:06:00.000Z') }),
      platformItem({ id: '8', eventType: 'PAYMENT_CONFIRMED', createdAt: new Date('2026-04-08T10:07:00.000Z') }),
      platformItem({ id: '9', eventType: 'PROVIDER_ROOM_CREATED', createdAt: new Date('2026-04-08T10:08:00.000Z') }),
    ];

    const result = buildPlatformTimeline({
      platformEvents: knownEvents,
      session,
      resolveActorDisplayName: noNameResolver,
    });

    const titleKeys = result.map((r) => r.titleKey);
    expect(titleKeys).toContain('JOIN_ATTEMPTED');
    expect(titleKeys).toContain('JOIN_ALLOWED');
    expect(titleKeys).toContain('JOIN_BLOCKED');
    expect(titleKeys).toContain('JOIN_TOKEN_ISSUED');
    expect(titleKeys).toContain('MEETING_STARTED');
    expect(titleKeys).toContain('MEETING_ENDED');
    expect(titleKeys).toContain('SESSION_CREATED');
    expect(titleKeys).toContain('PAYMENT_CONFIRMED');
    expect(titleKeys).toContain('PROVIDER_ROOM_CREATED');
    // No unknown events should have leaked a raw enum value.
    expect(titleKeys).not.toContain('RUNTIME_PREPARE_ATTEMPTED');
    expect(titleKeys).not.toContain('SOME_FUTURE_EVENT_TYPE');
  });

  it('unknown platform event actorRole is UNKNOWN when actorUserId is not patient/practitioner', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_unknown3',
          eventType: 'UNKNOWN_EVENT_XYZ',
          actorUserId: 'user_unknown_stranger',
          metadataJson: null,
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].actorRole).toBe('UNKNOWN');
    expect(result[0].titleKey).toBe('UNKNOWN_PLATFORM_EVENT');
  });

  it('unknown platform event with null actorUserId maps to UNKNOWN actorRole', () => {
    const result = buildPlatformTimeline({
      platformEvents: [
        platformItem({
          id: 'plat_unknown4',
          eventType: 'SOME_NEW_EVENT',
          actorUserId: null,
          metadataJson: null,
          createdAt: new Date('2026-04-08T10:00:00.000Z'),
        }),
      ],
      session,
      resolveActorDisplayName: noNameResolver,
    });

    expect(result[0].actorRole).toBe('UNKNOWN');
    expect(result[0].titleKey).toBe('UNKNOWN_PLATFORM_EVENT');
  });
});
