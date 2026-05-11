import { SecurityAuditService } from './security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';

describe('SecurityAuditService', () => {
  const createMock = jest.fn().mockResolvedValue({});
  const prisma = {
    securityAuditLog: {
      create: createMock,
    },
  };

  let service: SecurityAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityAuditService(prisma as never);
  });

  describe('logAsync', () => {
    it('calls prisma.securityAuditLog.create without blocking', async () => {
      service.logAsync({
        action: 'test.action',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: 'user-1',
      });

      // Give the microtask queue a chance to flush
      await new Promise((r) => setImmediate(r));

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'test.action',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorUserId: 'user-1',
          }),
        }),
      );
    });

    it('does not throw even when prisma rejects', async () => {
      createMock.mockRejectedValueOnce(new Error('DB down'));

      expect(() =>
        service.logAsync({
          action: 'test.fail',
          outcome: SecurityAuditOutcome.FAILURE,
        }),
      ).not.toThrow();

      await new Promise((r) => setImmediate(r));
    });

    it('truncates userAgent and reason to 500 chars', async () => {
      const longStr = 'x'.repeat(600);
      service.logAsync({
        action: 'test.truncate',
        outcome: SecurityAuditOutcome.SUCCESS,
        userAgent: longStr,
        reason: longStr,
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as { data: Record<string, any> };
      expect(call.data.userAgent).toHaveLength(500);
      expect(call.data.reason).toHaveLength(500);
    });
  });

  describe('sanitizeMetadata (via logAsync)', () => {
    const BANNED_KEYS = [
      'password',
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
      'credentials',
    ];

    it.each(BANNED_KEYS)('strips "%s" from metadata', async (key) => {
      service.logAsync({
        action: 'test.sanitize',
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { [key]: 'sensitive-value', safeKey: 'safe-value' },
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as { data: Record<string, any> };
      expect(call.data.metadataJson).not.toHaveProperty(key);
      expect(call.data.metadataJson).toHaveProperty('safeKey', 'safe-value');
    });

    it('keeps non-sensitive keys in metadata', async () => {
      service.logAsync({
        action: 'test.keep',
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { userId: 'u1', action: 'click', count: 3 },
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as { data: Record<string, any> };
      expect(call.data.metadataJson).toEqual({
        userId: 'u1',
        action: 'click',
        count: 3,
      });
    });

    it('stores undefined metadataJson when no metadata is provided', async () => {
      service.logAsync({
        action: 'test.no-meta',
        outcome: SecurityAuditOutcome.SUCCESS,
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as { data: Record<string, any> };
      expect(call.data.metadataJson).toBeUndefined();
    });
  });
});
