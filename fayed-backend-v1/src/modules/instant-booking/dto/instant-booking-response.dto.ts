import { ApiProperty } from '@nestjs/swagger';
import { InstantBookingRequestStatus, SessionMode } from '@prisma/client';

export class InstantBookingPatientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class InstantBookingPractitionerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class InstantBookingRequestItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: InstantBookingRequestStatus })
  status!: InstantBookingRequestStatus;

  @ApiProperty()
  requestedDurationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ nullable: true })
  respondedAt!: string | null;

  @ApiProperty({ nullable: true })
  responseReason!: string | null;

  @ApiProperty({ nullable: true })
  createdSessionId!: string | null;

  @ApiProperty({ type: InstantBookingPractitionerSummaryDto })
  practitioner!: InstantBookingPractitionerSummaryDto;

  @ApiProperty({ type: InstantBookingPatientSummaryDto, nullable: true })
  patient!: InstantBookingPatientSummaryDto | null;
}

export class InstantBookingItemDataResponseDto {
  @ApiProperty({ type: InstantBookingRequestItemDto })
  item!: InstantBookingRequestItemDto;
}

export class InstantBookingItemsDataResponseDto {
  @ApiProperty({ type: InstantBookingRequestItemDto, isArray: true })
  items!: InstantBookingRequestItemDto[];
}

export class InstantBookingItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: InstantBookingItemDataResponseDto })
  data!: InstantBookingItemDataResponseDto;
}

export class InstantBookingItemsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: InstantBookingItemsDataResponseDto })
  data!: InstantBookingItemsDataResponseDto;
}
