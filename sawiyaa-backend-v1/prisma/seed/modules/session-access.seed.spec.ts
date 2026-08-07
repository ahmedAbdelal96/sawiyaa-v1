import { buildSessionAccessTimes, sessionAccessScenarioKeys } from './session-access.seed';
import { developmentDemoAccounts } from '../shared/seed.constants';

describe('dynamic session-access seed contract', () => {
  it('uses execution-relative UTC timestamps and configured join windows', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    const times = buildSessionAccessTimes(now, 15, 10);
    expect(times.startsAt.toISOString()).toBe('2026-08-06T12:05:00.000Z');
    expect(times.joinOpenAt.toISOString()).toBe('2026-08-06T11:50:00.000Z');
    expect(times.joinCloseAt.toISOString()).toBe('2026-08-06T13:15:00.000Z');
  });

  it('uses the displayed primary pair and deterministic scenario ownership', () => {
    expect(developmentDemoAccounts.primaryPatient.email).toBe('ahmed.patient@hesba.local');
    expect(developmentDemoAccounts.primaryPractitioner.email).toBe('dr.mohamed@hesba.local');
    expect(developmentDemoAccounts.noSessionPatient.email).toBe('omar.patient@hesba.local');
    expect(new Set(Object.values(sessionAccessScenarioKeys)).size).toBe(Object.values(sessionAccessScenarioKeys).length);
  });
});
