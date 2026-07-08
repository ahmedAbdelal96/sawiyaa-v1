import { BadRequestException, ConflictException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';
import { AvailabilitySlotEditabilityService } from '../services/availability-slot-editability.service';
import { CreatePractitionerAvailabilityWeekUseCase } from './create-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from './update-practitioner-availability-week.use-case';
import { CopyPractitionerAvailabilityWeekToNextUseCase } from './copy-practitioner-availability-week-to-next.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from './publish-practitioner-availability-week.use-case';

describe('Availability week management use-cases', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as AvailabilityPractitionerRepository;

  const weekRepository = {
    findByPractitionerAndWeekStartDate: jest.fn(),
    findByIdForPractitioner: jest.fn(),
    createDraftWeek: jest.fn(),
    updateWeek: jest.fn(),
    syncWeekSlotsTimezone: jest.fn(),
    updateDraftWeekSlots: jest.fn(),
    publishWeek: jest.fn(),
  } as unknown as PractitionerAvailabilityWeekRepository;

  const prisma = {
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({} as never),
    ),
    session: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const i18nService = {
    t: jest.fn((key: string) => key),
  } as unknown as I18nService;

  const mapper = new AvailabilityWeekMapper();
  const calendarService = new AvailabilityWeekCalendarService();
  const overviewService = {
    buildForPractitioner: jest.fn(),
  } as unknown as AvailabilityWeekOverviewService;
  const overlapService = new ValidateAvailabilityOverlapService();
  const editabilityService = {
    calculateEditability: jest.fn(async () => new Map()),
  } as unknown as AvailabilitySlotEditabilityService;

  const createUseCase = new CreatePractitionerAvailabilityWeekUseCase(
    weekRepository,
    practitionerRepository,
    calendarService,
    overviewService,
    mapper,
    overlapService,
    i18nService,
  );

  const updateUseCase = new UpdatePractitionerAvailabilityWeekUseCase(
    prisma,
    weekRepository,
    practitionerRepository,
    overviewService,
    mapper,
    overlapService,
    calendarService,
    editabilityService,
    i18nService,
  );

  const copyUseCase = new CopyPractitionerAvailabilityWeekToNextUseCase(
    prisma,
    weekRepository,
    practitionerRepository,
    calendarService,
    overviewService,
    mapper,
    overlapService,
    i18nService,
  );

  const publishUseCase = new PublishPractitionerAvailabilityWeekUseCase(
    weekRepository,
    practitionerRepository,
    overviewService,
    mapper,
    i18nService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a fresh draft week successfully', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByPractitionerAndWeekStartDate as jest.Mock).mockResolvedValue(null);
    (weekRepository.createDraftWeek as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );
    (overviewService.buildForPractitioner as jest.Mock).mockResolvedValue(
      buildOverview(),
    );

    const result = await createUseCase.execute({
      userId: 'user-1',
      locale: 'en',
      weekStartDate: '2026-06-21',
      timezone: 'Africa/Cairo',
      slots: [
        {
          dayOfWeek: 0,
          durationMinutes: 30,
          startMinuteOfDay: 600,
          endMinuteOfDay: 630,
        },
      ],
    });

    expect(result.message).toBe('availability.success.weekCreated');
    expect(result.week.status).toBe(AvailabilityWeekStatus.DRAFT);
    expect(weekRepository.createDraftWeek).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate weeks with a friendly conflict', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByPractitionerAndWeekStartDate as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );

    await expect(
      createUseCase.execute({
        userId: 'user-1',
        locale: 'en',
        weekStartDate: '2026-06-21',
        timezone: 'Africa/Cairo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a draft week inside a transaction', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );
    (weekRepository.updateWeek as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );
    (weekRepository.updateDraftWeekSlots as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );
    (overviewService.buildForPractitioner as jest.Mock).mockResolvedValue(
      buildOverview(),
    );

    const result = await updateUseCase.execute({
      userId: 'user-1',
      locale: 'en',
      weekId: 'week-1',
      timezone: 'Africa/Cairo',
      slots: [
        {
          dayOfWeek: 0,
          durationMinutes: 60,
          startMinuteOfDay: 660,
          endMinuteOfDay: 720,
        },
      ],
    });

    expect(result.week.status).toBe(AvailabilityWeekStatus.DRAFT);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(weekRepository.updateDraftWeekSlots).toHaveBeenCalledTimes(1);
  });

  it('copies a week to the next week as a draft', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.PUBLISHED),
    );
    (weekRepository.findByPractitionerAndWeekStartDate as jest.Mock).mockResolvedValue(null);
    (weekRepository.createDraftWeek as jest.Mock).mockResolvedValue(
      buildWeek('week-2', '2026-06-28', AvailabilityWeekStatus.DRAFT),
    );
    (overviewService.buildForPractitioner as jest.Mock).mockResolvedValue(
      buildOverview(),
    );

    const result = await copyUseCase.execute({
      userId: 'user-1',
      locale: 'en',
      weekId: 'week-1',
    });

    expect(result.week.id).toBe('week-2');
    expect(weekRepository.createDraftWeek).toHaveBeenCalledTimes(1);
  });

  it('rejects publishing an empty draft week', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT, []),
    );

    await expect(
      publishUseCase.execute({
        userId: 'user-1',
        locale: 'en',
        weekId: 'week-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a draft week successfully', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.DRAFT),
    );
    (weekRepository.publishWeek as jest.Mock).mockResolvedValue(
      buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.PUBLISHED),
    );
    (overviewService.buildForPractitioner as jest.Mock).mockResolvedValue(
      buildOverview(),
    );

    const result = await publishUseCase.execute({
      userId: 'user-1',
      locale: 'en',
      weekId: 'week-1',
    });

    expect(result.week.status).toBe(AvailabilityWeekStatus.PUBLISHED);
    expect(weekRepository.publishWeek).toHaveBeenCalledWith('week-1');
  });

  it('updates a PUBLISHED week successfully when no locked slots are changed', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    const slots = [
      {
        id: 'slot-1',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 600,
        endMinuteOfDay: 630,
        durationMinutes: 30,
        timezone: 'Africa/Cairo',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const week = buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.PUBLISHED, slots);
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(week);
    (weekRepository.updateWeek as jest.Mock).mockResolvedValue(week);
    (weekRepository.updateDraftWeekSlots as jest.Mock).mockResolvedValue(week);
    (overviewService.buildForPractitioner as jest.Mock).mockResolvedValue(buildOverview());

    // Mock slot 1 as NOT locked
    const editabilityMap = new Map();
    editabilityMap.set('0_30_600_630', {
      signature: '0_30_600_630',
      canEdit: true,
      canRemove: true,
      isPast: false,
      isBookedOrReserved: false,
    });
    (editabilityService.calculateEditability as jest.Mock).mockResolvedValue(editabilityMap);

    const result = await updateUseCase.execute({
      userId: 'user-1',
      locale: 'en',
      weekId: 'week-1',
      timezone: 'Africa/Cairo',
      slots: [], // We removed it because it's not locked!
    });

    expect(result.week).toBeDefined();
  });

  it('rejects updating a PUBLISHED week if a locked slot is removed', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    const slots = [
      {
        id: 'slot-1',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 600,
        endMinuteOfDay: 630,
        durationMinutes: 30,
        timezone: 'Africa/Cairo',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const week = buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.PUBLISHED, slots);
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(week);

    // Mock slot 1 as locked (booked)
    const editabilityMap = new Map();
    editabilityMap.set('0_30_600_630', {
      signature: '0_30_600_630',
      canEdit: false,
      canRemove: false,
      isPast: false,
      isBookedOrReserved: true,
      reasonCode: 'BOOKED',
    });
    (editabilityService.calculateEditability as jest.Mock).mockResolvedValue(editabilityMap);

    await expect(
      updateUseCase.execute({
        userId: 'user-1',
        locale: 'en',
        weekId: 'week-1',
        timezone: 'Africa/Cairo',
        slots: [], // Removed the locked slot!
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects timezone modification on a PUBLISHED week', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
      user: { timezone: 'Africa/Cairo' },
    });
    const week = buildWeek('week-1', '2026-06-21', AvailabilityWeekStatus.PUBLISHED);
    (weekRepository.findByIdForPractitioner as jest.Mock).mockResolvedValue(week);

    await expect(
      updateUseCase.execute({
        userId: 'user-1',
        locale: 'en',
        weekId: 'week-1',
        timezone: 'Europe/Paris', // Changing timezone!
        slots: [],
      }),
    ).rejects.toThrow(ConflictException);
  });
});

