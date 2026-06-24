import { ApiProperty } from '@nestjs/swagger';
import {
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  CustomerWalletReservationStatus,
} from '@prisma/client';

export class CustomerWalletSummaryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  availableBalance!: string;

  @ApiProperty()
  reservedBalance!: string;

  @ApiProperty()
  lifetimeCredited!: string;

  @ApiProperty()
  lifetimeDebited!: string;

  @ApiProperty({ nullable: true })
  lastEntryAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CustomerWalletEntryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CustomerWalletEntryType })
  entryType!: CustomerWalletEntryType;

  @ApiProperty({ enum: CustomerWalletEntryDirection })
  direction!: CustomerWalletEntryDirection;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  refundId!: string | null;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ nullable: true })
  referenceId!: string | null;

  @ApiProperty()
  effectiveAt!: string;

  @ApiProperty()
  createdAt!: string;
}

export class CustomerWalletReservationItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CustomerWalletReservationStatus })
  status!: CustomerWalletReservationStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ nullable: true })
  capturedAt!: string | null;

  @ApiProperty({ nullable: true })
  releasedAt!: string | null;
}

export class CustomerWalletSummaryDataResponseDto {
  @ApiProperty({ type: CustomerWalletSummaryItemDto, nullable: true })
  item!: CustomerWalletSummaryItemDto | null;
}

export class CustomerWalletEntriesPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CustomerWalletEntriesDataResponseDto {
  @ApiProperty({ type: CustomerWalletEntryItemDto, isArray: true })
  items!: CustomerWalletEntryItemDto[];

  @ApiProperty({ type: CustomerWalletEntriesPaginationDto })
  pagination!: CustomerWalletEntriesPaginationDto;
}

export class CustomerWalletSummarySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CustomerWalletSummaryDataResponseDto })
  data!: CustomerWalletSummaryDataResponseDto;
}

export class CustomerWalletEntriesSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CustomerWalletEntriesDataResponseDto })
  data!: CustomerWalletEntriesDataResponseDto;
}
