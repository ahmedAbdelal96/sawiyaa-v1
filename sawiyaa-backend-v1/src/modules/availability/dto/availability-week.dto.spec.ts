import { validate } from 'class-validator';
import {
  CreateAvailabilityWeekDto,
  UpdateAvailabilityWeekDto,
} from './availability-week.dto';
import { AVAILABILITY_WEEK_MAX_SLOTS } from '../constants/availability-capacity.constants';

function slots(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    dayOfWeek: Math.floor(index / 72),
    durationMinutes: 30,
    startMinuteOfDay: index % 48,
    endMinuteOfDay: (index % 48) + 30,
  }));
}

describe('availability week capacity contract', () => {
  it('accepts the maximum legitimate weekly schedule and rejects one more slot', async () => {
    const dto = new CreateAvailabilityWeekDto();
    dto.weekStartDate = '2026-06-21';
    dto.timezone = 'Africa/Cairo';
    dto.slots = slots(AVAILABILITY_WEEK_MAX_SLOTS);
    const atLimit = await validate(dto);
    expect(atLimit.flatMap((error) => Object.values(error.constraints ?? {}))).not.toContain(
      'availability.errors.weekSlotsLimit',
    );

    const update = new UpdateAvailabilityWeekDto();
    update.slots = slots(AVAILABILITY_WEEK_MAX_SLOTS + 1);
    const beyondLimit = await validate(update);
    expect(beyondLimit.flatMap((error) => Object.values(error.constraints ?? {}))).toContain(
      'availability.errors.weekSlotsLimit',
    );
  });
});
