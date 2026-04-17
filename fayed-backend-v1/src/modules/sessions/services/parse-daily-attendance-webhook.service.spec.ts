import { Test } from '@nestjs/testing';
import videoConfig from '@config/video.config';
import { ParseDailyAttendanceWebhookService } from './parse-daily-attendance-webhook.service';

describe('ParseDailyAttendanceWebhookService', () => {
  async function buildService(config?: { webhookSecret?: string }) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ParseDailyAttendanceWebhookService,
        {
          provide: videoConfig.KEY,
          useValue: {
            daily: {
              apiKey: 'daily_key',
              webhookSecret: config?.webhookSecret,
            },
          },
        },
      ],
    }).compile();

    return moduleRef.get(ParseDailyAttendanceWebhookService);
  }

  it('maps participant.joined into JOINED attendance event', async () => {
    const service = await buildService();
    const rawBody = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        event: 'participant.joined',
        timestamp: '2026-04-07T10:00:00.000Z',
        room: {
          name: 'fayed-session-session_1',
          url: 'https://fayed-session-session_1.daily.co',
        },
        participant: {
          id: 'participant_1',
          user_id: 'user_patient_1',
          user_name: 'Patient One',
        },
      }),
    );

    const parsed = service.parse({ rawBody, headers: {} });

    expect(parsed.providerEventRef).toBe('evt_1');
    expect(parsed.attendanceEventType).toBe('JOINED');
    expect(parsed.providerRoomName).toBe('fayed-session-session_1');
    expect(parsed.providerParticipantRef).toBe('participant_1');
    expect(parsed.participantUserId).toBe('user_patient_1');
    expect(parsed.source).toBe('UNSIGNED');
  });

  it('maps participant-left format into LEFT attendance event', async () => {
    const service = await buildService();
    const rawBody = Buffer.from(
      JSON.stringify({
        event_type: 'participant-left',
        room_url: 'https://fayed-session-session_2.daily.co',
      }),
    );

    const parsed = service.parse({ rawBody, headers: {} });

    expect(parsed.attendanceEventType).toBe('LEFT');
    expect(parsed.providerRoomName).toBe('fayed-session-session_2');
  });

  it('throws on invalid signature when secret is configured', async () => {
    const service = await buildService({ webhookSecret: 'daily_whsec' });

    expect(() =>
      service.parse({
        rawBody: Buffer.from(JSON.stringify({ event: 'participant.joined' })),
        headers: {
          'x-daily-signature': 'invalid_signature',
        },
      }),
    ).toThrow();
  });
});
