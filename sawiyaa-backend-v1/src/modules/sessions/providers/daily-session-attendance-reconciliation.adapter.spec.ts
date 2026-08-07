import { ConfigService } from '@nestjs/config';
import {
  SessionReconciliationConfidence,
  SessionReconciliationStatus,
} from '@prisma/client';
import { DailySessionAttendanceReconciliationAdapter } from './daily-session-attendance-reconciliation.adapter';

describe('DailySessionAttendanceReconciliationAdapter', () => {
  const input = {
    sessionId: 'session-1',
    providerRoomName: 'sawiyaa-phase3b2-room',
    scheduledStartAt: new Date('2026-08-04T10:00:00.000Z'),
    scheduledEndAt: new Date('2026-08-04T11:00:00.000Z'),
    patientId: 'patient-1',
    practitionerId: 'practitioner-1',
  };

  function build() {
    return new DailySessionAttendanceReconciliationAdapter(
      {
        daily: {
          apiKey: 'daily-key',
          apiBaseUrl: 'https://api.daily.co/v1',
        },
      } as never,
      { get: jest.fn().mockReturnValue(5000) } as unknown as ConfigService,
    );
  }

  function response(body: unknown, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  afterEach(() => jest.restoreAllMocks());

  it('normalizes completed meetings and merges duplicate device intervals', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ name: input.providerRoomName }))
      .mockResolvedValueOnce(
        response({
          total_count: 1,
          data: [
            {
              id: 'meeting-1',
              start_time: 1_783_000_000,
              duration: 60,
              ongoing: false,
              participants: [
                {
                  user_id: input.patientId,
                  participant_id: 'patient-device-1',
                  user_name: 'display-name-is-not-authority',
                  join_time: 1_783_000_000,
                  duration: 60,
                },
                {
                  user_id: input.patientId,
                  participant_id: 'patient-device-2',
                  user_name: 'display-name-is-not-authority',
                  join_time: 1_783_000_000,
                  duration: 60,
                },
                {
                  user_id: input.practitionerId,
                  participant_id: 'practitioner-device',
                  user_name: 'Practitioner',
                  join_time: 1_783_000_000,
                  duration: 60,
                },
              ],
            },
          ],
        }),
      );

    const result = await build().reconcileSession(input);

    expect(result.status).toBe(SessionReconciliationStatus.CONFIRMED);
    expect(result.confidence).toBe(SessionReconciliationConfidence.HIGH);
    expect(result.patient.totalPresenceSeconds).toBe(60);
    expect(result.practitioner.totalPresenceSeconds).toBe(60);
    expect(result.unknownParticipantCount).toBe(0);
    expect(result.eligibleForAutomaticFinalization).toBe(true);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.daily.co/v1/meetings?room=sawiyaa-phase3b2-room&limit=100',
      expect.any(Object),
    );
  });

  it('keeps one-party and unknown identity evidence explicit', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ name: input.providerRoomName }))
      .mockResolvedValueOnce(
        response({
          total_count: 1,
          data: [
            {
              id: 'meeting-2',
              start_time: 1_783_000_000,
              duration: 30,
              ongoing: false,
              participants: [
                {
                  user_id: input.practitionerId,
                  participant_id: 'practitioner-device',
                  join_time: 1_783_000_000,
                  duration: 30,
                },
                {
                  user_id: 'unknown-1',
                  participant_id: 'unknown-device',
                  join_time: 1_783_000_000,
                  duration: 30,
                },
              ],
            },
          ],
        }),
      );

    const result = await build().reconcileSession(input);

    expect(result.practitioner.joined).toBe(true);
    expect(result.patient.joined).toBe(false);
    expect(result.unknownParticipantCount).toBe(1);
    expect(result.eligibleForAutomaticFinalization).toBe(false);
  });

  it('does not treat an empty meeting history as proof of both absence', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ name: input.providerRoomName }))
      .mockResolvedValueOnce(response({ total_count: 0, data: [] }));

    const result = await build().reconcileSession(input);

    expect(result.status).toBe(SessionReconciliationStatus.PARTIAL);
    expect(result.reasonCodes).toEqual(['MEETING_NOT_FOUND']);
    expect(result.meetingStarted).toBe(false);
    expect(result.meetingEnded).toBe(false);
    expect(result.eligibleForAutomaticFinalization).toBe(false);
  });

  it('distinguishes a missing room from an empty room history', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(response({}, 404));

    const result = await build().reconcileSession(input);

    expect(result.status).toBe(SessionReconciliationStatus.NOT_FOUND);
    expect(result.reasonCodes).toEqual(['ROOM_NOT_FOUND']);
    expect(result.roomFound).toBe(false);
  });
});
