import { ApiProperty } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';

export class PackagePlanQuotePlanDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty()
  discountPercent!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ nullable: true })
  metadataJson!: unknown;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({
    type: Object,
  })
  counts!: {
    purchaseCount: number;
  };
}

export class PackagePlanQuoteDto {
  @ApiProperty()
  planCode!: string;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty()
  discountPercent!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty()
  selectedCurrencyCode!: string;

  @ApiProperty()
  selectedBaseSessionPrice!: string;

  @ApiProperty()
  undiscountedTotal!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  patientPayableTotal!: string;
}

export class PackagePlanQuotedItemDto {
  @ApiProperty({ type: PackagePlanQuotePlanDto })
  item!: PackagePlanQuotePlanDto;

  @ApiProperty({ type: PackagePlanQuoteDto })
  quote!: PackagePlanQuoteDto;
}

export class PackagePlanQuotedListDataDto {
  @ApiProperty({ type: [PackagePlanQuotedItemDto] })
  items!: PackagePlanQuotedItemDto[];
}

export class PackagePlanQuotedItemDataDto {
  @ApiProperty({ type: PackagePlanQuotedItemDto })
  item!: PackagePlanQuotedItemDto;
}

export class PackagePlanQuotedListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanQuotedListDataDto })
  data!: PackagePlanQuotedListDataDto;
}

export class PackagePlanQuotedItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanQuotedItemDataDto })
  data!: PackagePlanQuotedItemDataDto;
}
