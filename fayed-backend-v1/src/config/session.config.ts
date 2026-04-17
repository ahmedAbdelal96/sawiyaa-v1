import { registerAs } from '@nestjs/config';

export default registerAs('session', () => ({
  paymentReservationMinutes: parseInt(
    process.env.SESSION_PAYMENT_RESERVATION_MINUTES ?? '15',
    10,
  ),
}));
