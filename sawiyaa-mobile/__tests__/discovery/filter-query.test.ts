import { toDiscoveryFilters } from '../../src/features/patient/discovery/view-model';

describe('discovery filter query mapping', () => {
  it('keeps today and this-week availability as distinct backend booleans', () => {
    const today = toDiscoveryFilters({ availableToday: 'true' }, 12);
    const week = toDiscoveryFilters({ availableThisWeek: 'true' }, 12);

    expect(today.availableToday).toBe(true);
    expect(today.availableThisWeek).toBeUndefined();
    expect(week.availableToday).toBeUndefined();
    expect(week.availableThisWeek).toBe(true);
  });
});