function buildOverview() {
  return {
    timezone: 'Africa/Cairo',
    currentWeek: {
      id: 'current',
      weekStartDate: '2026-06-21',
      weekEndDate: '2026-06-27',
      timezone: 'Africa/Cairo',
      status: AvailabilityWeekStatus.DRAFT,
      copiedFromWeekId: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
      isEditable: true,
      hasSlots: true,
      slots: [],
    },
    nextWeek: {
      id: 'next',
      weekStartDate: '2026-06-28',
      weekEndDate: '2026-07-04',
      timezone: 'Africa/Cairo',
      status: 'NOT_SET' as const,
      copiedFromWeekId: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: null,
      updatedAt: null,
      isEditable: false,
      hasSlots: false,
      slots: [],
    },
    shouldPromptForNextWeek: true,
    daysUntilCurrentWeekEnds: 3,
    nextWeekPublished: false,
    reminderState: 'DRAFT_EXISTS' as const,
  };
}

function buildWeek(
  id: string,
  startDate: string,
  status: AvailabilityWeekStatus,
  slots: Array<{
    id: string;
    weekId: string;
    weekday: AvailabilityWeekday;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
    durationMinutes: number;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [
    {
      id: `${id}-slot`,
      weekId: id,
      weekday: AvailabilityWeekday.SUNDAY,
      startMinuteOfDay: 600,
      endMinuteOfDay: 630,
      durationMinutes: 30,
      timezone: 'Africa/Cairo',
      createdAt: new Date('2026-06-20T10:00:00.000Z'),
      updatedAt: new Date('2026-06-20T10:00:00.000Z'),
    },
  ],
) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    id,
    practitionerId: 'practitioner-1',
    weekStartDate: start,
    weekEndDate: end,
    timezone: 'Africa/Cairo',
    status,
    copiedFromWeekId: null,
    publishedAt:
      status === AvailabilityWeekStatus.PUBLISHED
        ? new Date('2026-06-20T10:00:00.000Z')
        : null,
    archivedAt: null,
    createdAt: new Date('2026-06-20T10:00:00.000Z'),
    updatedAt: new Date('2026-06-20T10:00:00.000Z'),
    slots,
  };
}
