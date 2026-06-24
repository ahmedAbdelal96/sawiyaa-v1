import { ApiProperty } from '@nestjs/swagger';
import { CouponItemDto } from './financial-rules-response.dto';

export class PractitionerCouponListPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PractitionerCouponListDataResponseDto {
  @ApiProperty({ type: [CouponItemDto] })
  items!: CouponItemDto[];

  @ApiProperty({ type: PractitionerCouponListPaginationDto })
  pagination!: PractitionerCouponListPaginationDto;
}

export class PractitionerCouponItemDataResponseDto {
  @ApiProperty({ type: CouponItemDto })
  item!: CouponItemDto;
}

export class PractitionerCouponRedemptionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty()
  patientDisplayName!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  grossAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  platformDiscountShare!: string;

  @ApiProperty()
  practitionerDiscountShare!: string;

  @ApiProperty()
  redeemedAt!: string;

  @ApiProperty()
  createdAt!: string;
}

export class PractitionerCouponRedemptionPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PractitionerCouponRedemptionListDataResponseDto {
  @ApiProperty({ type: [PractitionerCouponRedemptionItemDto] })
  items!: PractitionerCouponRedemptionItemDto[];

  @ApiProperty({ type: PractitionerCouponRedemptionPaginationDto })
  pagination!: PractitionerCouponRedemptionPaginationDto;
}

export class PractitionerCouponItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerCouponItemDataResponseDto })
  data!: PractitionerCouponItemDataResponseDto;
}

export class PractitionerCouponListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerCouponListDataResponseDto })
  data!: PractitionerCouponListDataResponseDto;
}

export class PractitionerCouponRedemptionListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerCouponRedemptionListDataResponseDto })
  data!: PractitionerCouponRedemptionListDataResponseDto;
}
