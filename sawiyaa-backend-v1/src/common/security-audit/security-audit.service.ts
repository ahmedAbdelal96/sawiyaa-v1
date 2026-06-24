import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditOutcome } from '@prisma/client';

export interface SecurityAuditEntry {
  /** Dot-notation action slug, e.g. 'security.permission.denied' */
  action: string;
  outcome: SecurityAuditOutcome;
  actorUserId?: string | null;
  actorRoles?: string[];
  resourceType?: string | null;
  resourceId?: string | null;
  targetUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  reason?: string | null;
  /** Additional context. MUST NOT contain tokens, passwords, OTPs, or secrets. */
  metadata?: Record<string, unknown> | null;
}

/**
 * Platform security audit log service.
 * Writes are fire-and-forget — this service NEVER throws.
 * Sensitive fields (tokens, passwords, OTPs) must be stripped before passing metadata.
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security-relevant event asynchronously.
   * Call sites do NOT need to await this.
   */
  logAsync(entry: SecurityAuditEntry): void {
    this.writeEntry(entry).catch((err: unknown) => {
      this.logger.error(
        'SecurityAuditService write failed (non-blocking)',
        err,
      );
    });
  }

  private async writeEntry(entry: SecurityAuditEntry): Promise<void> {
    await this.prisma.securityAuditLog.create({
      data: {
        action: entry.action,
        outcome: entry.outcome,
        actorUserId: entry.actorUserId ?? null,
        actorRolesJson: entry.actorRoles,
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        targetUserId: entry.targetUserId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ? entry.userAgent.substring(0, 500) : null,
        correlationId: entry.correlationId ?? null,
        reason: entry.reason ? entry.reason.substring(0, 500) : null,
        metadataJson: entry.metadata
          ? (this.sanitizeMetadata(entry.metadata) as object)
          : undefined,
      },
    });
  }

  /**
   * Strips known sensitive keys from metadata before persisting.
   * This is a last-resort safety net; callers are responsible for pre-sanitization.
   */
  private sanitizeMetadata(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const BANNED_KEYS = new Set([
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'idToken',
      'otp',
      'otpCode',
      'code',
      'secret',
      'apiKey',
      'apiSecret',
      'authorization',
      'cookie',
      'set-cookie',
      'credentials',
      'secretKey',
      'clientSecret',
      'providerSecret',
      'checkoutUrl',
      'rawBody',
      'payload',
      'body',
    ]);

    const sanitizeValue = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
      }

      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !BANNED_KEYS.has(key))
            .map(([key, nested]) => [key, sanitizeValue(nested)]),
        );
      }

      return value;
    };

    return sanitizeValue(raw) as Record<string, unknown>;
  }
}
