import {
  SESSION_JOIN_LAG_MINUTES,
  SESSION_JOIN_LEAD_MINUTES,
} from '../modules/sessions/utils/session-join-policy.util';
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
  joinLeadMinutes: SESSION_JOIN_LEAD_MINUTES,
  joinLagMinutes: SESSION_JOIN_LAG_MINUTES,
}));
