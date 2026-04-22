import { registerAs } from '@nestjs/config';

export default registerAs('session', () => ({
  paymentReservationMinutes: parseInt(
    process.env.SESSION_PAYMENT_RESERVATION_MINUTES ?? '15',
    10,
  ),
  runtimePrepareLeadMinutes: parseInt(
    process.env.SESSION_RUNTIME_PREPARE_LEAD_MINUTES ?? `${24 * 60}`,
    10,
  ),
  joinLeadMinutes: parseInt(process.env.SESSION_JOIN_LEAD_MINUTES ?? '15', 10),
  joinLagMinutes: parseInt(process.env.SESSION_JOIN_LAG_MINUTES ?? '120', 10),
}));
