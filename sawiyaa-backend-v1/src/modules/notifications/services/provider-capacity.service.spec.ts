import { ProviderCapacityService } from './provider-capacity.service';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function config(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as never;
}

jest.setTimeout(20_000);

describe('ProviderCapacityService', () => {
  it('keeps fast Expo progress while Brevo has a saturated slow lane', async () => {
    const service = new ProviderCapacityService(
      config({
        'notification.capacity.mode': 'METRICS_ONLY',
        'notification.capacity.brevoMaxConcurrency': 1,
        'notification.capacity.expoMaxConcurrency': 1,
        'notification.capacity.smtpMaxConcurrency': 1,
      }),
    );

    const slowEmail = service.execute('BREVO', () => delay(5_000));
    await delay(25);
    const queuedEmail = service.execute('BREVO', () => delay(5_000));
    await delay(25);

    const pushStartedAt = Date.now();
    await service.execute('EXPO', () => delay(200), { units: 100 });
    const pushElapsedMs = Date.now() - pushStartedAt;

    await Promise.all([slowEmail, queuedEmail]);

    expect(pushElapsedMs).toBeLessThan(1_000);
    expect(service.getSnapshot().providers.EXPO.deviceMessagesStarted).toBe(
      100,
    );
    expect(service.getSnapshot().providers.BREVO.requestsStarted).toBe(2);
  });

  it('accounts for device-weighted Expo capacity separately from request count', async () => {
    const service = new ProviderCapacityService(config({}));

    await Promise.all([
      service.execute('EXPO', () => Promise.resolve(), { units: 100 }),
      service.execute('EXPO', () => Promise.resolve(), { units: 100 }),
      service.execute('EXPO', () => Promise.resolve(), { units: 50 }),
    ]);

    expect(service.getSnapshot().providers.EXPO).toEqual(
      expect.objectContaining({
        requestsStarted: 3,
        deviceMessagesStarted: 250,
      }),
    );
  });

  it.each([1_000, 10_000])(
    'measures a provider-stub mixed load of %i jobs without external calls',
    async (jobCount) => {
      const service = new ProviderCapacityService(config({}));
      const startedAt = Date.now();
      const jobs = Array.from({ length: jobCount }, (_, index) =>
        index % 10 < 7
          ? service.execute('BREVO', () => Promise.resolve())
          : service.execute('EXPO', () => Promise.resolve(), { units: 1 }),
      );

      await Promise.all(jobs);
      const snapshot = service.getSnapshot();
      expect(snapshot.providers.BREVO.requestsStarted).toBe(
        Math.ceil(jobCount * 0.7),
      );
      expect(snapshot.providers.EXPO.requestsStarted).toBe(
        Math.floor(jobCount * 0.3),
      );
      console.log(
        `[provider-capacity] jobs=${jobCount} elapsedMs=${Date.now() - startedAt} ` +
          `throughputPerSecond=${Math.round((jobCount * 1_000) / Math.max(1, Date.now() - startedAt))} ` +
          `emailWaitSeconds=${snapshot.providers.BREVO.capacityWaitSeconds.toFixed(3)} ` +
          `pushWaitSeconds=${snapshot.providers.EXPO.capacityWaitSeconds.toFixed(3)} ` +
          `emailWaitP95Ms=${snapshot.providers.BREVO.capacityWaitP95Ms} ` +
          `pushWaitP95Ms=${snapshot.providers.EXPO.capacityWaitP95Ms} ` +
          `emailEffectiveRps=${snapshot.providers.BREVO.effectiveRps.toFixed(1)} ` +
          `pushEffectiveRps=${snapshot.providers.EXPO.effectiveRps.toFixed(1)}`,
      );
    },
  );

  it('exercises the 50ms, 200ms, 1s, and 5s provider stub latency modes', async () => {
    const service = new ProviderCapacityService(config({}));
    const startedAt = Date.now();
    await Promise.all([
      service.execute('BREVO', () => delay(50)),
      service.execute('EXPO', () => delay(200), { units: 100 }),
      service.execute('SMTP', () => delay(1_000)),
      service.execute('BREVO', () => delay(5_000)),
    ]);

    const elapsedMs = Date.now() - startedAt;
    const snapshot = service.getSnapshot();
    expect(elapsedMs).toBeGreaterThanOrEqual(5_000);
    expect(snapshot.providers.BREVO.requestsStarted).toBe(2);
    expect(snapshot.providers.EXPO.requestsStarted).toBe(1);
    expect(snapshot.providers.SMTP.requestsStarted).toBe(1);
    console.log(
      `[provider-capacity] latencyModes elapsedMs=${elapsedMs} ` +
        `emailWaitSeconds=${snapshot.providers.BREVO.capacityWaitSeconds.toFixed(3)} ` +
        `pushWaitSeconds=${snapshot.providers.EXPO.capacityWaitSeconds.toFixed(3)}`,
    );
  });

  it('supports both 70/30 and 30/70 mixed lane demand without cross-lane blocking', async () => {
    for (const [brevoJobs, expoJobs] of [
      [70, 30],
      [30, 70],
    ] as const) {
      const service = new ProviderCapacityService(config({}));
      await Promise.all([
        ...Array.from({ length: brevoJobs }, () =>
          service.execute('BREVO', () => Promise.resolve()),
        ),
        ...Array.from({ length: expoJobs }, () =>
          service.execute('EXPO', () => Promise.resolve(), { units: 1 }),
        ),
      ]);

      expect(service.getSnapshot().providers.BREVO.requestsStarted).toBe(
        brevoJobs,
      );
      expect(service.getSnapshot().providers.EXPO.requestsStarted).toBe(
        expoJobs,
      );
    }
  });

  it('keeps normal EMAIL progress while PUSH is slow', async () => {
    const service = new ProviderCapacityService(config({}));
    const slowPush = service.execute('EXPO', () => delay(200), { units: 100 });
    const emailStartedAt = Date.now();
    await service.execute('SMTP', () => delay(10));

    expect(Date.now() - emailStartedAt).toBeLessThan(100);
    await slowPush;
  });

  it('keeps normal PUSH progress while SMTP is slow', async () => {
    const service = new ProviderCapacityService(config({}));
    const slowSmtp = service.execute('SMTP', () => delay(200));
    const pushStartedAt = Date.now();
    await service.execute('EXPO', () => delay(10), { units: 100 });

    expect(Date.now() - pushStartedAt).toBeLessThan(100);
    await slowSmtp;
  });

  it('safely processes a 50k provider-stub load without external calls', async () => {
    const service = new ProviderCapacityService(config({}));
    const startedAt = Date.now();
    await Promise.all(
      Array.from({ length: 50_000 }, (_, index) =>
        service.execute(
          index % 2 === 0 ? 'SMTP' : 'EXPO',
          () => Promise.resolve(),
          {
            units: index % 2 === 0 ? 1 : 100,
          },
        ),
      ),
    );

    const snapshot = service.getSnapshot();
    expect(snapshot.providers.SMTP.requestsStarted).toBe(25_000);
    expect(snapshot.providers.EXPO.requestsStarted).toBe(25_000);
    expect(snapshot.providers.EXPO.deviceMessagesStarted).toBe(2_500_000);
    console.log(
      `[provider-capacity] jobs=50000 ` +
        `elapsedMs=${Date.now() - startedAt} ` +
        `throughputPerSecond=${Math.round((50_000 * 1_000) / Math.max(1, Date.now() - startedAt))} ` +
        `emailWaitP50Ms=${snapshot.providers.SMTP.capacityWaitP50Ms} ` +
        `emailWaitP95Ms=${snapshot.providers.SMTP.capacityWaitP95Ms} ` +
        `emailWaitP99Ms=${snapshot.providers.SMTP.capacityWaitP99Ms} ` +
        `pushWaitP50Ms=${snapshot.providers.EXPO.capacityWaitP50Ms} ` +
        `pushWaitP95Ms=${snapshot.providers.EXPO.capacityWaitP95Ms} ` +
        `pushWaitP99Ms=${snapshot.providers.EXPO.capacityWaitP99Ms}`,
    );
  });
});
