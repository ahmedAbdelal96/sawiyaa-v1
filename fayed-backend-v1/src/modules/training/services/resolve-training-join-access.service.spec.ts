import { CourseScheduleStatus, EnrollmentStatus } from '@prisma/client';
import { ResolveTrainingJoinAccessService } from './resolve-training-join-access.service';

describe('ResolveTrainingJoinAccessService', () => {
  const service = new ResolveTrainingJoinAccessService();
  const startsAt = new Date('2026-05-01T10:00:00.000Z');
  const endsAt = new Date('2026-05-01T11:00:00.000Z');

  it('allows join for active enrollment within window and configured room', () => {
    const result = service.resolve({
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      scheduleStatus: CourseScheduleStatus.STARTED,
      startsAt,
      endsAt,
      externalRoomProvider: 'ZOOM',
      externalRoomJoinUrl: 'https://zoom.us/j/abc',
      now: new Date('2026-05-01T10:05:00.000Z'),
    });

    expect(result).toEqual({
      canJoin: true,
      blockedReason: null,
    });
  });

  it('blocks when enrollment is pending payment', () => {
    const result = service.resolve({
      enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
      scheduleStatus: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      startsAt,
      endsAt,
      externalRoomProvider: 'ZOOM',
      externalRoomJoinUrl: 'https://zoom.us/j/abc',
      now: new Date('2026-05-01T09:50:00.000Z'),
    });

    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('ENROLLMENT_NOT_ACTIVE');
  });

  it('blocks when join is requested too early', () => {
    const result = service.resolve({
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      scheduleStatus: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      startsAt,
      endsAt,
      externalRoomProvider: 'ZOOM',
      externalRoomJoinUrl: 'https://zoom.us/j/abc',
      now: new Date('2026-05-01T09:40:00.000Z'),
    });

    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('JOIN_WINDOW_NOT_OPEN');
  });

  it('blocks when external join info is missing', () => {
    const result = service.resolve({
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      scheduleStatus: CourseScheduleStatus.STARTED,
      startsAt,
      endsAt,
      externalRoomProvider: null,
      externalRoomJoinUrl: null,
      now: new Date('2026-05-01T10:00:00.000Z'),
    });

    expect(result.canJoin).toBe(false);
    expect(result.blockedReason).toBe('JOIN_ACCESS_NOT_CONFIGURED');
  });
});

