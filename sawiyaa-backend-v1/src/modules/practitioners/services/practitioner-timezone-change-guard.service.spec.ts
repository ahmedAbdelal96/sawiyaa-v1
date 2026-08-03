import { ConflictException } from '@nestjs/common';
import { AvailabilityWeekStatus, SessionStatus } from '@prisma/client';
import { PractitionerTimezoneChangeGuardService } from './practitioner-timezone-change-guard.service';

describe('PractitionerTimezoneChangeGuardService', () => {
  it('blocks a timezone change when published availability exists', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'Africa/Cairo',
          practitionerProfile: { id: 'practitioner-1' },
        }),
      },
      practitionerAvailabilityWeek: {
        findFirst: jest.fn().mockResolvedValue({ id: 'week-1' }),
      },
      session: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;

    const service = new PractitionerTimezoneChangeGuardService(db);

    await expect(
      service.assertCanChange({
        userId: 'user-1',
        requestedTimezone: 'Asia/Riyadh',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(db.practitionerAvailabilityWeek.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          practitionerId: 'practitioner-1',
          status: AvailabilityWeekStatus.PUBLISHED,
        }),
      }),
    );
  });

  it('allows a change when no published availability or non-terminal future session exists', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'Africa/Cairo',
          practitionerProfile: { id: 'practitioner-1' },
        }),
      },
      practitionerAvailabilityWeek: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      session: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;

    await expect(
      new PractitionerTimezoneChangeGuardService(db).assertCanChange({
        userId: 'user-1',
        requestedTimezone: 'Asia/Riyadh',
      }),
    ).resolves.toBeUndefined();

    expect(db.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: expect.arrayContaining([SessionStatus.CANCELLED]) },
        }),
      }),
    );
  });
});
