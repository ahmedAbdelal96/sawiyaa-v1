import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SecurityAuditRepository } from './security-audit.repository';
import {
  SecurityAuditActorType,
  SecurityAuditEntry,
  SecurityAuditSource,
} from './security-audit.types';

const MAX_METADATA_BYTES = 32 * 1024;

/**
 * Security audit facade with explicit reliability semantics.
 * `recordRequired` participates in the caller transaction and throws on failure.
 * `logAsync` remains best-effort for observational/non-critical events.
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly repository: SecurityAuditRepository) {}

  async recordRequired(
    tx: Prisma.TransactionClient,
    entry: SecurityAuditEntry,
  ): Promise<void> {
    await this.repository.create(this.toCreateInput(entry), tx);
  }

  logAsync(entry: SecurityAuditEntry): void {
    void this.recordBestEffort(entry);
  }

  private async recordBestEffort(entry: SecurityAuditEntry): Promise<void> {
    try {
      await this.repository.create(this.toCreateInput(entry));
    } catch (error: unknown) {
      this.logger.error(
        'SecurityAuditService best-effort write failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toCreateInput(
    entry: SecurityAuditEntry,
  ): Prisma.SecurityAuditLogUncheckedCreateInput {
    const actorType = this.resolveActorType(entry);
    if (actorType === SecurityAuditActorType.USER && !entry.actorUserId) {
      throw new Error('Security audit USER actor requires actorUserId');
    }

    const metadata = entry.metadata
      ? this.sanitizeMetadata(entry.metadata)
      : undefined;

    if (metadata !== undefined) {
      const size = Buffer.byteLength(JSON.stringify(metadata), 'utf8');
      if (size > MAX_METADATA_BYTES) {
        throw new Error(
          `Security audit metadata exceeds ${MAX_METADATA_BYTES} bytes`,
        );
      }
    }

    return {
      action: entry.action,
      outcome: entry.outcome,
      actorType,
      actorUserId: entry.actorUserId ?? null,
      actorRolesJson: entry.actorRoles ?? undefined,
      source:
        entry.source ??
        (entry.actorUserId
          ? SecurityAuditSource.HTTP_REQUEST
          : SecurityAuditSource.SYSTEM),
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      targetUserId: entry.targetUserId ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ? entry.userAgent.substring(0, 500) : null,
      requestId: entry.requestId ?? null,
      correlationId: entry.correlationId ?? null,
      reason: entry.reason ? entry.reason.substring(0, 500) : null,
      metadataJson: metadata as Prisma.InputJsonValue | undefined,
    };
  }

  private resolveActorType(entry: SecurityAuditEntry): SecurityAuditActorType {
    if (entry.actorType) return entry.actorType;
    return entry.actorUserId
      ? SecurityAuditActorType.USER
      : SecurityAuditActorType.SYSTEM;
  }

  private sanitizeMetadata(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const bannedKeys = new Set([
      'password',
      'passwordhash',
      'token',
      'accesstoken',
      'refreshtoken',
      'idtoken',
      'otp',
      'otpcode',
      'code',
      'secret',
      'apikey',
      'apisecret',
      'authorization',
      'cookie',
      'set-cookie',
      'credentials',
      'secretkey',
      'clientsecret',
      'providersecret',
      'checkouturl',
      'rawbody',
      'payload',
      'body',
    ]);

    const sanitizeValue = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !bannedKeys.has(key.toLowerCase()))
            .map(([key, nested]) => [key, sanitizeValue(nested)]),
        );
      }
      return value;
    };

    return sanitizeValue(raw) as Record<string, unknown>;
  }
}
