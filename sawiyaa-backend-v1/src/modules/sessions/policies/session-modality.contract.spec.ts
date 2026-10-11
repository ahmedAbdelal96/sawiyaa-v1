import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMatchingSessionDto } from '@modules/matching/dto/create-matching-session.dto';
import { CreatePackagePurchaseDto } from '@modules/package-plans/dto/create-package-purchase.dto';
import { PackagePlanQuoteRequestDto } from '@modules/package-plans/dto/package-plan-quote-request.dto';
import { CreateScheduledSessionDto } from '../dto/create-scheduled-session.dto';

function hasSessionModeValidationError(value: object): boolean {
  return validateSync(value).some((error) => error.property === 'sessionMode');
}

describe('Video-only session modality contracts', () => {
  it.each(['AUDIO', 'CHAT'])(
    'rejects %s for scheduled sessions',
    (sessionMode) => {
      const dto = plainToInstance(CreateScheduledSessionDto, {
        practitionerSlug: 'dr-example',
        scheduledStartAt: '2027-01-01T10:00:00.000Z',
        durationMinutes: 60,
        sessionMode,
      });

      expect(hasSessionModeValidationError(dto)).toBe(true);
    },
  );

  it.each(['AUDIO', 'CHAT'])(
    'rejects %s for package purchase and quote contracts',
    (sessionMode) => {
      const purchase = plainToInstance(CreatePackagePurchaseDto, {
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-example',
        durationMinutes: 60,
        sessionMode,
      });
      const quote = plainToInstance(PackagePlanQuoteRequestDto, {
        packagePlanCode: 'SESSIONS_4',
        practitionerSlug: 'dr-example',
        durationMinutes: 60,
        sessionMode,
        currencyCode: 'EGP',
      });

      expect(hasSessionModeValidationError(purchase)).toBe(true);
      expect(hasSessionModeValidationError(quote)).toBe(true);
    },
  );

  it.each(['AUDIO', 'CHAT'])(
    'rejects %s for guided matching',
    (sessionMode) => {
      const dto = plainToInstance(CreateMatchingSessionDto, { sessionMode });

      expect(hasSessionModeValidationError(dto)).toBe(true);
    },
  );
});
