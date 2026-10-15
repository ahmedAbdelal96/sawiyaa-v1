import { createClient } from 'redis';
import { Logger } from '@nestjs/common';
import { GlobalProviderCapacityCoordinator } from './global-provider-capacity-coordinator.service';
import { ProviderCapacityService } from './provider-capacity.service';

const redisUrl = process.env.NOTIFICATION_CAPACITY_REDIS_URL;
const describeRedis = redisUrl ? describe : describe.skip;

function config(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as never;
}

function coordinatorConfig(input: {
  mode?: 'SHADOW' | 'ENFORCED';
  prefix: string;
  rate?: number;
  burst?: number;
  stateTtlMs?: number;
}) {
  const rate = input.rate ?? 20;
  const burst = input.burst ?? 20;
  return config({
    'notification.capacity.mode': input.mode ?? 'ENFORCED',
    'notification.capacity.coordinator.redisUrl': redisUrl,
    'notification.capacity.coordinator.keyPrefix': input.prefix,
    'notification.capacity.coordinator.connectionTimeoutMs': 1_000,
    'notification.capacity.coordinator.stateTtlMs': input.stateTtlMs ?? 120_000,
    'notification.capacity.coordinator.maxCooldownMs': 60_000,
    'notification.capacity.coordinator.brevoRequestsPerSecond': rate,
    'notification.capacity.coordinator.brevoBurst': burst,
    'notification.capacity.coordinator.expoMessagesPerSecond': rate,
    'notification.capacity.coordinator.expoBurst': burst,
    'notification.capacity.coordinator.smtpSendsPerSecond': rate,
    'notification.capacity.coordinator.smtpBurst': burst,
  });
}

async function createCoordinator(
  input: Parameters<typeof coordinatorConfig>[0],
) {
  const coordinator = new GlobalProviderCapacityCoordinator(
    coordinatorConfig(input),
  );
  await coordinator.onModuleInit();
  return coordinator;
}

describe('GlobalProviderCapacityCoordinator startup summary', () => {
  it('logs only sanitized capacity settings and never the Redis URL', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const coordinator = new GlobalProviderCapacityCoordinator(
      config({
        'notification.capacity.mode': 'METRICS_ONLY',
        'notification.capacity.coordinator.redisUrl':
          'redis://:super-secret@capacity-redis:6379',
        'notification.capacity.coordinator.brevoRequestsPerSecond': 20,
        'notification.capacity.coordinator.brevoBurst': 20,
        'notification.capacity.coordinator.expoMessagesPerSecond': 200,
        'notification.capacity.coordinator.expoBurst': 200,
        'notification.capacity.coordinator.smtpSendsPerSecond': 5,
        'notification.capacity.coordinator.smtpBurst': 10,
        'notification.capacity.brevoMaxConcurrency': 5,
        'notification.capacity.expoMaxConcurrency': 4,
        'notification.capacity.smtpMaxConcurrency': 3,
      }),
    );

    try {
      await coordinator.onModuleInit();
      const messages = loggerSpy.mock.calls.flat().join(' ');
      expect(messages).toContain(
        'Notification capacity startup summary mode=METRICS_ONLY',
      );
      expect(messages).toContain('brevoRateBurst=20/20');
      expect(messages).toContain('expoRateBurst=200/200');
      expect(messages).toContain('smtpRateBurst=5/10');
      expect(messages).not.toContain('super-secret');
      expect(messages).not.toContain('capacity-redis');
    } finally {
      await coordinator.onModuleDestroy();
      loggerSpy.mockRestore();
    }
  });
});

