import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, RefundType } from '@prisma/client';

export class RefundItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ enum: RefundType })
  refundType!: RefundType;

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

  @ApiProperty()
  createdAt!: string;
}

export class RefundItemDataResponseDto {
  @ApiProperty({ type: RefundItemDto })
  item!: RefundItemDto;
}

export class RefundListDataResponseDto {
  @ApiProperty({ type: RefundItemDto, isArray: true })
  items!: RefundItemDto[];
}

export class RefundItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RefundItemDataResponseDto })
  data!: RefundItemDataResponseDto;
}

export class RefundListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: RefundListDataResponseDto })
  data!: RefundListDataResponseDto;
}
