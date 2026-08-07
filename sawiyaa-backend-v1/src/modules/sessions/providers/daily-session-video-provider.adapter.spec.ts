import { SessionProvider } from '@prisma/client';
import { DailySessionVideoProviderAdapter } from './daily-session-video-provider.adapter';

describe('DailySessionVideoProviderAdapter', () => {
  const config = {
    defaultProvider: 'DAILY' as const,
    daily: {
      apiKey: 'test-key',
      apiBaseUrl: 'https://api.daily.co/v1/',
      webhookSecret: undefined,
    },
  };

  const input = {
    sessionId: 'session-1',
    startsAt: new Date('2026-08-07T02:00:00.000Z'),
    endsAt: new Date('2026-08-07T03:00:00.000Z'),
  };

  afterEach(() => jest.restoreAllMocks());

  it('creates one deterministic private room with an expiry after the scheduled end', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'fayed-session-session-1', url: 'https://room.daily.co/fayed-session-session-1' }), { status: 200 }),
    );
    const adapter = new DailySessionVideoProviderAdapter(config);

    const room = await adapter.createRoom(input);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));

    expect(room).toMatchObject({
      roomId: 'fayed-session-session-1',
      roomUrl: 'https://room.daily.co/fayed-session-session-1',
    });
    expect(body).toMatchObject({ name: 'fayed-session-session-1', privacy: 'private' });
    expect(body.properties.exp).toBeGreaterThan(Math.floor(input.endsAt.getTime() / 1000));
  });

  it('reuses the provider room returned after a duplicate-name conflict', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'already-exists' }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'fayed-session-session-1', url: 'https://room.daily.co/fayed-session-session-1' }), { status: 200 }));
    const adapter = new DailySessionVideoProviderAdapter(config);

    await expect(adapter.createRoom(input)).resolves.toMatchObject({
      roomId: 'fayed-session-session-1',
      roomUrl: 'https://room.daily.co/fayed-session-session-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps provider HTTP failures to a safe typed error without exposing the response body', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid-api-key', info: 'secret-provider-detail' }), { status: 401, statusText: 'Unauthorized' }),
    );
    const adapter = new DailySessionVideoProviderAdapter(config);

    await expect(adapter.createRoom(input)).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'SESSION_VIDEO_PROVIDER_ROOM_CREATION_FAILED' }),
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/rooms'), expect.anything());
  });

  it('exposes Daily as the selected provider', () => {
    expect(new DailySessionVideoProviderAdapter(config).provider).toBe(SessionProvider.DAILY);
  });
});
