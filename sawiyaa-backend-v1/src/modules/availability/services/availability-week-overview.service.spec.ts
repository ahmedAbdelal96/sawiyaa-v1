import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { AvailabilityWeekCalendarService } from './availability-week-calendar.service';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekOverviewService } from './availability-week-overview.service';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilitySlotEditabilityService } from './availability-slot-editability.service';

describe('AvailabilityWeekOverviewService', () => {
  const availabilityWeekRepository = {
    findManyByPractitionerAndWeekStarts: jest.fn(),
  } as unknown as PractitionerAvailabilityWeekRepository;

  const availabilitySlotEditabilityService = {
    calculateEditability: jest.fn(async () => new Map()),
  } as unknown as AvailabilitySlotEditabilityService;

  const service = new AvailabilityWeekOverviewService(
    availabilityWeekRepository,
    new AvailabilityWeekCalendarService(),
    new AvailabilityWeekMapper(),
    availabilitySlotEditabilityService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns NOT_SET summaries and reminder state when no current or next week exists', async () => {
    (availabilityWeekRepository.findManyByPractitionerAndWeekStarts as jest.Mock).mockResolvedValue([]);

    const result = await service.buildForPractitioner({
      practitionerId: 'practitioner-1',
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.timezone).toBe('Africa/Cairo');
    expect(result.reminderState).toBe('CURRENT_WEEK_MISSING');
    expect(result.shouldPromptForNextWeek).toBe(false);
    expect(result.daysUntilCurrentWeekEnds).toBeNull();
    expect(result.nextWeekPublished).toBe(false);
    expect(result.currentWeek.status).toBe('NOT_SET');
    expect(result.nextWeek.status).toBe('NOT_SET');
  });

  it('returns current and next week records when they exist', async () => {
    (availabilityWeekRepository.findManyByPractitionerAndWeekStarts as jest.Mock).mockResolvedValue([
      buildWeek('current', '2026-06-21', AvailabilityWeekStatus.DRAFT),
      buildWeek('next', '2026-06-28', AvailabilityWeekStatus.PUBLISHED),
    ]);

    const result = await service.buildForPractitioner({
      practitionerId: 'practitioner-1',
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.currentWeek.id).toBe('current');
    expect(result.currentWeek.status).toBe(AvailabilityWeekStatus.DRAFT);
    expect(result.nextWeek.id).toBe('next');
    expect(result.reminderState).toBe('DRAFT_EXISTS');
    expect(result.shouldPromptForNextWeek).toBe(false);
    expect(result.daysUntilCurrentWeekEnds).toBe(3);
    expect(result.nextWeekPublished).toBe(true);
  });

  it('prompts for next week publication when the current week is published and the next week is missing', async () => {
    (availabilityWeekRepository.findManyByPractitionerAndWeekStarts as jest.Mock).mockResolvedValue([
      buildWeek('current', '2026-06-21', AvailabilityWeekStatus.PUBLISHED),
    ]);

    const result = await service.buildForPractitioner({
      practitionerId: 'practitioner-1',
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.reminderState).toBe('NEXT_WEEK_MISSING');
    expect(result.shouldPromptForNextWeek).toBe(true);
    expect(result.daysUntilCurrentWeekEnds).toBe(3);
    expect(result.nextWeekPublished).toBe(false);
  });

  it('does not prompt when the next week is already published', async () => {
    (availabilityWeekRepository.findManyByPractitionerAndWeekStarts as jest.Mock).mockResolvedValue([
      buildWeek('current', '2026-06-21', AvailabilityWeekStatus.PUBLISHED),
      buildWeek('next', '2026-06-28', AvailabilityWeekStatus.PUBLISHED),
    ]);

    const result = await service.buildForPractitioner({
      practitionerId: 'practitioner-1',
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(result.reminderState).toBe('NONE');
    expect(result.shouldPromptForNextWeek).toBe(false);
    expect(result.nextWeekPublished).toBe(true);
  });

  it('does not prompt outside the reminder window even when next week is missing', async () => {
    (availabilityWeekRepository.findManyByPractitionerAndWeekStarts as jest.Mock).mockResolvedValue([
      buildWeek('current', '2026-06-21', AvailabilityWeekStatus.PUBLISHED),
    ]);

    const result = await service.buildForPractitioner({
      practitionerId: 'practitioner-1',
      timezone: 'Africa/Cairo',
      now: new Date('2026-06-22T10:00:00.000Z'),
    });

    expect(result.reminderState).toBe('NEXT_WEEK_MISSING');
    expect(result.shouldPromptForNextWeek).toBe(false);
    expect(result.daysUntilCurrentWeekEnds).toBe(5);
  });
});

function buildWeek(
  id: string,
  startDate: string,
  status: AvailabilityWeekStatus,
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
    publishedAt: status === AvailabilityWeekStatus.PUBLISHED ? new Date('2026-06-20T10:00:00.000Z') : null,
    archivedAt: null,
    createdAt: new Date('2026-06-20T10:00:00.000Z'),
    updatedAt: new Date('2026-06-20T10:00:00.000Z'),
    slots: [
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
  };
}
