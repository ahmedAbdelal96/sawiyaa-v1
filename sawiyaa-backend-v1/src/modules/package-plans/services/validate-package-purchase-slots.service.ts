import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SessionMode } from '@prisma/client';
import { ValidateSessionBookingRequestService } from '@modules/sessions/services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '@modules/sessions/services/validate-session-schedule-compatibility.service';

type NormalizedPackageSlot = {
  scheduledStartAt: Date;
  scheduledEndAt: Date;
};

@Injectable()
export class ValidatePackagePurchaseSlotsService {
  constructor(
    private readonly validateSessionDurationService: ValidateSessionDurationService,
    private readonly validateSessionBookingRequestService: ValidateSessionBookingRequestService,
    private readonly validateSessionScheduleCompatibilityService: ValidateSessionScheduleCompatibilityService,
    private readonly validateSessionConflictsService: ValidateSessionConflictsService,
  ) {}

  async validate(input: {
    practitionerId: string;
    practitionerTimezone: string | null;
    patientId: string;
    durationMinutes: 30 | 60;
    sessionMode: SessionMode;
    expectedSlotCount: number;
    selectedSessionSlots: Array<{
      scheduledStartAt: string;
    }>;
    tx?: Prisma.TransactionClient;
  }): Promise<{
    timezone: string;
    slots: NormalizedPackageSlot[];
  }> {
    this.validateSessionDurationService.validate(input.durationMinutes);

    if (input.selectedSessionSlots.length !== input.expectedSlotCount) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.invalidSlotCount',
        error: 'PACKAGE_PURCHASE_INVALID_SLOT_COUNT',
        context: {
          expectedSlotCount: input.expectedSlotCount,
          actualSlotCount: input.selectedSessionSlots.length,
        },
      });
    }

    const normalizedSlots = input.selectedSessionSlots
      .map((slot) => {
        const scheduledStartAt = new Date(slot.scheduledStartAt);
        this.validateSessionBookingRequestService.assertUtcDateIsValid(
          scheduledStartAt,
          'packagePurchases.errors.invalidSlotStartAt',
          'PACKAGE_PURCHASE_INVALID_SLOT_START_AT',
        );
        this.validateSessionBookingRequestService.assertScheduledStartIsFuture(
          scheduledStartAt,
        );

        return {
          scheduledStartAt,
          scheduledEndAt: new Date(
            scheduledStartAt.getTime() + input.durationMinutes * 60 * 1000,
          ),
        };
      })
      .sort(
        (left, right) =>
          left.scheduledStartAt.getTime() - right.scheduledStartAt.getTime(),
      );

    const duplicateCheck = new Set<string>();
    normalizedSlots.forEach((slot, index) => {
      const key = slot.scheduledStartAt.toISOString();
      if (duplicateCheck.has(key)) {
        throw new BadRequestException({
          messageKey: 'packagePurchases.errors.duplicateSlot',
          error: 'PACKAGE_PURCHASE_DUPLICATE_SLOT',
        });
      }
      duplicateCheck.add(key);

      if (index > 0) {
        const previous = normalizedSlots[index - 1];
        if (
          slot.scheduledStartAt.getTime() < previous.scheduledEndAt.getTime()
        ) {
          throw new BadRequestException({
            messageKey: 'packagePurchases.errors.overlappingSlots',
            error: 'PACKAGE_PURCHASE_OVERLAPPING_SLOTS',
          });
        }
      }
    });

    let timezone = '';

    for (const slot of normalizedSlots) {
      const availabilityResult =
        await this.validateSessionScheduleCompatibilityService.assertFitsPractitionerAvailability(
          {
            practitionerId: input.practitionerId,
            practitionerTimezone: input.practitionerTimezone,
            requestedStartAtUtc: slot.scheduledStartAt,
            requestedEndAtUtc: slot.scheduledEndAt,
            requestedDurationMinutes: input.durationMinutes,
          },
        );

      if (!timezone) {
        timezone = availabilityResult.timezone;
      }

      await this.validateSessionConflictsService.assertNoPractitionerConflict({
        practitionerId: input.practitionerId,
        scheduledStartAtUtc: slot.scheduledStartAt,
        scheduledEndAtUtc: slot.scheduledEndAt,
        tx: input.tx,
      });
      await this.validateSessionConflictsService.assertNoPatientConflict({
        patientId: input.patientId,
        scheduledStartAtUtc: slot.scheduledStartAt,
        scheduledEndAtUtc: slot.scheduledEndAt,
        tx: input.tx,
      });
    }

    if (!timezone) {
      throw new BadRequestException({
        messageKey: 'packagePurchases.errors.timezoneResolutionFailed',
        error: 'PACKAGE_PURCHASE_TIMEZONE_RESOLUTION_FAILED',
      });
    }

    return {
      timezone,
      slots: normalizedSlots,
    };
  }
}
