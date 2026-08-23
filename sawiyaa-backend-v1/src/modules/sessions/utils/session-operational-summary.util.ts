import { SessionStatus } from '@prisma/client';
import { SessionOperationalState } from '../types/session-operational-interpretation.types';

export function summarizeOperationalStates(states: SessionOperationalState[]) {
  const counts = states.reduce<Record<SessionStatus, number>>((acc, state) => {
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {} as Record<SessionStatus, number>);
  const get = (...statuses: SessionStatus[]) => statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  return { counts, get };
}
