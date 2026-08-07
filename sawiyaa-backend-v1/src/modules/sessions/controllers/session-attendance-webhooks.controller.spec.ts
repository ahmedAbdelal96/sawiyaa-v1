import { SessionAttendanceWebhooksController } from './session-attendance-webhooks.controller';

describe('SessionAttendanceWebhooksController', () => {
  it('answers Daily webhook registration verification without bypassing event handling', () => {
    const useCase = { execute: jest.fn() };
    const controller = new SessionAttendanceWebhooksController(
      useCase as never,
    );

    const result = controller.daily(
      { rawBody: Buffer.from('{"test":"test"}') } as never,
      {},
    );

    expect(result).toEqual({
      received: true,
      handled: false,
      reason: 'WEBHOOK_VERIFICATION',
      sessionId: null,
    });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('passes non-verification payloads to the verified handler', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ handled: true }) };
    const controller = new SessionAttendanceWebhooksController(
      useCase as never,
    );
    const rawBody = Buffer.from('{"type":"participant.joined"}');

    await controller.daily({ rawBody } as never, {
      'x-webhook-signature': 'sig',
    });

    expect(useCase.execute).toHaveBeenCalledWith({
      rawBody,
      headers: { 'x-webhook-signature': 'sig' },
    });
  });
});
