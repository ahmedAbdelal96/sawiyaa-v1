import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GlobalProviderCapacityCoordinator,
  type GlobalCapacitySnapshot,
} from './global-provider-capacity-coordinator.service';

export type NotificationProvider = 'BREVO' | 'EXPO' | 'SMTP';
export type NotificationCapacityMode = 'METRICS_ONLY' | 'SHADOW' | 'ENFORCED';

export type ProviderCapacityAdmissionErrorCode =
  | 'CAPACITY_ADMISSION_DEFERRED'
  | 'CAPACITY_COORDINATOR_UNAVAILABLE';

export class ProviderCapacityAdmissionError extends Error {
  readonly code: ProviderCapacityAdmissionErrorCode;
  readonly provider: NotificationProvider;
  readonly retryAfterMs: number;
  readonly reason: string;

  constructor(input: {
    code: ProviderCapacityAdmissionErrorCode;
    provider: NotificationProvider;
    retryAfterMs?: number;
    reason: string;
  }) {
    super(input.reason);
    this.name = 'ProviderCapacityAdmissionError';
    this.code = input.code;
    this.provider = input.provider;
    this.retryAfterMs = Math.max(0, input.retryAfterMs ?? 0);
    this.reason = input.reason;
  }
}

export function isProviderCapacityAdmissionError(
  error: unknown,
): error is ProviderCapacityAdmissionError {
  return error instanceof ProviderCapacityAdmissionError;
}

type CapacityWaiter = {
  enqueuedAt: number;
  resolve: (release: () => void) => void;
};

class LocalCapacityLane {
  private inFlight = 0;
  private readonly waiters: CapacityWaiter[] = [];

  constructor(private readonly maxConcurrency: number) {}

  get active(): number {
    return this.inFlight;
  }

  get backlog(): number {
    return this.waiters.length;
  }

  acquire(): Promise<{ release: () => void; waitedMs: number }> {
    const enqueuedAt = Date.now();
    return new Promise((resolve) => {
      this.waiters.push({
        enqueuedAt,
        resolve: (release) =>
          resolve({ release, waitedMs: Math.max(0, Date.now() - enqueuedAt) }),
      });
      this.drain();
    });
  }

  private drain(): void {
    while (this.inFlight < this.maxConcurrency && this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (!waiter) return;

      this.inFlight += 1;
      let released = false;
      waiter.resolve(() => {
        if (released) return;
        released = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
        this.drain();
      });
    }
  }
}

type ProviderCapacityCounters = {
  requestsStarted: number;
  requestsCompleted: number;
  deviceMessagesStarted: number;
  capacityWaitCount: number;
  capacityWaitMs: number;
  rateLimited: number;
  serverErrors: number;
  rateLimitRemaining: number | null;
  rateLimitResetSeconds: number | null;
};

export type ProviderCapacityMetric = {
  name:
    | 'notification_provider_inflight'
    | 'notification_provider_requests_total'
    | 'notification_provider_capacity_wait_seconds'
    | 'notification_provider_effective_rps'
    | 'notification_provider_backlog'
    | 'notification_provider_429_total'
    | 'notification_provider_5xx_total';
  provider: NotificationProvider;
  value: number;
};

export type ProviderCapacitySnapshot = {
  mode: NotificationCapacityMode;
  globalRateAdmission: 'DISABLED' | 'SHADOW' | 'ENFORCED';
  globalCoordinator: GlobalCapacitySnapshot;
  metrics: ProviderCapacityMetric[];
  providers: Record<
    NotificationProvider,
    {
      inFlight: number;
      backlog: number;
      maxConcurrency: number;
      requestsStarted: number;
      requestsCompleted: number;
      deviceMessagesStarted: number;
      capacityWaitSeconds: number;
      capacityWaitP50Ms: number;
      capacityWaitP95Ms: number;
      capacityWaitP99Ms: number;
      effectiveRps: number;
      rateLimited: number;
      serverErrors: number;
      rateLimitRemaining: number | null;
      rateLimitResetSeconds: number | null;
    }
  >;
};

