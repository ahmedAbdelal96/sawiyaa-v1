import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { NotificationProvider } from './provider-capacity.service';

type CapacityRedisClient = ReturnType<typeof createClient>;

export type GlobalCapacityDecision =
  | 'ALLOWED'
  | 'THROTTLED'
  | 'COORDINATOR_UNAVAILABLE';

export type GlobalCapacityAdmission = {
  provider: NotificationProvider;
  units: number;
  decision: GlobalCapacityDecision;
  wouldHaveBeen: Exclude<GlobalCapacityDecision, 'COORDINATOR_UNAVAILABLE'>;
  retryAfterMs: number;
  remainingTokens: number;
  reason: string;
};

export type ProviderCapacityRateConfig = {
  ratePerSecond: number | null;
  burst: number | null;
};

export type GlobalCapacitySnapshot = {
  mode: 'METRICS_ONLY' | 'SHADOW' | 'ENFORCED';
  configured: boolean;
  redisUrlConfigured: boolean;
  redisReady: boolean;
  health: 'NOT_REQUIRED' | 'READY' | 'UNAVAILABLE';
  keyPrefix: string;
  stateTtlMs: number;
  providers: Record<NotificationProvider, ProviderCapacityRateConfig>;
  allowedTotal: number;
  throttledTotal: number;
  shadowWouldThrottleTotal: number;
  coordinatorErrors: number;
  failClosedDeferrals: number;
  cooldownEvents: number;
  lastError: string | null;
};

const TOKEN_BUCKET_SCRIPT = `
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])
local weight = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local effective_capacity = math.max(burst, weight)
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens'))
local last_ms = tonumber(redis.call('HGET', KEYS[1], 'last_ms'))
local cooldown_until_ms = tonumber(redis.call('HGET', KEYS[1], 'cooldown_until_ms')) or 0

if not tokens or not last_ms then
  tokens = effective_capacity
  last_ms = now
else
  -- Never refill backwards when a worker clock moves backwards.
  if now < last_ms then now = last_ms end
  local elapsed_ms = now - last_ms
  tokens = math.min(effective_capacity, tokens + (elapsed_ms * rate / 1000))
  last_ms = now
end

if cooldown_until_ms > now then
  redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_ms', last_ms)
  redis.call('PEXPIRE', KEYS[1], ttl)
  return {0, tokens, cooldown_until_ms - now, 'COOLDOWN', 0}
end

if tokens >= weight then
  tokens = tokens - weight
  redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_ms', last_ms)
  redis.call('PEXPIRE', KEYS[1], ttl)
  return {1, tokens, 0, 'ALLOWED', 0}
end

local deficit = weight - tokens
local retry_ms = math.ceil(deficit * 1000 / rate)
redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_ms', last_ms)
redis.call('PEXPIRE', KEYS[1], ttl)
return {0, tokens, retry_ms, 'THROTTLED', 0}
`;

const COOLDOWN_SCRIPT = `
local now = tonumber(ARGV[1])
local duration = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local current = tonumber(redis.call('HGET', KEYS[1], 'cooldown_until_ms')) or 0
local next_until = math.max(current, now + duration)
redis.call('HSET', KEYS[1], 'cooldown_until_ms', next_until)
redis.call('PEXPIRE', KEYS[1], ttl)
return next_until
`;