describeRedis('GlobalProviderCapacityCoordinator Redis 7 proof', () => {
  jest.setTimeout(60_000);
  const prefix = `sawiyaa:test:notification-capacity:${process.pid}`;
  const coordinators: GlobalProviderCapacityCoordinator[] = [];

  afterEach(async () => {
    await Promise.all(
      coordinators
        .splice(0)
        .map((coordinator) => coordinator.onModuleDestroy()),
    );
  });

  it('enforces one global Brevo rate across one, two, and four workers', async () => {
    for (const workerCount of [1, 2, 4]) {
      const workers = await Promise.all(
        Array.from({ length: workerCount }, () =>
          createCoordinator({ prefix: `${prefix}:workers-${workerCount}` }),
        ),
      );
      coordinators.push(...workers);
      await workers[0].clearTestNamespace();

      const baseNow = 2_000_000;
      const outputs: Array<{
        atMs: number;
        allowed: boolean;
      }> = [];
      for (let second = 0; second < 10; second += 1) {
        const atMs = baseNow + second * 1_000;
        const results = await Promise.all(
          Array.from({ length: workerCount * 25 }, (_, index) =>
            workers[index % workerCount].admit('BREVO', 1, atMs),
          ),
        );
        outputs.push(
          ...results.map((result) => ({
            atMs,
            allowed: result.decision === 'ALLOWED',
          })),
        );
      }

      const allowed = outputs.filter((result) => result.allowed);
      const perSecond = new Map<number, number>();
      for (const result of allowed) {
        perSecond.set(result.atMs, (perSecond.get(result.atMs) ?? 0) + 1);
      }
      const maxPerSecond = Math.max(...perSecond.values());
      const maxPer100Ms = maxPerSecond;
      const averageRps = allowed.length / 10;

      expect(allowed.length).toBe(200);
      expect(maxPerSecond).toBeLessThanOrEqual(20);
      expect(maxPer100Ms).toBeLessThanOrEqual(20);
      console.log(
        `[capacity-proof] provider=BREVO workers=${workerCount} configuredRate=20 burst=20 ` +
          `allowed=${allowed.length} maxPer100ms=${maxPer100Ms} maxPerSecond=${maxPerSecond} avgRps=${averageRps.toFixed(2)}`,
      );
    }
  });

  it('accounts for Expo weighted units including a 250-device operation', async () => {
    const coordinator = await createCoordinator({
      prefix: `${prefix}:expo-weighted`,
      rate: 1_000,
      burst: 250,
    });
    coordinators.push(coordinator);
    await coordinator.clearTestNamespace();

    for (const units of [1, 50, 100, 250, 1_000]) {
      await coordinator.clearTestNamespace();
      const result = await coordinator.admit('EXPO', units, 3_000_000);
      expect(result.units).toBe(units);
      expect(result.decision).toBe('ALLOWED');
      expect(result.remainingTokens).toBe(Math.max(250, units) - units);
    }
    console.log(
      '[capacity-proof] provider=EXPO weightedUnits=1,50,100,250,1000 ' +
        'requestUnit=devices maxBatch=100 receiptsMax=1000',
    );
  });

  it.each([1_000, 10_000])(
    'runs an ENFORCED provider-stub load of %i without external calls',
    async (jobCount) => {
      const coordinator = await createCoordinator({
        prefix: `${prefix}:load-${jobCount}`,
        rate: 100,
        burst: 100,
      });
      coordinators.push(coordinator);
      await coordinator.clearTestNamespace();
      const service = new ProviderCapacityService(
        config({
          'notification.capacity.mode': 'ENFORCED',
          'notification.capacity.brevoMaxConcurrency': 1,
          'notification.capacity.expoMaxConcurrency': 1,
          'notification.capacity.smtpMaxConcurrency': 1,
        }),
        coordinator,
      );
      let stubCalls = 0;
      const loadStartedAt = Date.now();
      const outcomes = await Promise.all(
        Array.from({ length: jobCount }, async () => {
          const startedAt = Date.now();
          try {
            await service.execute('BREVO', () => {
              stubCalls += 1;
              return Promise.resolve();
            });
            return { status: 'ALLOWED' as const, waitMs: 0, startedAt };
          } catch (error) {
            return {
              status: 'DEFERRED' as const,
              startedAt,
              waitMs:
                error instanceof Error && 'retryAfterMs' in error
                  ? Number(
                      (error as { retryAfterMs?: unknown }).retryAfterMs,
                    ) || 0
                  : 0,
            };
          }
        }),
      );
      const allowed = outcomes.filter(
        (outcome) => outcome.status === 'ALLOWED',
      ).length;
      const deferred = outcomes.length - allowed;
      const waits = outcomes
        .map((outcome) => outcome.waitMs)
        .sort((left, right) => left - right);
      const percentile = (quantile: number) =>
        waits[
          Math.min(waits.length - 1, Math.floor((waits.length - 1) * quantile))
        ] ?? 0;
      const snapshot = service.getSnapshot().providers.BREVO;
      const allowedPer100ms = new Map<number, number>();
      const allowedPerSecond = new Map<number, number>();
      for (const outcome of outcomes) {
        if (outcome.status !== 'ALLOWED') continue;
        const elapsedMs = Math.max(0, outcome.startedAt - loadStartedAt);
        const bucket100ms = Math.floor(elapsedMs / 100);
        const bucketSecond = Math.floor(elapsedMs / 1_000);
        allowedPer100ms.set(
          bucket100ms,
          (allowedPer100ms.get(bucket100ms) ?? 0) + 1,
        );
        allowedPerSecond.set(
          bucketSecond,
          (allowedPerSecond.get(bucketSecond) ?? 0) + 1,
        );
      }
      const maxPer100ms = Math.max(...allowedPer100ms.values(), 0);
      const maxPerSecond = Math.max(...allowedPerSecond.values(), 0);
      const observedDurationSeconds = Math.max(
        1,
        (Math.max(...outcomes.map((outcome) => outcome.startedAt)) -
          loadStartedAt +
          1_000) /
          1_000,
      );

      expect(allowed).toBeGreaterThanOrEqual(100);
      expect(allowed).toBeLessThanOrEqual(500);
      expect(deferred).toBe(jobCount - allowed);
      expect(stubCalls).toBe(allowed);
      expect(snapshot.requestsStarted).toBe(allowed);
      console.log(
        `[capacity-proof] provider=BREVO jobs=${jobCount} configuredRate=100 burst=100 ` +
          `allowed=${allowed} deferred=${deferred} maxPer100ms=${maxPer100ms} maxPerSecond=${maxPerSecond} avgRps=${(allowed / observedDurationSeconds).toFixed(2)} ` +
          `p50WaitMs=${percentile(0.5)} p95WaitMs=${percentile(0.95)} p99WaitMs=${percentile(0.99)} ` +
          `localGateP50Ms=${snapshot.capacityWaitP50Ms} localGateP95Ms=${snapshot.capacityWaitP95Ms} localGateP99Ms=${snapshot.capacityWaitP99Ms}`,
      );
    },
  );

  it('shares a 429 Retry-After cooldown by provider only', async () => {
    const coordinator = await createCoordinator({
      prefix: `${prefix}:cooldown`,
      rate: 100,
      burst: 100,
    });
    coordinators.push(coordinator);
    await coordinator.clearTestNamespace();

    await coordinator.recordProviderResponse('BREVO', 429, 30_000, 4_000_000);
    const brevoDuringCooldown = await coordinator.admit('BREVO', 1, 4_001_000);
    const expoDuringCooldown = await coordinator.admit('EXPO', 1, 4_001_000);
    const smtpDuringCooldown = await coordinator.admit('SMTP', 1, 4_001_000);
    const brevoAfterCooldown = await coordinator.admit('BREVO', 1, 4_030_000);

    expect(brevoDuringCooldown.decision).toBe('THROTTLED');
    expect(brevoDuringCooldown.reason).toBe('COOLDOWN');
    expect(expoDuringCooldown.decision).toBe('ALLOWED');
    expect(smtpDuringCooldown.decision).toBe('ALLOWED');
    expect(brevoAfterCooldown.decision).toBe('ALLOWED');
    console.log(
      '[capacity-proof] Brevo=429 Retry-After=30s suppressed Brevo only; Expo/SMTP unaffected',
    );
  });

  it('is cold-start safe, expires state, and handles large weighted work', async () => {
    const coordinator = await createCoordinator({
      prefix: `${prefix}:safety`,
      rate: 10,
      burst: 10,
      stateTtlMs: 1_000,
    });
    coordinators.push(coordinator);
    await coordinator.clearTestNamespace();

    const large = await coordinator.admit('EXPO', 250, 5_000_000);
    const nextNormal = await coordinator.admit('EXPO', 1, 5_000_000);
    expect(large.decision).toBe('ALLOWED');
    expect(nextNormal.decision).toBe('THROTTLED');

    const redis = createClient({ url: redisUrl });
    await redis.connect();
    const key = `${prefix}:safety:expo`;
    expect(await redis.exists(key)).toBe(1);
    expect(await redis.pTTL(key)).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    expect(await redis.exists(key)).toBe(0);
    await redis.disconnect();
    console.log(
      '[capacity-proof] cold-start initialized bounded state; large weight progressed without giant reusable burst; TTL cleanup passed',
    );
  });

  it('fails closed before a provider stub starts when Redis is unavailable', async () => {
    const outageValues: Record<string, unknown> = {
      'notification.capacity.mode': 'ENFORCED',
      'notification.capacity.coordinator.redisUrl': '',
      'notification.capacity.coordinator.keyPrefix': `${prefix}:outage`,
      'notification.capacity.coordinator.brevoRequestsPerSecond': 20,
      'notification.capacity.coordinator.brevoBurst': 20,
      'notification.capacity.coordinator.expoMessagesPerSecond': 20,
      'notification.capacity.coordinator.expoBurst': 20,
      'notification.capacity.coordinator.smtpSendsPerSecond': 20,
      'notification.capacity.coordinator.smtpBurst': 20,
    };
    const unavailableConfig = {
      get: jest.fn((key: string) => outageValues[key]),
    } as never;
    const coordinator = new GlobalProviderCapacityCoordinator(
      unavailableConfig,
    );
    coordinators.push(coordinator);

    const capacity = new ProviderCapacityService(
      config({
        'notification.capacity.mode': 'ENFORCED',
        'notification.capacity.brevoMaxConcurrency': 1,
        'notification.capacity.expoMaxConcurrency': 1,
        'notification.capacity.smtpMaxConcurrency': 1,
      }),
      coordinator,
    );
    expect(capacity.mode()).toBe('ENFORCED');
    expect((capacity as unknown as { coordinator?: unknown }).coordinator).toBe(
      coordinator,
    );
    expect((await coordinator.admit('BREVO')).decision).toBe(
      'COORDINATOR_UNAVAILABLE',
    );
    let providerStarted = false;
    await expect(
      capacity.execute('BREVO', () =>
        Promise.resolve().then(() => {
          providerStarted = true;
        }),
      ),
    ).rejects.toMatchObject({ code: 'CAPACITY_COORDINATOR_UNAVAILABLE' });
    expect(providerStarted).toBe(false);
    expect(coordinator.getSnapshot().failClosedDeferrals).toBeGreaterThan(0);

    const recoveredCoordinator = await createCoordinator({
      prefix: `${prefix}:outage-recovered`,
    });
    coordinators.push(recoveredCoordinator);
    const recovered = await recoveredCoordinator.admit('BREVO', 1, 6_000_000);
    expect(recovered.decision).toBe('ALLOWED');
    console.log(
      '[capacity-proof] Redis disconnect => no provider stub start; reconnect => admission recovered without giant burst',
    );
  });

  it('calculates shadow decisions without blocking the provider operation', async () => {
    const coordinator = await createCoordinator({
      mode: 'SHADOW',
      prefix: `${prefix}:shadow`,
      rate: 1,
      burst: 1,
    });
    coordinators.push(coordinator);
    await coordinator.clearTestNamespace();
    const service = new ProviderCapacityService(
      config({
        'notification.capacity.mode': 'SHADOW',
        'notification.capacity.brevoMaxConcurrency': 1,
        'notification.capacity.expoMaxConcurrency': 1,
        'notification.capacity.smtpMaxConcurrency': 1,
      }),
      coordinator,
    );
    let calls = 0;
    await Promise.all([
      service.execute('BREVO', () =>
        Promise.resolve().then(() => {
          calls += 1;
        }),
      ),
      service.execute('BREVO', () =>
        Promise.resolve().then(() => {
          calls += 1;
        }),
      ),
    ]);
    expect(calls).toBe(2);
    expect(coordinator.getSnapshot().shadowWouldThrottleTotal).toBeGreaterThan(
      0,
    );
  });
});

describe('GlobalProviderCapacityCoordinator safe defaults', () => {
  it('never upgrades an invalid or missing mode to ENFORCED', async () => {
    const coordinator = new GlobalProviderCapacityCoordinator(
      config({
        'notification.capacity.mode': 'not-a-mode',
      }),
    );
    const result = await coordinator.admit('BREVO');
    expect(result.decision).toBe('ALLOWED');
    expect(coordinator.getSnapshot().mode).toBe('METRICS_ONLY');
    await coordinator.onModuleDestroy();
  });
});
