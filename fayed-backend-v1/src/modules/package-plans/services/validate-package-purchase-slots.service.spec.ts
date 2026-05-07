import { BadRequestException, ConflictException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { ValidateSessionBookingRequestService } from '@modules/sessions/services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '@modules/sessions/services/validate-session-schedule-compatibility.service';
import { ValidatePackagePurchaseSlotsService } from './validate-package-purchase-slots.service';

describe('ValidatePackagePurchaseSlotsService', () => {
  const validateSessionDurationService = new ValidateSessionDurationService();
  const validateSessionBookingRequestService =
    new ValidateSessionBookingRequestService();
  const validateSessionScheduleCompatibilityService = {
    assertFitsPractitionerAvailability: jest.fn(),
  } as never;
  const validateSessionConflictsService = {
    assertNoPractitionerConflict: jest.fn(),
    assertNoPatientConflict: jest.fn(),
  } as never;

  const service = new ValidatePackagePurchaseSlotsService(
    validateSessionDurationService,
    validateSessionBookingRequestService,
    validateSessionScheduleCompatibilityService,
    validateSessionConflictsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates exact slot counts and normalizes slots', async () => {
    (validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability as jest.Mock).mockResolvedValue(
      { timezone: 'Africa/Cairo' },
    );
    (validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock).mockResolvedValue(
      undefined,
    );
    (validateSessionConflictsService.assertNoPatientConflict as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await service.validate({
      practitionerId: 'practitioner-1',
      practitionerTimezone: 'Africa/Cairo',
      patientId: 'patient-1',
      durationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      expectedSlotCount: 2,
      selectedSessionSlots: [
        { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
        { scheduledStartAt: '2999-01-01T11:00:00.000Z' },
      ],
    });

    expect(result.timezone).toBe('Africa/Cairo');
    expect(result.slots).toHaveLength(2);
    expect(validateSessionConflictsService.assertNoPractitionerConflict).toHaveBeenCalledTimes(
      2,
    );
  });

  it('rejects duplicate selected slots', async () => {
    await expect(
      service.validate({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Africa/Cairo',
        patientId: 'patient-1',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        expectedSlotCount: 2,
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects overlapping selected slots', async () => {
    await expect(
      service.validate({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Africa/Cairo',
        patientId: 'patient-1',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        expectedSlotCount: 2,
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
          { scheduledStartAt: '2999-01-01T10:30:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unavailable windows from the schedule compatibility service', async () => {
    (validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability as jest.Mock).mockRejectedValue(
      new BadRequestException({
        messageKey: 'sessions.errors.unavailableTimeWindow',
        error: 'SESSION_UNAVAILABLE_TIME_WINDOW',
      }),
    );

    await expect(
      service.validate({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Africa/Cairo',
        patientId: 'patient-1',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        expectedSlotCount: 1,
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bubbles collision conflicts from the session conflict service', async () => {
    (validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability as jest.Mock).mockResolvedValue(
      { timezone: 'Africa/Cairo' },
    );
    (validateSessionConflictsService.assertNoPractitionerConflict as jest.Mock).mockRejectedValue(
      new ConflictException({
        messageKey: 'sessions.errors.practitionerTimeConflict',
        error: 'SESSION_PRACTITIONER_TIME_CONFLICT',
      }),
    );

    await expect(
      service.validate({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Africa/Cairo',
        patientId: 'patient-1',
        durationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        expectedSlotCount: 1,
        selectedSessionSlots: [
          { scheduledStartAt: '2999-01-01T10:00:00.000Z' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
