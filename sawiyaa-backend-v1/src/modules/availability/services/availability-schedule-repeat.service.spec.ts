import { AvailabilityScheduleRepeatService } from './availability-schedule-repeat.service';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';

describe('AvailabilityScheduleRepeatService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-06-24T10:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('previews an eligible future week without creating a schedule record', async () => {
    const source = {
      id: 'source-week',
      weekStartDate: new Date('2026-06-21T00:00:00.000Z'),
      weekEndDate: new Date('2026-06-27T00:00:00.000Z'),
      timezone: 'Africa/Cairo',
      status: AvailabilityWeekStatus.PUBLISHED,
      slots: [{ weekday: AvailabilityWeekday.MONDAY, startMinuteOfDay: 600, endMinuteOfDay: 630, durationMinutes: 30 }],
    };
    const operationCreate = jest.fn().mockResolvedValue({ id: 'operation-1' });
    const prisma = {
      availabilityScheduleRepeatOperation: { findUnique: jest.fn().mockResolvedValue(null), create: operationCreate },
      session: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const practitionerRepository = { findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1', user: { timezone: 'Africa/Cairo' } }) };
    const weekRepository = { findByIdForPractitioner: jest.fn().mockResolvedValue(source), findManyByPractitionerAndWeekStarts: jest.fn().mockResolvedValue([]) };
    const service = new AvailabilityScheduleRepeatService(
      prisma as never,
      practitionerRepository as never,
      weekRepository as never,
      new AvailabilityWeekCalendarService(),
      { get: jest.fn() } as never,
    );

    const result = await service.preview({ userId: 'user-1', sourceWeekId: 'source-week', targetWeekStartDates: ['2026-06-28'], idempotencyKey: 'repeat-key-1' });

    expect(result.operationId).toBe('operation-1');
    expect(result.targets).toEqual([{ weekStartDate: '2026-06-28', reasonCode: 'ELIGIBLE', classification: 'ELIGIBLE', copiedSlotCount: 1 }]);
    expect(operationCreate).toHaveBeenCalledTimes(1);
    expect(prisma.session.findMany).toHaveBeenCalledTimes(1);
  });

  it('confirms multiple independent DRAFT weeks and records provenance', async () => {
    const source = buildSource();
    const operation = buildOperation(source.id, {
      selectedTargetWeekDates: ['2026-06-28', '2026-07-05'],
      previewPayload: { targets: [eligibleTarget('2026-06-28'), eligibleTarget('2026-07-05')] },
    });
    const inserted = [
      { id: 'target-a', weekStartDate: new Date('2026-06-28T00:00:00.000Z') },
      { id: 'target-b', weekStartDate: new Date('2026-07-05T00:00:00.000Z') },
    ];
    const tx = {
      session: { findMany: jest.fn().mockResolvedValue([]) },
      practitionerAvailabilityWeek: { createManyAndReturn: jest.fn().mockResolvedValue(inserted) },
      practitionerAvailabilityWeekSlot: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      availabilityScheduleRepeatOperation: { update: jest.fn().mockResolvedValue(operation) },
    };
    const prisma = {
      availabilityScheduleRepeatOperation: {
        findFirst: jest.fn().mockResolvedValue(operation),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
      session: { findMany: jest.fn() },
    };
    const service = buildService(prisma, source);
    operation.sourceFingerprint = (service as any).sourceFingerprint(source);

    const result = await service.confirm({ userId: 'user-1', sourceWeekId: source.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey });

    expect(result.status).toBe('COMPLETED');
    expect(tx.practitionerAvailabilityWeek.createManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: expect.arrayContaining([expect.objectContaining({ status: 'DRAFT', copiedFromWeekId: source.id })]) }));
    expect(tx.practitionerAvailabilityWeekSlot.createMany).toHaveBeenCalledTimes(2);
    expect(tx.practitionerAvailabilityWeekSlot.createMany.mock.calls.flatMap(([input]) => input.data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ durationMinutes: 30, startMinuteOfDay: 600 }),
      expect.objectContaining({ durationMinutes: 60, startMinuteOfDay: 600 }),
    ]));
    expect(tx.availabilityScheduleRepeatOperation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }));
  });

  it('rejects confirmation when the source fingerprint changed and stores safe failure metadata', async () => {
    const source = buildSource();
    const operation = buildOperation(source.id, { sourceFingerprint: 'old-fingerprint' });
    const update = jest.fn().mockResolvedValue(operation);
    const prisma = {
      availabilityScheduleRepeatOperation: { findFirst: jest.fn().mockResolvedValue(operation), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update },
      $transaction: jest.fn(),
      session: { findMany: jest.fn() },
    };
    const service = buildService(prisma, source);

    await expect(service.confirm({ userId: 'user-1', sourceWeekId: source.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey })).rejects.toMatchObject({ response: { errorCode: 'SOURCE_CHANGED_SINCE_PREVIEW' } });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', safeErrorMetadata: { reasonCode: 'SOURCE_CHANGED_SINCE_PREVIEW' } }) }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replays processing/completed state instead of starting a second transaction', async () => {
    const source = buildSource();
    const operation = buildOperation(source.id, { status: 'PROCESSING' });
    const prisma = {
      availabilityScheduleRepeatOperation: { findFirst: jest.fn().mockResolvedValue(operation), findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
      session: { findMany: jest.fn() },
    };
    const service = buildService(prisma, source);

    await expect(service.confirm({ userId: 'user-1', sourceWeekId: source.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey })).rejects.toMatchObject({ response: { errorCode: 'REPEAT_IN_PROGRESS' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fingerprints source slots deterministically regardless of database row order', () => {
    const first = buildSource();
    const second = { ...first, slots: [...first.slots].reverse() };
    const service = buildService({}, first);

    expect((service as any).sourceFingerprint(first)).toBe((service as any).sourceFingerprint(second));
  });

  it('rejects the same idempotency key when the normalized request differs', async () => {
    const source = buildSource();
    const operation = buildOperation(source.id, { requestFingerprint: 'different-request' });
    const prisma = {
      availabilityScheduleRepeatOperation: { findUnique: jest.fn().mockResolvedValue(operation) },
      session: { findMany: jest.fn() },
    };
    const service = buildService(prisma, source);

    await expect(service.preview({ userId: 'user-1', sourceWeekId: source.id, targetWeekStartDates: ['2026-06-28'], idempotencyKey: operation.idempotencyKey })).rejects.toMatchObject({ response: { errorCode: 'IDEMPOTENCY_CONFLICT' } });
  });

  it('replays a completed result without opening another transaction', async () => {
    const source = buildSource();
    const storedResult = { operationId: 'operation-1', status: 'COMPLETED', targets: [], warnings: [] };
    const operation = buildOperation(source.id, { resultPayload: storedResult });
    const prisma = {
      availabilityScheduleRepeatOperation: { findFirst: jest.fn().mockResolvedValue(operation), updateMany: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(),
      session: { findMany: jest.fn() },
    };
    const service = buildService(prisma, source);

    await expect(service.confirm({ userId: 'user-1', sourceWeekId: source.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey })).resolves.toBe(storedResult);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores a safe failed result when the transaction throws', async () => {
    const source = buildSource();
    const operation = buildOperation(source.id);
    const update = jest.fn().mockResolvedValue(operation);
    const service = buildService({
      availabilityScheduleRepeatOperation: { findFirst: jest.fn().mockResolvedValue(operation), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update },
      $transaction: jest.fn().mockRejectedValue(new Error('database failure with secret details')),
      session: { findMany: jest.fn() },
    }, source);
    operation.sourceFingerprint = (service as any).sourceFingerprint(source);

    await expect(service.confirm({ userId: 'user-1', sourceWeekId: source.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey })).rejects.toThrow('database failure');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', safeErrorMetadata: { reasonCode: 'REPEAT_FAILED' }, resultPayload: expect.objectContaining({ warnings: ['REPEAT_FAILED'] }) }) }));
    expect(JSON.stringify(update.mock.calls[0])).not.toContain('database failure with secret details');
  });
});

function buildSource() {
  return {
    id: 'source-week',
    weekStartDate: new Date('2026-06-21T00:00:00.000Z'),
    weekEndDate: new Date('2026-06-27T00:00:00.000Z'),
    timezone: 'Africa/Cairo',
    status: 'PUBLISHED',
    slots: [
      { weekday: AvailabilityWeekday.MONDAY, startMinuteOfDay: 600, endMinuteOfDay: 630, durationMinutes: 30 },
      { weekday: AvailabilityWeekday.MONDAY, startMinuteOfDay: 600, endMinuteOfDay: 660, durationMinutes: 60 },
    ],
  } as any;
}

function eligibleTarget(weekStartDate: string) {
  return { weekStartDate, reasonCode: 'ELIGIBLE', classification: 'ELIGIBLE', copiedSlotCount: 1 };
}

function buildOperation(sourceWeekId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'operation-1',
    practitionerId: 'practitioner-1',
    sourceWeekId,
    idempotencyKey: 'repeat-key-1',
    requestFingerprint: 'request-fingerprint',
    sourceFingerprint: (overrides.sourceFingerprint as string) ?? '',
    selectedTargetWeekDates: ['2026-06-28'],
    previewPayload: { targets: [eligibleTarget('2026-06-28')] },
    resultPayload: null,
    status: 'PREVIEWED',
    expiresAt: new Date('2026-06-24T10:10:00.000Z'),
    ...overrides,
  } as any;
}

function buildService(prisma: any, source: any) {
  return new AvailabilityScheduleRepeatService(
    prisma,
    { findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1', user: { timezone: 'Africa/Cairo' } }) } as never,
    { findByIdForPractitioner: jest.fn().mockResolvedValue(source), findManyByPractitionerAndWeekStarts: jest.fn().mockResolvedValue([]) } as never,
    new AvailabilityWeekCalendarService(),
    { get: jest.fn() } as never,
  );
}
