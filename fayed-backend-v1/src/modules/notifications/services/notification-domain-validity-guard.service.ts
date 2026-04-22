import { Injectable } from '@nestjs/common';
import {
  CourseScheduleStatus,
  EnrollmentStatus,
  PaymentStatus,
  SessionStatus,
  RefundStatus,
} from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

type GuardNotification = {
  id: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  notificationType: {
    slug: string;
    category: string;
  };
};

type GuardDecision =
  | {
      valid: true;
    }
  | {
      valid: false;
      reason: string;
    };

@Injectable()
export class NotificationDomainValidityGuardService {
  private readonly invalidSessionStatuses = new Set<SessionStatus>([
    SessionStatus.CANCELLED,
    SessionStatus.COMPLETED,
    SessionStatus.NO_SHOW,
    SessionStatus.EXPIRED,
    SessionStatus.REFUNDED,
  ]);
  private readonly invalidTrainingScheduleStatuses =
    new Set<CourseScheduleStatus>([
      CourseScheduleStatus.CANCELLED,
      CourseScheduleStatus.COMPLETED,
      CourseScheduleStatus.ARCHIVED,
    ]);
  private readonly paymentSuccessStatuses = new Set<PaymentStatus>([
    PaymentStatus.CAPTURED,
    PaymentStatus.AUTHORIZED,
  ]);
  private readonly paymentFailureStatuses = new Set<PaymentStatus>([
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ]);
  private readonly refundRequestedStatuses = new Set<RefundStatus>([
    RefundStatus.REQUESTED,
    RefundStatus.PROCESSING,
  ]);
  private readonly refundFailedStatuses = new Set<RefundStatus>([
    RefundStatus.FAILED,
    RefundStatus.CANCELLED,
  ]);

  constructor(private readonly repository: OperationalNotificationRepository) {}

  async evaluate(notification: GuardNotification): Promise<GuardDecision> {
    if (!notification.relatedEntityType) {
      return { valid: true };
    }

    if (!notification.relatedEntityId) {
      return { valid: false, reason: 'DOMAIN_TARGET_MISSING' };
    }

    if (notification.relatedEntityType === 'SESSION') {
      return this.evaluateSession(notification.relatedEntityId);
    }

    if (notification.relatedEntityType === 'TRAINING_ENROLLMENT') {
      return this.evaluateTrainingEnrollment(notification.relatedEntityId);
    }

    if (notification.relatedEntityType === 'PAYMENT') {
      return this.evaluatePayment(
        notification.relatedEntityId,
        notification.notificationType.slug,
      );
    }

    if (notification.relatedEntityType === 'REFUND') {
      return this.evaluateRefund(
        notification.relatedEntityId,
        notification.notificationType.slug,
      );
    }

    return { valid: true };
  }

  private async evaluateSession(sessionId: string): Promise<GuardDecision> {
    const session =
      await this.repository.findSessionDeliveryGuardState(sessionId);
    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (this.invalidSessionStatuses.has(session.status)) {
      return { valid: false, reason: `SESSION_STATUS_${session.status}` };
    }

    return { valid: true };
  }

  private async evaluateTrainingEnrollment(
    enrollmentId: string,
  ): Promise<GuardDecision> {
    const enrollment =
      await this.repository.findTrainingEnrollmentDeliveryGuardState(
        enrollmentId,
      );
    if (!enrollment) {
      return { valid: false, reason: 'TRAINING_ENROLLMENT_NOT_FOUND' };
    }

    if (enrollment.enrollmentStatus !== EnrollmentStatus.ACTIVE) {
      return {
        valid: false,
        reason: `TRAINING_ENROLLMENT_STATUS_${enrollment.enrollmentStatus}`,
      };
    }

    if (
      this.invalidTrainingScheduleStatuses.has(enrollment.courseSchedule.status)
    ) {
      return {
        valid: false,
        reason: `TRAINING_SCHEDULE_STATUS_${enrollment.courseSchedule.status}`,
      };
    }

    return { valid: true };
  }

  private async evaluatePayment(
    paymentId: string,
    slug: string,
  ): Promise<GuardDecision> {
    const payment =
      await this.repository.findPaymentDeliveryGuardState(paymentId);
    if (!payment) {
      return { valid: false, reason: 'PAYMENT_NOT_FOUND' };
    }

    if (slug === 'payments.payment-succeeded') {
      if (!this.paymentSuccessStatuses.has(payment.status)) {
        return {
          valid: false,
          reason: `PAYMENT_STATUS_${payment.status}_NOT_SUCCESS`,
        };
      }
      return { valid: true };
    }

    if (slug === 'payments.payment-failed') {
      if (!this.paymentFailureStatuses.has(payment.status)) {
        return {
          valid: false,
          reason: `PAYMENT_STATUS_${payment.status}_NOT_FAILURE`,
        };
      }
      return { valid: true };
    }

    return { valid: true };
  }

  private async evaluateRefund(
    refundId: string,
    slug: string,
  ): Promise<GuardDecision> {
    const refund = await this.repository.findRefundDeliveryGuardState(refundId);
    if (!refund) {
      return { valid: false, reason: 'REFUND_NOT_FOUND' };
    }

    if (slug === 'payments.refund-requested') {
      if (!this.refundRequestedStatuses.has(refund.status)) {
        return {
          valid: false,
          reason: `REFUND_STATUS_${refund.status}_NOT_REQUESTED`,
        };
      }
      return { valid: true };
    }

    if (slug === 'payments.refund-succeeded') {
      if (refund.status !== RefundStatus.SUCCEEDED) {
        return {
          valid: false,
          reason: `REFUND_STATUS_${refund.status}_NOT_SUCCEEDED`,
        };
      }
      return { valid: true };
    }

    if (slug === 'payments.refund-failed') {
      if (!this.refundFailedStatuses.has(refund.status)) {
        return {
          valid: false,
          reason: `REFUND_STATUS_${refund.status}_NOT_FAILED`,
        };
      }
      return { valid: true };
    }

    return { valid: true };
  }
}
