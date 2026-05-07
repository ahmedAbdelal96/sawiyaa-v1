import { BadRequestException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidatePractitionerPackageService } from './validate-practitioner-package.service';

describe('ValidatePractitionerPackageService', () => {
  const validateSessionDurationService = {
    validate: jest.fn(),
  } as unknown as ValidateSessionDurationService;

  const service = new ValidatePractitionerPackageService(
    validateSessionDurationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a valid V1 package draft payload', () => {
    expect(() =>
      service.validateDraft({
        title: 'Starter Package',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: 1200,
        priceUsd: 40,
      }),
    ).not.toThrow();

    expect(validateSessionDurationService.validate).toHaveBeenCalledWith(30);
  });

  it('rejects unsupported schedule policies in V1', () => {
    expect(() =>
      service.validateDraft({
        title: 'Starter Package',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: 1200,
        priceUsd: 40,
        schedulePolicy: 'ALLOW_SCHEDULE_LATER' as never,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid package durations', () => {
    (validateSessionDurationService.validate as jest.Mock).mockImplementation(
      () => {
        throw new BadRequestException();
      },
    );

    expect(() =>
      service.validateDraft({
        title: 'Starter Package',
        sessionCount: 8,
        sessionDurationMinutes: 45,
        sessionMode: SessionMode.VIDEO,
        priceEgp: 1200,
        priceUsd: 40,
      }),
    ).toThrow(BadRequestException);
  });
});