@Injectable()
export class GlobalProviderCapacityCoordinator
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(GlobalProviderCapacityCoordinator.name);
  private client: CapacityRedisClient | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private lastError: string | null = null;
  private allowedTotal = 0;
  private throttledTotal = 0;
  private shadowWouldThrottleTotal = 0;
  private coordinatorErrors = 0;
  private failClosedDeferrals = 0;
  private cooldownEvents = 0;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mode = this.mode();
    if (mode === 'METRICS_ONLY') {
      this.logStartupSummary();
      return;
    }

    this.assertEnforcedConfiguration(mode);
    if (!this.redisUrl()) {
      this.markUnavailable('capacity Redis URL is not configured');
      this.logStartupSummary();
      return;
    }
    await this.connect();
    this.logStartupSummary();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      if (this.client.isOpen) await this.client.disconnect();
    } catch {
      // The process is already shutting down; there is no recovery action.
    }
    this.client = null;
  }

  mode(): 'METRICS_ONLY' | 'SHADOW' | 'ENFORCED' {
    const configured = String(
      this.configService.get<string>('notification.capacity.mode') ??
        process.env.NOTIFICATION_CAPACITY_MODE ??
        'METRICS_ONLY',
    )
      .trim()
      .toUpperCase();
    if (configured === 'SHADOW') return 'SHADOW';
    if (configured === 'ENFORCED') return 'ENFORCED';
    return 'METRICS_ONLY';
  }

  async admit(
    provider: NotificationProvider,
    units = 1,
    nowMs = Date.now(),
  ): Promise<GlobalCapacityAdmission> {
    const safeUnits = this.safeUnits(units);
    const mode = this.mode();
    if (mode === 'METRICS_ONLY') {
      this.allowedTotal += 1;
      return this.admission(
        provider,
        safeUnits,
        'ALLOWED',
        'ALLOWED',
        0,
        0,
        'METRICS_ONLY',
      );
    }

    const rateConfig = this.providerConfig(provider);
    if (
      rateConfig.ratePerSecond === null ||
      rateConfig.burst === null ||
      !this.redisUrl()
    ) {
      return this.unavailableAdmission(
        provider,
        safeUnits,
        mode === 'ENFORCED'
          ? 'CAPACITY_CONFIGURATION_INCOMPLETE'
          : 'CAPACITY_COORDINATOR_UNAVAILABLE',
      );
    }

    if (!(await this.connect())) {
      return this.unavailableAdmission(
        provider,
        safeUnits,
        'CAPACITY_COORDINATOR_UNAVAILABLE',
      );
    }

    try {
      const key = this.keyFor(provider);
      const result = (await this.client!.eval(TOKEN_BUCKET_SCRIPT, {
        keys: [key],
        arguments: [
          String(Math.max(0, Math.floor(nowMs))),
          String(rateConfig.ratePerSecond),
          String(rateConfig.burst),
          String(safeUnits),
          String(this.stateTtlMs()),
        ],
      })) as unknown as Array<number | string>;
      const allowed = Number(result[0]) === 1;
      const remainingTokens = Math.max(0, Number(result[1]) || 0);
      const retryAfterMs = Math.max(0, Math.ceil(Number(result[2]) || 0));
      const reason = String(result[3] ?? (allowed ? 'ALLOWED' : 'THROTTLED'));
      const wouldHaveBeen = allowed ? 'ALLOWED' : 'THROTTLED';

      if (allowed) this.allowedTotal += 1;
      else {
        this.throttledTotal += 1;
        if (mode === 'SHADOW') this.shadowWouldThrottleTotal += 1;
      }

      return this.admission(
        provider,
        safeUnits,
        mode === 'SHADOW' ? wouldHaveBeen : wouldHaveBeen,
        wouldHaveBeen,
        retryAfterMs,
        remainingTokens,
        reason,
      );
    } catch (error) {
      this.markUnavailable(this.safeError(error));
      return this.unavailableAdmission(
        provider,
        safeUnits,
        'CAPACITY_COORDINATOR_UNAVAILABLE',
      );
    }
  }

  async recordProviderResponse(
    provider: NotificationProvider,
    status: number,
    retryAfterMs?: number,
    nowMs = Date.now(),
  ): Promise<void> {
    if (status !== 429) return;
    const requestedCooldown = Math.max(0, Math.floor(retryAfterMs ?? 0));
    if (requestedCooldown <= 0 || !this.redisUrl()) return;
    const boundedCooldown = Math.min(requestedCooldown, this.maxCooldownMs());
    if (!(await this.connect())) return;

    try {
      await this.client!.eval(COOLDOWN_SCRIPT, {
        keys: [this.keyFor(provider)],
        arguments: [
          String(Math.max(0, Math.floor(nowMs))),
          String(boundedCooldown),
          String(Math.max(this.stateTtlMs(), boundedCooldown + 1_000)),
        ],
      });
      this.cooldownEvents += 1;
    } catch (error) {
      this.markUnavailable(this.safeError(error));
    }
  }

  getSnapshot(): GlobalCapacitySnapshot {
    const mode = this.mode();
    const redisReady = Boolean(this.client?.isReady);
    const configured = this.allProvidersConfigured();
    return {
      mode,
      configured,
      redisUrlConfigured: Boolean(this.redisUrl()),
      redisReady,
      health:
        mode === 'METRICS_ONLY'
          ? 'NOT_REQUIRED'
          : redisReady
            ? 'READY'
            : 'UNAVAILABLE',
      keyPrefix: this.keyPrefix(),
      stateTtlMs: this.stateTtlMs(),
      providers: {
        BREVO: this.providerConfig('BREVO'),
        EXPO: this.providerConfig('EXPO'),
        SMTP: this.providerConfig('SMTP'),
      },
      allowedTotal: this.allowedTotal,
      throttledTotal: this.throttledTotal,
      shadowWouldThrottleTotal: this.shadowWouldThrottleTotal,
      coordinatorErrors: this.coordinatorErrors,
      failClosedDeferrals: this.failClosedDeferrals,
      cooldownEvents: this.cooldownEvents,
      lastError: this.lastError,
    };
  }

  /** Test/QA helper; it can only touch this coordinator's bounded namespace. */
  async clearTestNamespace(): Promise<void> {
    if (!(await this.connect()) || !this.client) return;
    for (const provider of [
      'BREVO',
      'EXPO',
      'SMTP',
    ] as NotificationProvider[]) {
      await this.client.del(this.keyFor(provider));
    }
  }

  private async connect(): Promise<boolean> {
    if (!this.redisUrl()) return false;
    if (this.client?.isReady) return true;
    if (this.connectPromise) return this.connectPromise;

    if (!this.client) {
      this.client = createClient({
        url: this.redisUrl()!,
        socket: {
          connectTimeout: this.connectionTimeoutMs(),
          reconnectStrategy: (retries) =>
            retries >= 3 ? false : Math.min(1_000, 100 * (retries + 1)),
        },
      });
      this.client.on('error', (error) => {
        this.markUnavailable(this.safeError(error));
      });
      this.client.on('ready', () => {
        this.lastError = null;
      });
    }

    this.connectPromise = this.client
      .connect()
      .then(() => {
        this.lastError = null;
        return true;
      })
      .catch((error: unknown) => {
        this.markUnavailable(this.safeError(error));
        return false;
      })
      .finally(() => {
        this.connectPromise = null;
      });
    return this.connectPromise;
  }

  private assertEnforcedConfiguration(mode: 'SHADOW' | 'ENFORCED'): void {
    if (mode !== 'ENFORCED') return;
    if (!this.redisUrl() || !this.allProvidersConfigured()) {
      throw new Error(
        'NOTIFICATION_CAPACITY_MODE=ENFORCED requires capacity Redis and explicit Brevo, Expo, and SMTP rate/burst limits',
      );
    }
  }

  private unavailableAdmission(
    provider: NotificationProvider,
    units: number,
    reason: string,
  ): GlobalCapacityAdmission {
    this.coordinatorErrors += 1;
    if (this.mode() === 'ENFORCED') this.failClosedDeferrals += 1;
    return this.admission(
      provider,
      units,
      'COORDINATOR_UNAVAILABLE',
      'THROTTLED',
      0,
      0,
      reason,
    );
  }

  private admission(
    provider: NotificationProvider,
    units: number,
    decision: GlobalCapacityDecision,
    wouldHaveBeen: 'ALLOWED' | 'THROTTLED',
    retryAfterMs: number,
    remainingTokens: number,
    reason: string,
  ): GlobalCapacityAdmission {
    return {
      provider,
      units,
      decision,
      wouldHaveBeen,
      retryAfterMs,
      remainingTokens,
      reason,
    };
  }

  private providerConfig(
    provider: NotificationProvider,
  ): ProviderCapacityRateConfig {
    const pathByProvider: Record<NotificationProvider, [string, string]> = {
      BREVO: [
        'notification.capacity.coordinator.brevoRequestsPerSecond',
        'notification.capacity.coordinator.brevoBurst',
      ],
      EXPO: [
        'notification.capacity.coordinator.expoMessagesPerSecond',
        'notification.capacity.coordinator.expoBurst',
      ],
      SMTP: [
        'notification.capacity.coordinator.smtpSendsPerSecond',
        'notification.capacity.coordinator.smtpBurst',
      ],
    };
    const [ratePath, burstPath] = pathByProvider[provider];
    return {
      ratePerSecond: this.optionalPositiveNumber(
        this.configService.get<number | null>(ratePath),
      ),
      burst: this.optionalPositiveNumber(
        this.configService.get<number | null>(burstPath),
      ),
    };
  }

  private allProvidersConfigured(): boolean {
    return (['BREVO', 'EXPO', 'SMTP'] as NotificationProvider[]).every(
      (provider) => {
        const config = this.providerConfig(provider);
        return config.ratePerSecond !== null && config.burst !== null;
      },
    );
  }

  private keyFor(provider: NotificationProvider): string {
    return `${this.keyPrefix()}:${provider.toLowerCase()}`;
  }

  private redisUrl(): string | undefined {
    return (
      this.configService.get<string>(
        'notification.capacity.coordinator.redisUrl',
      ) ?? process.env.NOTIFICATION_CAPACITY_REDIS_URL
    );
  }

  private keyPrefix(): string {
    const configured =
      this.configService.get<string>(
        'notification.capacity.coordinator.keyPrefix',
      ) ??
      process.env.NOTIFICATION_CAPACITY_KEY_PREFIX ??
      'sawiyaa:notification-capacity';
    return configured.trim().slice(0, 128) || 'sawiyaa:notification-capacity';
  }

  private stateTtlMs(): number {
    return this.boundedConfigNumber(
      'notification.capacity.coordinator.stateTtlMs',
      120_000,
      1_000,
      3_600_000,
    );
  }

  private maxCooldownMs(): number {
    return this.boundedConfigNumber(
      'notification.capacity.coordinator.maxCooldownMs',
      3_600_000,
      1_000,
      86_400_000,
    );
  }

  private connectionTimeoutMs(): number {
    return this.boundedConfigNumber(
      'notification.capacity.coordinator.connectionTimeoutMs',
      1_000,
      100,
      60_000,
    );
  }

  private boundedConfigNumber(
    path: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const configured = this.configService.get<number>(path);
    return typeof configured === 'number' && Number.isFinite(configured)
      ? Math.min(max, Math.max(min, Math.floor(configured)))
      : fallback;
  }

  private optionalPositiveNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : null;
  }

  private safeUnits(units: number): number {
    if (!Number.isFinite(units)) return 1;
    return Math.min(10_000, Math.max(1, Math.ceil(units)));
  }

  private markUnavailable(reason: string): void {
    this.lastError = reason.slice(0, 200);
    this.logger.warn(
      `Global notification capacity coordinator unavailable: ${this.lastError}`,
    );
  }

  private logStartupSummary(): void {
    const snapshot = this.getSnapshot();
    const localConcurrency = (provider: 'brevo' | 'expo' | 'smtp'): number => {
      const configured = this.configService.get<number>(
        `notification.capacity.${provider}MaxConcurrency`,
      );
      return typeof configured === 'number' && Number.isFinite(configured)
        ? Math.min(20, Math.max(1, Math.floor(configured)))
        : 1;
    };
    const rate = (provider: NotificationProvider): string => {
      const configured = snapshot.providers[provider];
      return `${configured.ratePerSecond ?? 'unset'}/${configured.burst ?? 'unset'}`;
    };

    this.logger.log(
      'Notification capacity startup summary ' +
        `mode=${snapshot.mode} ` +
        `brevoRateBurst=${rate('BREVO')} brevoConcurrency=${localConcurrency('brevo')} ` +
        `expoRateBurst=${rate('EXPO')} expoConcurrency=${localConcurrency('expo')} ` +
        `smtpRateBurst=${rate('SMTP')} smtpConcurrency=${localConcurrency('smtp')} ` +
        `redisConfigured=${snapshot.redisUrlConfigured ? 'yes' : 'no'} ` +
        `coordinatorHealth=${snapshot.health}`,
    );
  }

  private safeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
