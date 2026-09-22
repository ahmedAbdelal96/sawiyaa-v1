import { SessionStatus } from '@prisma/client';
import {
  buildOperationalNextSessionCandidateWhere,
  OPERATIONAL_ACTIONABLE_STATUSES,
} from './session-operational-candidate-predicates.util';

describe('buildOperationalNextSessionCandidateWhere', () => {
  it('excludes terminal, cancelled, room-closed and resolution sessions before interpretation', () => {
    const where = buildOperationalNextSessionCandidateWhere(new Date('2026-08-08T10:00:00.000Z'));

    expect(where.status).toEqual({ in: OPERATIONAL_ACTIONABLE_STATUSES });
    expect(where.videoRoomClosedAt).toBeNull();
    expect(where.cancelledAt).toBeNull();
    expect(OPERATIONAL_ACTIONABLE_STATUSES).not.toContain(SessionStatus.AWAITING_ADMIN_RESOLUTION);
    expect(OPERATIONAL_ACTIONABLE_STATUSES).not.toContain(SessionStatus.COMPLETED);
    expect(OPERATIONAL_ACTIONABLE_STATUSES).not.toContain(SessionStatus.CANCELLED);
  });
});
