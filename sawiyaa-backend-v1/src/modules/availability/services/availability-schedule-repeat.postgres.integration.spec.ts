import {
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  PrismaClient,
} from '@prisma/client';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { PractitionerOtpVerifiedGuard } from '@common/guards/practitioner/practitioner-otp-verified.guard';
import { PractitionerApprovedGuard } from '@common/guards/practitioner/practitioner-approved.guard';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { PractitionerAvailabilityWeeksController } from '../controllers/practitioner-availability-weeks.controller';
import { GetMyAvailabilityWeeksUseCase } from '../use-cases/get-my-availability-weeks.use-case';
import { CreatePractitionerAvailabilityWeekUseCase } from '../use-cases/create-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from '../use-cases/update-practitioner-availability-week.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from '../use-cases/publish-practitioner-availability-week.use-case';
import { GetPractitionerAvailabilityWeekDetailsUseCase } from '../use-cases/get-practitioner-availability-week-details.use-case';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityScheduleRepeatService } from './availability-schedule-repeat.service';

const databaseUrl = process.env.AVAILABILITY_REPEAT_TEST_DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;

describeIntegration('Availability schedule repeat PostgreSQL integration', () => {
  let prisma: PrismaClient;
  let service: AvailabilityScheduleRepeatService;
  let calendar: AvailabilityWeekCalendarService;
  const fixtures: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    calendar = new AvailabilityWeekCalendarService();
    service = new AvailabilityScheduleRepeatService(
      prisma as never,
      new AvailabilityPractitionerRepository(prisma as never),
      new PractitionerAvailabilityWeekRepository(prisma as never),
      calendar,
      { get: jest.fn() } as never,
    );
  });

  afterAll(async () => {
    for (const practitionerId of fixtures.reverse()) {
      await prisma.availabilityScheduleRepeatOperation.deleteMany({ where: { practitionerId } });
      await prisma.practitionerAvailabilityWeek.deleteMany({ where: { practitionerId } });
      const practitioner = await prisma.practitionerProfile.findUnique({ where: { id: practitionerId }, select: { userId: true } });
      await prisma.practitionerProfile.delete({ where: { id: practitionerId } });
      if (practitioner) await prisma.user.delete({ where: { id: practitioner.userId } });
    }
    await prisma.$disconnect();
  });

  async function createFixture(input: { timezone?: string; slot?: { weekday: AvailabilityWeekday; startMinuteOfDay: number; endMinuteOfDay: number } } = {}) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timezone = input.timezone ?? 'Africa/Cairo';
    const slot = input.slot ?? { weekday: AvailabilityWeekday.MONDAY, startMinuteOfDay: 600, endMinuteOfDay: 630 };
    const user = await prisma.user.create({ data: { displayName: `Repeat integration ${suffix}`, timezone } });
    const practitioner = await prisma.practitionerProfile.create({ data: { userId: user.id, publicSlug: `repeat-${suffix}` } });
    const window = calendar.getActiveWindow({ timezone, now: (service as any).getNow() });
    const source = await prisma.practitionerAvailabilityWeek.create({
      data: {
        practitionerId: practitioner.id,
        weekStartDate: window.weeks[0].startDate,
        weekEndDate: window.weeks[0].endDate,
        timezone,
        status: AvailabilityWeekStatus.PUBLISHED,
        slots: { create: [{ weekday: slot.weekday, startMinuteOfDay: slot.startMinuteOfDay, endMinuteOfDay: slot.endMinuteOfDay, durationMinutes: slot.endMinuteOfDay - slot.startMinuteOfDay, timezone }] },
      },
      include: { slots: true },
    });
    fixtures.push(practitioner.id);
    return { user, practitioner, source, window };
  }

  async function preview(fixture: Awaited<ReturnType<typeof createFixture>>, key: string, targets = [1, 2]) {
    return service.preview({
      userId: fixture.user.id,
      sourceWeekId: fixture.source.id,
      targetWeekStartDates: targets.map((index) => fixture.window.weeks[index].startDateIso),
      idempotencyKey: key,
    });
  }

  it('deduplicates same-operation concurrent confirmation and preserves exact row counts', async () => {
    const fixture = await createFixture();
    const operation = await preview(fixture, `same-${fixture.source.id}`, [1, 2]);

    const results = await Promise.allSettled([
      service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `same-${fixture.source.id}` }),
      service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `same-${fixture.source.id}` }),
    ]);
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(fulfilled[1]?.value).toEqual(fulfilled[0].value);
    expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(3);
    expect(await prisma.practitionerAvailabilityWeekSlot.count({ where: { week: { practitionerId: fixture.practitioner.id } } })).toBe(3);
    expect(await prisma.availabilityScheduleRepeatOperation.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(1);
    expect(await prisma.availabilityScheduleRepeatOperation.findUnique({ where: { id: operation.operationId }, select: { status: true } })).toMatchObject({ status: 'COMPLETED' });
  });

  it('uses the permanent practitioner/idempotency unique key for concurrent preview creation', async () => {
    const fixture = await createFixture();
    const key = `preview-race-${fixture.source.id}`;
    const results = await Promise.all([
      preview(fixture, key, [1]),
      preview(fixture, key, [1]),
    ]);

    expect(results[0].operationId).toBe(results[1].operationId);
    expect(await prisma.availabilityScheduleRepeatOperation.count({ where: { practitionerId: fixture.practitioner.id, idempotencyKey: key } })).toBe(1);
  });

  it('handles different idempotency keys targeting the same weeks as a business skip', async () => {
    const fixture = await createFixture();
    const first = await preview(fixture, `first-${fixture.source.id}`, [1, 2]);
    const second = await preview(fixture, `second-${fixture.source.id}`, [1, 2]);

    const results = await Promise.all([
      service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: first.operationId, idempotencyKey: `first-${fixture.source.id}` }),
      service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: second.operationId, idempotencyKey: `second-${fixture.source.id}` }),
    ]);
    expect(results.flatMap((result) => result.targets).some((target) => target.reasonCode === 'TARGET_CHANGED_SINCE_PREVIEW')).toBe(true);
    expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(3);
    expect(await prisma.practitionerAvailabilityWeekSlot.count({ where: { week: { practitionerId: fixture.practitioner.id } } })).toBe(3);
  });

  it('rolls back all target weeks when a deterministic PostgreSQL trigger fails the second slot write', async () => {
    const fixture = await createFixture();
    const secondTarget = fixture.window.weeks[2].startDateIso;
    const operation = await preview(fixture, `rollback-${fixture.source.id}`, [1, 2]);
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION repeat_test_fail_second_target() RETURNS trigger AS $$ BEGIN IF EXISTS (SELECT 1 FROM "PractitionerAvailabilityWeek" w WHERE w.id = NEW."weekId" AND w."weekStartDate" = '${secondTarget}'::date) THEN RAISE EXCEPTION 'repeat integration forced failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER repeat_test_fail_second_target_trigger BEFORE INSERT ON "PractitionerAvailabilityWeekSlot" FOR EACH ROW EXECUTE FUNCTION repeat_test_fail_second_target();');
    try {
      await expect(service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `rollback-${fixture.source.id}` })).rejects.toThrow('repeat integration forced failure');
      expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(1);
      expect(await prisma.practitionerAvailabilityWeekSlot.count({ where: { week: { practitionerId: fixture.practitioner.id } } })).toBe(1);
      expect(await prisma.availabilityScheduleRepeatOperation.findUnique({ where: { id: operation.operationId }, select: { status: true, resultPayload: true, safeErrorMetadata: true } })).toMatchObject({ status: 'FAILED', safeErrorMetadata: { reasonCode: 'REPEAT_FAILED' } });
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS repeat_test_fail_second_target_trigger ON "PractitionerAvailabilityWeekSlot";');
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS repeat_test_fail_second_target();');
    }
  });

  it('skips a target created after preview and continues with another target', async () => {
    const fixture = await createFixture();
    const operation = await preview(fixture, `target-race-${fixture.source.id}`, [1, 2]);
    const target = fixture.window.weeks[1];
    await prisma.practitionerAvailabilityWeek.create({ data: { practitionerId: fixture.practitioner.id, weekStartDate: target.startDate, weekEndDate: target.endDate, timezone: 'Africa/Cairo', status: AvailabilityWeekStatus.DRAFT } });

    const result = await service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `target-race-${fixture.source.id}` });

    expect(result.targets).toEqual(expect.arrayContaining([expect.objectContaining({ weekStartDate: target.startDateIso, reasonCode: 'TARGET_CHANGED_SINCE_PREVIEW', classification: 'SKIPPED' })]));
    expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(3);
  });

  it('rejects confirmation after the persisted source slots change', async () => {
    const fixture = await createFixture();
    const operation = await preview(fixture, `source-change-${fixture.source.id}`, [1]);
    await prisma.practitionerAvailabilityWeekSlot.updateMany({ where: { weekId: fixture.source.id }, data: { startMinuteOfDay: 601 } });

    await expect(service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `source-change-${fixture.source.id}` })).rejects.toMatchObject({ response: { errorCode: 'SOURCE_CHANGED_SINCE_PREVIEW' } });
    expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(1);
  });

  it('enforces source ownership through the database-backed repository', async () => {
    const owner = await createFixture();
    const other = await createFixture();

    await expect(service.preview({ userId: other.user.id, sourceWeekId: owner.source.id, targetWeekStartDates: [owner.window.weeks[1].startDateIso], idempotencyKey: `ownership-${owner.source.id}` })).rejects.toMatchObject({ response: { errorCode: 'SOURCE_NOT_FOUND' } });
  });

  it('proves the repeat HTTP envelope and ownership against PostgreSQL', async () => {
    const owner = await createFixture();
    const other = await createFixture();
    const module = await Test.createTestingModule({
      controllers: [PractitionerAvailabilityWeeksController],
      providers: [
        { provide: GetMyAvailabilityWeeksUseCase, useValue: { execute: jest.fn() } },
        { provide: CreatePractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: PublishPractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPractitionerAvailabilityWeekDetailsUseCase, useValue: { execute: jest.fn() } },
        { provide: AvailabilityScheduleRepeatService, useValue: service },
      ],
    })
      .overrideGuard(JwtAccessAuthGuard)
      .useValue({ canActivate: (context: any) => { context.switchToHttp().getRequest().user = { id: owner.user.id, authMethod: 'access' }; return true; } })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ActiveAccountGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PractitionerOtpVerifiedGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PractitionerApprovedGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app: INestApplication = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    try {
      const response = await request(app.getHttpServer())
        .post(`/practitioners/me/availability/weeks/${owner.source.id}/repeat/preview`)
        .send({ targetWeekStartDates: [owner.window.weeks[1].startDateIso], idempotencyKey: `http-${owner.source.id}` })
        .expect(201);
      expect(response.body).toMatchObject({ success: true, data: { targets: [{ reasonCode: 'ELIGIBLE' }] } });
      expect(response.body.data).not.toHaveProperty('currentWeek');
      expect(response.body.data).not.toHaveProperty('nextWeek');

      await request(app.getHttpServer())
        .post(`/practitioners/me/availability/weeks/${other.source.id}/repeat/preview`)
        .send({ targetWeekStartDates: [other.window.weeks[1].startDateIso], idempotencyKey: `http-owner-${other.source.id}` })
        .expect(404);
    } finally {
      await app.close();
    }
  });

  it('rejects a persisted spring-forward local time at preview and confirmation', async () => {
    const originalNow = (service as any).getNow;
    (service as any).getNow = () => new Date('2026-03-01T12:00:00.000Z');
    try {
      const fixture = await createFixture({ timezone: 'America/New_York', slot: { weekday: AvailabilityWeekday.SUNDAY, startMinuteOfDay: 150, endMinuteOfDay: 180 } });
      const operation = await preview(fixture, `spring-${fixture.source.id}`, [1]);
      expect(operation.targets[0]).toMatchObject({ reasonCode: 'DST_INVALID_TIME', classification: 'INVALID' });
      const result = await service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `spring-${fixture.source.id}` });
      expect(result.targets[0]).toMatchObject({ reasonCode: 'DST_INVALID_TIME', classification: 'INVALID' });
      expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(1);
    } finally {
      (service as any).getNow = originalNow;
    }
  });

  it('rejects a persisted fall-back ambiguous local time at preview and confirmation', async () => {
    const originalNow = (service as any).getNow;
    (service as any).getNow = () => new Date('2026-10-25T12:00:00.000Z');
    try {
      const fixture = await createFixture({ timezone: 'America/New_York', slot: { weekday: AvailabilityWeekday.SUNDAY, startMinuteOfDay: 90, endMinuteOfDay: 120 } });
      const operation = await preview(fixture, `fall-${fixture.source.id}`, [1]);
      expect(operation.targets[0]).toMatchObject({ reasonCode: 'DST_AMBIGUOUS_TIME', classification: 'INVALID' });
      const result = await service.confirm({ userId: fixture.user.id, sourceWeekId: fixture.source.id, operationId: operation.operationId, idempotencyKey: `fall-${fixture.source.id}` });
      expect(result.targets[0]).toMatchObject({ reasonCode: 'DST_AMBIGUOUS_TIME', classification: 'INVALID' });
      expect(await prisma.practitionerAvailabilityWeek.count({ where: { practitionerId: fixture.practitioner.id } })).toBe(1);
    } finally {
      (service as any).getNow = originalNow;
    }
  });
});
