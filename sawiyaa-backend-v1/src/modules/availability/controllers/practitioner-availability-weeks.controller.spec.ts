import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { PractitionerOtpVerifiedGuard } from '@common/guards/practitioner/practitioner-otp-verified.guard';
import { PractitionerApprovedGuard } from '@common/guards/practitioner/practitioner-approved.guard';
import { PractitionerAvailabilityWeeksController } from './practitioner-availability-weeks.controller';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { GetMyAvailabilityWeeksUseCase } from '../use-cases/get-my-availability-weeks.use-case';
import { CreatePractitionerAvailabilityWeekUseCase } from '../use-cases/create-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from '../use-cases/update-practitioner-availability-week.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from '../use-cases/publish-practitioner-availability-week.use-case';
import { AvailabilityScheduleRepeatService } from '../services/availability-schedule-repeat.service';
import { GetPractitionerAvailabilityWeekDetailsUseCase } from '../use-cases/get-practitioner-availability-week-details.use-case';

describe('PractitionerAvailabilityWeeksController HTTP contracts', () => {
  let app: INestApplication;
  let authenticated = true;
  const repeat = {
    preview: jest.fn().mockResolvedValue({
      operationId: '12345678-1234-4234-8234-123456789012',
      expiresAt: '2026-07-23T10:10:00.000Z',
      sourceWeekId: 'source-1',
      timezone: 'Africa/Cairo',
      activeRange: { startWeekDate: '2026-07-19', endWeekDate: '2026-08-16' },
      targets: [{ weekStartDate: '2026-07-26', classification: 'ELIGIBLE', reasonCode: 'ELIGIBLE', copiedSlotCount: 1 }],
      confirmationAllowed: true,
    }),
    confirm: jest.fn().mockResolvedValue({
      operationId: '12345678-1234-4234-8234-123456789012',
      status: 'COMPLETED',
      targets: [{ weekStartDate: '2026-07-26', classification: 'ELIGIBLE', reasonCode: 'ELIGIBLE', copiedSlotCount: 1 }],
      warnings: [],
    }),
  };
  const details = {
    execute: jest.fn().mockResolvedValue({
      message: 'Session schedule details loaded successfully',
      week: { id: 'week-1', status: 'DRAFT', slots: [{ dayOfWeek: 0, startMinuteOfDay: 600, durationMinutes: 30 }] },
      canPublish: true,
      containsBookings: false,
      slotCount30Minutes: 1,
      slotCount60Minutes: 0,
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PractitionerAvailabilityWeeksController],
      providers: [
        { provide: GetMyAvailabilityWeeksUseCase, useValue: { execute: jest.fn() } },
        { provide: CreatePractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: PublishPractitionerAvailabilityWeekUseCase, useValue: { execute: jest.fn() } },
        { provide: AvailabilityScheduleRepeatService, useValue: repeat },
        { provide: GetPractitionerAvailabilityWeekDetailsUseCase, useValue: details },
      ],
    })
      .overrideGuard(JwtAccessAuthGuard)
      .useValue({ canActivate: (context: any) => { if (!authenticated) throw new UnauthorizedException(); context.switchToHttp().getRequest().user = { id: 'user-1', authMethod: 'access' }; return true; } })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ActiveAccountGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PractitionerOtpVerifiedGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PractitionerApprovedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  it('serves preview and confirmation through authenticated HTTP routes', async () => {
    const previewResponse = await request(app.getHttpServer())
      .post('/practitioners/me/availability/weeks/source-1/repeat/preview')
      .send({ targetWeekStartDates: ['2026-07-26'], idempotencyKey: 'repeat-key-1' })
      .expect(201);

    expect(previewResponse.body).toMatchObject({ success: true, data: { operationId: expect.any(String), targets: [{ reasonCode: 'ELIGIBLE' }] } });
    expect(previewResponse.body.data).not.toHaveProperty('currentWeek');
    expect(previewResponse.body.data).not.toHaveProperty('nextWeek');

    await request(app.getHttpServer())
      .post('/practitioners/me/availability/weeks/source-1/repeat/confirm')
      .send({ operationId: previewResponse.body.data.operationId, idempotencyKey: 'repeat-key-1' })
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe('COMPLETED'));

    expect(repeat.preview).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', sourceWeekId: 'source-1' }));
    expect(repeat.confirm).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', sourceWeekId: 'source-1' }));
  });

  it('does not expose the removed current-next and copy-to-next routes', async () => {
    await request(app.getHttpServer()).get('/practitioners/me/availability/weeks/current-next').expect(404);
    await request(app.getHttpServer()).post('/practitioners/me/availability/weeks/source-1/copy-to-next').expect(404);
  });

  it('serves owned lazy week details without exposing booking or patient data', async () => {
    await request(app.getHttpServer())
      .get('/practitioners/me/availability/weeks/week-1')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.week.id).toBe('week-1');
        expect(body.data.slotCount30Minutes).toBe(1);
        expect(body.data).not.toHaveProperty('patient');
        expect(body.data).not.toHaveProperty('bookingId');
      });
    expect(details.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', weekId: 'week-1' }));
  });

  it('returns 401 when the access guard rejects the request', async () => {
    authenticated = false;
    try {
      await request(app.getHttpServer()).post('/practitioners/me/availability/weeks/source-1/repeat/preview').send({ targetWeekStartDates: ['2026-07-26'], idempotencyKey: 'repeat-key-1' }).expect(401);
    } finally {
      authenticated = true;
    }
  });

  it('rejects malformed repeat input at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .post('/practitioners/me/availability/weeks/source-1/repeat/preview')
      .send({ targetWeekStartDates: ['not-a-date'], idempotencyKey: 'short' })
      .expect(400);
  });
});
