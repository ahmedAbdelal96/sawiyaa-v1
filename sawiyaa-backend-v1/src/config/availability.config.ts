import { registerAs } from '@nestjs/config';

export const AVAILABILITY_WEEK_STARTS_ON = 'SUNDAY' as const;
export const DEFAULT_AVAILABILITY_FUTURE_WEEKS_ALLOWED = 4;
export const DEFAULT_AVAILABILITY_RETENTION_MONTHS = 12;
export const DEFAULT_AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES = 10;

export default registerAs('availability', () => ({
  futureWeeksAllowed: parseInt(
    process.env.AVAILABILITY_FUTURE_WEEKS_ALLOWED ?? `${DEFAULT_AVAILABILITY_FUTURE_WEEKS_ALLOWED}`,
    10,
  ),
  retentionMonths: parseInt(
    process.env.AVAILABILITY_RETENTION_MONTHS ?? `${DEFAULT_AVAILABILITY_RETENTION_MONTHS}`,
    10,
  ),
  repeatPreviewTtlMinutes: parseInt(
    process.env.AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES ?? `${DEFAULT_AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES}`,
    10,
  ),
  weekStartsOn: AVAILABILITY_WEEK_STARTS_ON,
}));
