import { ApiProperty } from '@nestjs/swagger';

export class PatientSessionSummaryItemResponseDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  pendingPayment!: number;

  @ApiProperty()
  pendingPractitionerResponse!: number;

  @ApiProperty()
  confirmed!: number;

  @ApiProperty()
  upcoming!: number;

  @ApiProperty()
  readyToJoin!: number;

  @ApiProperty()
  inProgress!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  cancelled!: number;

  @ApiProperty()
  noShow!: number;

  @ApiProperty()
  expired!: number;

  @ApiProperty()
  refundPending!: number;

  @ApiProperty()
  refunded!: number;

  @ApiProperty()
  actionRequired!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  history!: number;

  @ApiProperty()
  paymentExpired!: number;
}

export class PatientSessionSummaryDataResponseDto {
  @ApiProperty({ type: PatientSessionSummaryItemResponseDto })
  item!: PatientSessionSummaryItemResponseDto;
}

export class PatientSessionSummarySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientSessionSummaryDataResponseDto })
  data!: PatientSessionSummaryDataResponseDto;
}
