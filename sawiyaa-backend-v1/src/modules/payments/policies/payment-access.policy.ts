import { ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Object-level authorization for Payment resources.
 *
 * Answers: "Can this specific patient access this specific payment?"
 * Note: get-patient-payment.use-case intentionally uses 404 (existence hiding)
 * for its ownership check. This policy is used in contexts where a 403 is
 * acceptable (i.e., the payment existence is already established).
 */
@Injectable()
export class PaymentAccessPolicy {
  assertPatientOwner(input: {
    paymentPatientId: string;
    requesterPatientId: string;
  }): void {
    if (input.paymentPatientId !== input.requesterPatientId) {
      throw new ForbiddenException({
        messageKey: 'payments.errors.paymentForbidden',
        error: 'PAYMENT_FORBIDDEN',
      });
    }
  }
}
