import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentStatus,
  RefundDestination,
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
} from '@prisma/client';

export class SessionCancellationPreviewItemDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionCancellationBookingType })
  bookingType!: SessionCancellationBookingType;

  @ApiProperty()
  canCancelNow!: boolean;

  @ApiProperty()
  cancellationAllowedByPolicy!: boolean;

  @ApiProperty({ nullable: true })
  blockingReasonCode!: string | null;

  @ApiProperty()
  sessionStartAt!: string;

  @ApiProperty()
  hoursBeforeStart!: number;

  @ApiProperty()
  matchedRuleCode!: string;

  @ApiProperty()
  matchedRuleDisplayName!: string;

  @ApiProperty({ enum: SessionCancellationRefundMode })
  refundMode!: SessionCancellationRefundMode;

  @ApiProperty({ nullable: true })
  refundPercent!: string | null;

  @ApiProperty({ enum: RefundDestination, nullable: true })
  refundDestination!: RefundDestination | null;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty()
  paymentAmountTotal!: string;

  @ApiProperty()
  paymentAmountFromWallet!: string;

  @ApiProperty()
  paymentAmountFromGateway!: string;

  @ApiProperty()
  alreadyRefundedAmount!: string;

  @ApiProperty()
  reservationReleaseAmount!: string;

  @ApiProperty()
  refundAmount!: string;

  @ApiProperty()
  walletCreditAmount!: string;

  @ApiProperty()
  gatewayRefundAmount!: string;

  @ApiProperty({
    enum: [
      'NO_PAYMENT',
      'POLICY_BLOCKED',
      'RESERVATION_RELEASE',
      'REFUND_TO_WALLET',
      'NO_REFUND',
      'UNSUPPORTED_REFUND_DESTINATION',
      'PAYMENT_STATE_NOT_REFUNDABLE',
    ],
  })
  outcomeType!:
    | 'NO_PAYMENT'
    | 'POLICY_BLOCKED'
    | 'RESERVATION_RELEASE'
    | 'REFUND_TO_WALLET'
    | 'NO_REFUND'
    | 'UNSUPPORTED_REFUND_DESTINATION'
    | 'PAYMENT_STATE_NOT_REFUNDABLE';
}

export class SessionCancellationPreviewDataResponseDto {
  @ApiProperty({ type: SessionCancellationPreviewItemDto })
  item!: SessionCancellationPreviewItemDto;
}

export class SessionCancellationPreviewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionCancellationPreviewDataResponseDto })
  data!: SessionCancellationPreviewDataResponseDto;
}
