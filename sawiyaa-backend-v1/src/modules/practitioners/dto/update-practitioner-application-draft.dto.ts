import { OmitType } from '@nestjs/swagger';
import { SubmitPractitionerApplicationDto } from './submit-practitioner-application.dto';

/** Applicant draft fields intentionally exclude all operational pricing and payout fields. */
export class UpdatePractitionerApplicationDraftDto extends OmitType(
  SubmitPractitionerApplicationDto,
  [
    'payoutDestination',
  ] as const,
) {}