@Injectable()
export class ProviderCapacityService {
  private readonly logger = new Logger(ProviderCapacityService.name);
  private readonly startedAt = Date.now();
  private readonly lanes: Record<NotificationProvider, LocalCapacityLane>;
  private readonly counters: Record<
    NotificationProvider,
    ProviderCapacityCounters
  > = {
    BREVO: this.emptyCounters(),
    EXPO: this.emptyCounters(),
    SMTP: this.emptyCounters(),
  };
  private readonly capacityWaitSamples: Record<NotificationProvider, number[]> =
    {
      BREVO: [],
      EXPO: [],
      SMTP: [],
    };
  private readonly capacityWaitSampleIndexes: Record<
    NotificationProvider,
    number
  > = {
    BREVO: 0,
    EXPO: 0,
    SMTP: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly coordinator?: GlobalProviderCapacityCoordinator,
  ) {
    this.lanes = {
      BREVO: new LocalCapacityLane(this.readConcurrency('brevo')),
      EXPO: new LocalCapacityLane(this.readConcurrency('expo')),
      SMTP: new LocalCapacityLane(this.readConcurrency('smtp')),
    };

    if (this.mode() === 'ENFORCED') {
      this.logger.warn(
        'Notification capacity mode ENFORCED is configured; startup validation must provide explicit limits and capacity Redis',
      );
    }
  }

  mode(): NotificationCapacityMode {
    const configured = String(
      this.configService.get<string>('notification.capacity.mode') ??
        process.env.NOTIFICATION_CAPACITY_MODE ??
        'METRICS_ONLY',
    )
      .trim()
      .toUpperCase();
    if (configured === 'SHADOW') return 'SHADOW';
    return configured === 'ENFORCED' ? 'ENFORCED' : 'METRICS_ONLY';
  }

  providerForEmail(): NotificationProvider {
    return String(
      this.configService.get<string>('notification.mail.provider') ??
        process.env.MAIL_PROVIDER ??
        'smtp',
    )
      .trim()
      .toUpperCase() === 'BREVO'
      ? 'BREVO'
      : 'SMTP';
  }

  async execute<T>(
    provider: NotificationProvider,
    operation: () => Promise<T>,
    options?: { units?: number },
  ): Promise<T> {
    if (this.mode() === 'ENFORCED' && !this.coordinator) {
      throw new ProviderCapacityAdmissionError({
        code: 'CAPACITY_COORDINATOR_UNAVAILABLE',
        provider,
        reason: 'CAPACITY_COORDINATOR_UNAVAILABLE',
      });
    }

    if (this.coordinator && this.mode() !== 'METRICS_ONLY') {
      const admission = await this.coordinator.admit(
        provider,
        options?.units ?? 1,
      );
      if (this.mode() === 'ENFORCED' && admission.decision !== 'ALLOWED') {
        throw new ProviderCapacityAdmissionError({
          code:
            admission.decision === 'THROTTLED'
              ? 'CAPACITY_ADMISSION_DEFERRED'
              : 'CAPACITY_COORDINATOR_UNAVAILABLE',
          provider,
          retryAfterMs: admission.retryAfterMs,
          reason: admission.reason,
        });
      }
    }

    const lane = this.lanes[provider];
    const counters = this.counters[provider];
    const lease = await lane.acquire();
    counters.capacityWaitCount += lease.waitedMs > 0 ? 1 : 0;
    counters.capacityWaitMs += lease.waitedMs;
    this.recordCapacityWaitSample(provider, lease.waitedMs);
    counters.requestsStarted += 1;
    counters.deviceMessagesStarted += Math.max(1, options?.units ?? 1);

    try {
      return await operation();
    } finally {
      counters.requestsCompleted += 1;
      lease.release();
    }
  }

  recordProviderResponse(
    provider: NotificationProvider,
    status: number,
    retryAfterMs?: number,
  ): void {
    if (status === 429) this.counters[provider].rateLimited += 1;
    if (status >= 500 && status <= 599) {
      this.counters[provider].serverErrors += 1;
    }
    void this.coordinator?.recordProviderResponse(
      provider,
      status,
      retryAfterMs,
    );
  }

  recordRateLimitHeaders(
    provider: NotificationProvider,
    headers: { remaining?: string | null; resetSeconds?: string | null },
  ): void {
    const remaining = Number.parseInt(headers.remaining ?? '', 10);
    const resetSeconds = Number.parseInt(headers.resetSeconds ?? '', 10);
    this.counters[provider].rateLimitRemaining = Number.isFinite(remaining)
      ? Math.max(0, remaining)
      : null;
    this.counters[provider].rateLimitResetSeconds = Number.isFinite(
      resetSeconds,
    )
      ? Math.max(0, resetSeconds)
      : null;
  }

