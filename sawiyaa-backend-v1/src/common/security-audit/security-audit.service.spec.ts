import { SecurityAuditService } from './security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';

describe('SecurityAuditService', () => {
  const createMock = jest.fn().mockResolvedValue({});
  const repository = { create: createMock };

  let service: SecurityAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecurityAuditService(repository as never);
  });

  describe('logAsync', () => {
    it('calls the append-only repository without blocking', async () => {
      service.logAsync({
        action: 'test.action',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: 'user-1',
      });

      // Give the microtask queue a chance to flush
      await new Promise((r) => setImmediate(r));

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
            action: 'test.action',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorUserId: 'user-1',
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

      const call = createMock.mock.calls[0][0] as Record<string, any>;
      expect(call.userAgent).toHaveLength(500);
      expect(call.reason).toHaveLength(500);
    });
  });

  describe('recordRequired', () => {
    it('writes through the supplied transaction client', async () => {
      const tx = { securityAuditLog: { create: jest.fn() } };

      await service.recordRequired(tx as never, {
        action: 'test.required',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: 'user-1',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'test.required' }),
        tx,
      );
    });

    it('propagates required-write failures to the transaction caller', async () => {
      createMock.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        service.recordRequired({} as never, {
          action: 'test.required.fail',
          outcome: SecurityAuditOutcome.SUCCESS,
        }),
      ).rejects.toThrow('DB down');
    });

    it('rejects a USER actor without an actor id', async () => {
      await expect(
        service.recordRequired({} as never, {
          action: 'test.invalid-actor',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: 'USER' as never,
        }),
      ).rejects.toThrow('USER actor requires actorUserId');
      expect(createMock).not.toHaveBeenCalled();
    });

    it('rejects oversized sanitized metadata', async () => {
      await expect(
        service.recordRequired({} as never, {
          action: 'test.large-metadata',
          outcome: SecurityAuditOutcome.SUCCESS,
          metadata: { details: 'x'.repeat(33 * 1024) },
        }),
      ).rejects.toThrow('metadata exceeds');
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

      const call = createMock.mock.calls[0][0] as Record<string, any>;
      expect(call.metadataJson).not.toHaveProperty(key);
      expect(call.metadataJson).toHaveProperty('safeKey', 'safe-value');
    });

    it('keeps non-sensitive keys in metadata', async () => {
      service.logAsync({
        action: 'test.keep',
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { userId: 'u1', action: 'click', count: 3 },
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as Record<string, any>;
      expect(call.metadataJson).toEqual({
        userId: 'u1',
        action: 'click',
        count: 3,
      });
    });

    it('strips nested sensitive keys recursively', async () => {
      service.logAsync({
        action: 'test.nested',
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: {
          actor: {
            userId: 'u1',
            password: 'secret',
          },
          items: [
            {
              refreshToken: 'refresh-secret',
              safe: true,
            },
          ],
        },
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as Record<string, any>;
      expect(call.metadataJson).toEqual({
        actor: {
          userId: 'u1',
        },
        items: [
          {
            safe: true,
          },
        ],
      });
    });

    it('stores undefined metadataJson when no metadata is provided', async () => {
      service.logAsync({
        action: 'test.no-meta',
        outcome: SecurityAuditOutcome.SUCCESS,
      });

      await new Promise((r) => setImmediate(r));

      const call = createMock.mock.calls[0][0] as Record<string, any>;
      expect(call.metadataJson).toBeUndefined();
    });
  });
});
