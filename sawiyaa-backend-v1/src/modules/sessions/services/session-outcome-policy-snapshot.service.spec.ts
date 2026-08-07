import { SessionOutcomePolicySnapshotService } from './session-outcome-policy-snapshot.service';

describe('SessionOutcomePolicySnapshotService', () => {
  it('captures once and preserves the historical snapshot on repeated UPCOMING callbacks', async () => {
    const upsert = jest.fn().mockResolvedValue({ version: 1 });
    const service = new SessionOutcomePolicySnapshotService({} as never);
    const tx = { sessionOutcomePolicySnapshot: { upsert } } as never;
    const capturedAt = new Date('2026-08-03T12:00:00.000Z');

    await service.captureForUpcoming('session-1', tx, capturedAt);
    await service.captureForUpcoming(
      'session-1',
      tx,
      new Date('2026-08-04T12:00:00.000Z'),
    );

    expect(upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { sessionId: 'session-1' },
        create: expect.objectContaining({
          sessionId: 'session-1',
          capturedAt,
          source: 'session-outcome-policy-v1',
        }) as never,
        update: {},
      }),
    );
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { sessionId: 'session-1' },
        update: {},
      }),
    );
  });
});