  getSnapshot(): ProviderCapacitySnapshot {
    const elapsedSeconds = Math.max(1, (Date.now() - this.startedAt) / 1_000);
    const mode = this.mode();
    const providers = {} as ProviderCapacitySnapshot['providers'];

    for (const provider of Object.keys(this.lanes) as NotificationProvider[]) {
      const lane = this.lanes[provider];
      const counters = this.counters[provider];
      providers[provider] = {
        inFlight: lane.active,
        backlog: lane.backlog,
        maxConcurrency: this.readConcurrency(provider.toLowerCase()),
        requestsStarted: counters.requestsStarted,
        requestsCompleted: counters.requestsCompleted,
        deviceMessagesStarted: counters.deviceMessagesStarted,
        capacityWaitSeconds: counters.capacityWaitMs / 1_000,
        capacityWaitP50Ms: this.percentile(provider, 0.5),
        capacityWaitP95Ms: this.percentile(provider, 0.95),
        capacityWaitP99Ms: this.percentile(provider, 0.99),
        effectiveRps: counters.requestsStarted / elapsedSeconds,
        rateLimited: counters.rateLimited,
        serverErrors: counters.serverErrors,
        rateLimitRemaining: counters.rateLimitRemaining,
        rateLimitResetSeconds: counters.rateLimitResetSeconds,
      };
    }

    const snapshot: ProviderCapacitySnapshot = {
      mode,
      globalRateAdmission: mode === 'METRICS_ONLY' ? 'DISABLED' : mode,
      globalCoordinator: this.coordinator?.getSnapshot() ?? {
        mode,
        configured: false,
        redisUrlConfigured: false,
        redisReady: false,
        health: mode === 'METRICS_ONLY' ? 'NOT_REQUIRED' : 'UNAVAILABLE',
        keyPrefix: 'sawiyaa:notification-capacity',
        stateTtlMs: 120_000,
        providers: {
          BREVO: { ratePerSecond: null, burst: null },
          EXPO: { ratePerSecond: null, burst: null },
          SMTP: { ratePerSecond: null, burst: null },
        },
        allowedTotal: 0,
        throttledTotal: 0,
        shadowWouldThrottleTotal: 0,
        coordinatorErrors: 0,
        failClosedDeferrals: 0,
        cooldownEvents: 0,
        lastError: null,
      },
      metrics: [],
      providers,
    };
    snapshot.metrics = this.metricSamples(providers);
    return snapshot;
  }

  private metricSamples(
    providers: ProviderCapacitySnapshot['providers'],
  ): ProviderCapacityMetric[] {
    return (Object.keys(providers) as NotificationProvider[]).flatMap(
      (provider) => {
        const snapshot = providers[provider];
        return [
          {
            name: 'notification_provider_inflight' as const,
            provider,
            value: snapshot.inFlight,
          },
          {
            name: 'notification_provider_requests_total' as const,
            provider,
            value: snapshot.requestsStarted,
          },
          {
            name: 'notification_provider_capacity_wait_seconds' as const,
            provider,
            value: snapshot.capacityWaitSeconds,
          },
          {
            name: 'notification_provider_effective_rps' as const,
            provider,
            value: snapshot.effectiveRps,
          },
          {
            name: 'notification_provider_backlog' as const,
            provider,
            value: snapshot.backlog,
          },
          {
            name: 'notification_provider_429_total' as const,
            provider,
            value: snapshot.rateLimited,
          },
          {
            name: 'notification_provider_5xx_total' as const,
            provider,
            value: snapshot.serverErrors,
          },
        ];
      },
    );
  }

  private recordCapacityWaitSample(
    provider: NotificationProvider,
    waitedMs: number,
  ): void {
    const samples = this.capacityWaitSamples[provider];
    const index = this.capacityWaitSampleIndexes[provider];
    if (samples.length < 10_000) {
      samples.push(waitedMs);
      this.capacityWaitSampleIndexes[provider] = samples.length % 10_000;
      return;
    }
    samples[index] = waitedMs;
    this.capacityWaitSampleIndexes[provider] = (index + 1) % 10_000;
  }

  private percentile(provider: NotificationProvider, quantile: number): number {
    const samples = [...this.capacityWaitSamples[provider]].sort(
      (left, right) => left - right,
    );
    if (samples.length === 0) return 0;
    const index = Math.min(
      samples.length - 1,
      Math.floor((samples.length - 1) * quantile),
    );
    return samples[index];
  }

  private readConcurrency(provider: string): number {
    const configured = this.configService.get<number>(
      `notification.capacity.${provider}MaxConcurrency`,
    );
    return typeof configured === 'number' && Number.isFinite(configured)
      ? Math.min(20, Math.max(1, Math.floor(configured)))
      : 1;
  }

  private emptyCounters(): ProviderCapacityCounters {
    return {
      requestsStarted: 0,
      requestsCompleted: 0,
      deviceMessagesStarted: 0,
      capacityWaitCount: 0,
      capacityWaitMs: 0,
      rateLimited: 0,
      serverErrors: 0,
      rateLimitRemaining: null,
      rateLimitResetSeconds: null,
    };
  }
}
