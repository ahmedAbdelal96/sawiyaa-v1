import { AppLoggerService } from '@common/logging/app-logger.service';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilityWeekOverviewService } from './availability-week-overview.service';
import { AvailabilityWeekReminderNotificationSweeperService } from './availability-week-reminder-notification-sweeper.service';
import { ResolvePractitionerTimezoneService } from './resolve-practitioner-timezone.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { UserStatus } from '@prisma/client';

describe('AvailabilityWeekReminderNotificationSweeperService', () => {
  const availabilityPractitionerRepository = {
    findApprovedReminderCandidates: jest.fn(),
  } as unknown as AvailabilityPractitionerRepository;

  const resolvePractitionerTimezoneService =
    new ResolvePractitionerTimezoneService();

  const availabilityWeekOverviewService = {
    buildForPractitioner: jest.fn(),
  } as unknown as AvailabilityWeekOverviewService;

  const operationalNotificationService = {
    queuePractitionerAvailabilityWeekEndingReminder: jest.fn(),
  } as unknown as OperationalNotificationService;

  const logger = {
    error: jest.fn(),
  } as unknown as AppLoggerService;

  const service = new AvailabilityWeekReminderNotificationSweeperService(
    availabilityPractitionerRepository,
    resolvePractitionerTimezoneService,
    availabilityWeekOverviewService,
    operationalNotificationService,
    logger,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queues a reminder when the current week is published and next week is still unpublished', async () => {
    (availabilityPractitionerRepository.findApprovedReminderCandidates as jest.Mock).mockResolvedValue([
      {
        id: 'practitioner-1',
        user: {
          id: 'user-1',
          displayName: 'Practitioner One',
          defaultLocale: 'ar',
          timezone: 'Africa/Cairo',
          status: UserStatus.ACTIVE,
        },
      },
    ]);
    (availabilityWeekOverviewService.buildForPractitioner as jest.Mock).mockResolvedValue({
      timezone: 'Africa/Cairo',
      currentWeek: {
        id: 'current',
        weekStartDate: '2026-06-21',
        weekEndDate: '2026-06-27',
        timezone: 'Africa/Cairo',
        status: 'PUBLISHED',
        copiedFromWeekId: null,
        publishedAt: '2026-06-21T10:00:00.000Z',
        archivedAt: null,
        createdAt: '2026-06-20T10:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
        isEditable: false,
        hasSlots: true,
        slots: [],
      },
      nextWeek: {
        id: 'next',
        weekStartDate: '2026-06-28',
        weekEndDate: '2026-07-04',
        timezone: 'Africa/Cairo',
        status: 'NOT_SET',
        copiedFromWeekId: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: null,
        updatedAt: null,
        isEditable: false,
        hasSlots: false,
        slots: [],
      },
      reminderState: 'NEXT_WEEK_MISSING',
      shouldPromptForNextWeek: true,
      daysUntilCurrentWeekEnds: 3,
      nextWeekPublished: false,
    });

    const handled = await service.sweepOnce(
      new Date('2026-06-24T10:00:00.000Z'),
    );

    expect(handled).toBe(1);
    expect(
      operationalNotificationService.queuePractitionerAvailabilityWeekEndingReminder,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'practitioner-1',
        userId: 'user-1',
        locale: 'ar',
        routePath: '/ar/practitioner/availability',
        shouldPromptForNextWeek: true,
        daysUntilCurrentWeekEnds: 3,
        nextWeekPublished: false,
      }),
    );
  });

  it('does not queue a reminder when the next week is already published', async () => {
    (availabilityPractitionerRepository.findApprovedReminderCandidates as jest.Mock).mockResolvedValue([
      {
        id: 'practitioner-1',
        user: {
          id: 'user-1',
          displayName: 'Practitioner One',
          defaultLocale: 'en',
          timezone: 'Africa/Cairo',
          status: UserStatus.ACTIVE,
        },
      },
    ]);
    (availabilityWeekOverviewService.buildForPractitioner as jest.Mock).mockResolvedValue({
      timezone: 'Africa/Cairo',
      currentWeek: { status: 'PUBLISHED' },
      nextWeek: { status: 'PUBLISHED' },
      reminderState: 'NONE',
      shouldPromptForNextWeek: false,
      daysUntilCurrentWeekEnds: 2,
      nextWeekPublished: true,
    });

    const handled = await service.sweepOnce(
      new Date('2026-06-24T10:00:00.000Z'),
    );

    expect(handled).toBe(0);
    expect(
      operationalNotificationService.queuePractitionerAvailabilityWeekEndingReminder,
    ).not.toHaveBeenCalled();
  });

  it('uses a safe UTC fallback when practitioner timezone is invalid', async () => {
    (availabilityPractitionerRepository.findApprovedReminderCandidates as jest.Mock).mockResolvedValue([
      {
        id: 'practitioner-1',
        user: {
          id: 'user-1',
          displayName: 'Practitioner One',
          defaultLocale: 'en',
          timezone: 'Invalid/Timezone',
          status: UserStatus.ACTIVE,
        },
      },
    ]);
    (availabilityWeekOverviewService.buildForPractitioner as jest.Mock).mockResolvedValue({
      timezone: 'UTC',
      currentWeek: {
        weekStartDate: '2026-06-21',
        weekEndDate: '2026-06-27',
        status: 'PUBLISHED',
      },
      nextWeek: {
        weekStartDate: '2026-06-28',
        weekEndDate: '2026-07-04',
        status: 'NOT_SET',
      },
      reminderState: 'NEXT_WEEK_MISSING',
      shouldPromptForNextWeek: true,
      daysUntilCurrentWeekEnds: 3,
      nextWeekPublished: false,
    });

    await service.sweepOnce(new Date('2026-06-24T10:00:00.000Z'));

    expect(availabilityWeekOverviewService.buildForPractitioner).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'UTC',
      }),
    );
  });

  it('continues safely if one practitioner fails during the sweep', async () => {
    (availabilityPractitionerRepository.findApprovedReminderCandidates as jest.Mock).mockResolvedValue([
      {
        id: 'practitioner-1',
        user: {
          id: 'user-1',
          displayName: 'Practitioner One',
          defaultLocale: 'en',
          timezone: 'Africa/Cairo',
          status: UserStatus.ACTIVE,
        },
      },
      {
        id: 'practitioner-2',
        user: {
          id: 'user-2',
          displayName: 'Practitioner Two',
          defaultLocale: 'en',
          timezone: 'Africa/Cairo',
          status: UserStatus.ACTIVE,
        },
      },
    ]);
    (availabilityWeekOverviewService.buildForPractitioner as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        timezone: 'Africa/Cairo',
        currentWeek: {
          id: 'current',
          weekStartDate: '2026-06-21',
          weekEndDate: '2026-06-27',
          timezone: 'Africa/Cairo',
          status: 'PUBLISHED',
          copiedFromWeekId: null,
          publishedAt: '2026-06-21T10:00:00.000Z',
          archivedAt: null,
          createdAt: '2026-06-20T10:00:00.000Z',
          updatedAt: '2026-06-20T10:00:00.000Z',
          isEditable: false,
          hasSlots: true,
          slots: [],
        },
        nextWeek: {
          id: 'next',
          weekStartDate: '2026-06-28',
          weekEndDate: '2026-07-04',
          timezone: 'Africa/Cairo',
          status: 'NOT_SET',
          copiedFromWeekId: null,
          publishedAt: null,
          archivedAt: null,
          createdAt: null,
          updatedAt: null,
          isEditable: false,
          hasSlots: false,
          slots: [],
        },
        reminderState: 'NEXT_WEEK_MISSING',
        shouldPromptForNextWeek: true,
        daysUntilCurrentWeekEnds: 3,
        nextWeekPublished: false,
      });

    const handled = await service.sweepOnce(
      new Date('2026-06-24T10:00:00.000Z'),
    );

    expect(handled).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
