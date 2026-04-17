import {
  CourseScheduleStatus,
  EnrollmentStatus,
  PaymentStatus,
  RefundStatus,
  SessionStatus,
} from '@prisma/client';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { NotificationDomainValidityGuardService } from './notification-domain-validity-guard.service';

describe('NotificationDomainValidityGuardService', () => {
  const repository = {
    findSessionDeliveryGuardState: jest.fn(),
    findTrainingEnrollmentDeliveryGuardState: jest.fn(),
    findPaymentDeliveryGuardState: jest.fn(),
    findRefundDeliveryGuardState: jest.fn(),
  } as unknown as OperationalNotificationRepository;

  const service = new NotificationDomainValidityGuardService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows valid training reminder notifications', async () => {
    (repository.findTrainingEnrollmentDeliveryGuardState as jest.Mock).mockResolvedValue(
      {
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        courseSchedule: {
          status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
        },
      },
    );

    const result = await service.evaluate({
      id: 'n1',
      relatedEntityType: 'TRAINING_ENROLLMENT',
      relatedEntityId: 'en_1',
      notificationType: {
        slug: 'training.schedule-reminder',
        category: 'TRAINING',
      },
    });

    expect(result).toEqual({ valid: true });
  });

  it('suppresses invalid session notifications when session became cancelled', async () => {
    (repository.findSessionDeliveryGuardState as jest.Mock).mockResolvedValue({
      status: SessionStatus.CANCELLED,
    });

    const result = await service.evaluate({
      id: 'n2',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        slug: 'sessions.session-reminder',
        category: 'SESSION',
      },
    });

    expect(result).toEqual({
      valid: false,
      reason: 'SESSION_STATUS_CANCELLED',
    });
  });

  it('suppresses payment-failed notification when payment is captured', async () => {
    (repository.findPaymentDeliveryGuardState as jest.Mock).mockResolvedValue({
      status: PaymentStatus.CAPTURED,
    });

    const result = await service.evaluate({
      id: 'n3',
      relatedEntityType: 'PAYMENT',
      relatedEntityId: 'payment_1',
      notificationType: {
        slug: 'payments.payment-failed',
        category: 'PAYMENT',
      },
    });

    expect(result).toEqual({
      valid: false,
      reason: 'PAYMENT_STATUS_CAPTURED_NOT_FAILURE',
    });
  });

  it('suppresses refund-succeeded notification when refund is still requested', async () => {
    (repository.findRefundDeliveryGuardState as jest.Mock).mockResolvedValue({
      status: RefundStatus.REQUESTED,
    });

    const result = await service.evaluate({
      id: 'n4',
      relatedEntityType: 'REFUND',
      relatedEntityId: 'refund_1',
      notificationType: {
        slug: 'payments.refund-succeeded',
        category: 'PAYMENT',
      },
    });

    expect(result).toEqual({
      valid: false,
      reason: 'REFUND_STATUS_REQUESTED_NOT_SUCCEEDED',
    });
  });
});
