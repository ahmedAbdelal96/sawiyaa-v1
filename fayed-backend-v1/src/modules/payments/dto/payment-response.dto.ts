import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentProvider,
  PaymentStatus,
  RefundDestination,
  RefundStatus,
  RefundType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';

export class PaymentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  amountSubtotal!: string;

  @ApiProperty()
  amountDiscount!: string;

  @ApiProperty()
  amountTotal!: string;

  @ApiProperty()
  amountFromWallet!: string;

  @ApiProperty()
  amountFromGateway!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  providerPaymentId!: string | null;

  @ApiProperty({ nullable: true })
  providerReference!: string | null;

  @ApiProperty({ nullable: true })
  checkoutUrl!: string | null;

  @ApiProperty({ nullable: true })
  clientSecret!: string | null;

  @ApiProperty({ nullable: true })
  paidAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  expiredAt!: string | null;

  @ApiProperty({ nullable: true })
  refundedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PaymentItemDataResponseDto {
  @ApiProperty({ type: PaymentItemDto })
  item!: PaymentItemDto;
}

export class PaymentsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaymentsListDataResponseDto {
  @ApiProperty({ type: PaymentItemDto, isArray: true })
  items!: PaymentItemDto[];

  @ApiProperty({ type: PaymentsPaginationDto })
  pagination!: PaymentsPaginationDto;
}

export class PaymentWebhookDataResponseDto {
  @ApiProperty()
  received!: boolean;

  @ApiProperty()
  handled!: boolean;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;
}

export class PaymentItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PaymentItemDataResponseDto })
  data!: PaymentItemDataResponseDto;
}

export class PaymentsListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PaymentsListDataResponseDto })
  data!: PaymentsListDataResponseDto;
}

export class PaymentWebhookSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PaymentWebhookDataResponseDto })
  data!: PaymentWebhookDataResponseDto;
}

export class AdminPaymentOpsRefundItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RefundType })
  refundType!: RefundType;

  @ApiProperty({ enum: RefundDestination })
  destination!: RefundDestination;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  providerRefundRef!: string | null;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty({ nullable: true })
  processedAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  customerWalletCreditedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminPaymentOpsSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty({ nullable: true })
  providerRoomId!: string | null;

  @ApiProperty({ nullable: true })
  providerSessionRef!: string | null;
}

export class AdminPaymentOpsSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amountSubtotal!: string;

  @ApiProperty()
  amountDiscount!: string;

  @ApiProperty()
  amountTotal!: string;

  @ApiProperty()
  amountFromWallet!: string;

  @ApiProperty()
  amountFromGateway!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  providerPaymentId!: string | null;

  @ApiProperty({ nullable: true })
  providerReference!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  initiatedAt!: string;

  @ApiProperty({ nullable: true })
  capturedAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  expiredAt!: string | null;
}

export class AdminPaymentOpsRefundSummaryDto {
  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  requestedCount!: number;

  @ApiProperty()
  processingCount!: number;

  @ApiProperty()
  succeededCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  cancelledCount!: number;

  @ApiProperty()
  totalRefundedAmount!: string;

  @ApiProperty({ nullable: true })
  lastRefundAt!: string | null;
}

export class AdminPaymentOpsEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ nullable: true })
  providerEventRef!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminPaymentOpsItemDto {
  @ApiProperty({ type: AdminPaymentOpsSummaryDto })
  payment!: AdminPaymentOpsSummaryDto;

  @ApiProperty({ type: AdminPaymentOpsSessionDto, nullable: true })
  session!: AdminPaymentOpsSessionDto | null;

  @ApiProperty({ type: AdminPaymentOpsRefundSummaryDto })
  refundSummary!: AdminPaymentOpsRefundSummaryDto;

  @ApiProperty({ type: AdminPaymentOpsRefundItemDto, isArray: true })
  refunds!: AdminPaymentOpsRefundItemDto[];

  @ApiProperty({ type: AdminPaymentOpsEventDto, isArray: true })
  recentEvents!: AdminPaymentOpsEventDto[];
}

export class AdminPaymentOpsDataResponseDto {
  @ApiProperty({ type: AdminPaymentOpsItemDto })
  item!: AdminPaymentOpsItemDto;
}

export class AdminPaymentOpsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminPaymentOpsDataResponseDto })
  data!: AdminPaymentOpsDataResponseDto;
}
