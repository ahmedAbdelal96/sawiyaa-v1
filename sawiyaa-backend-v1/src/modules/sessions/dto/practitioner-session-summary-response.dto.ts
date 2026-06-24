import { ApiProperty } from '@nestjs/swagger';

export class PractitionerSessionSummaryItemResponseDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  upcoming!: number;

  @ApiProperty()
  ready!: number;

  @ApiProperty()
  live!: number;

  @ApiProperty()
  closed!: number;

  @ApiProperty()
  actionRequired!: number;

  @ApiProperty()
  unavailable!: number;
}

export class PractitionerSessionSummaryDataResponseDto {
  @ApiProperty({ type: PractitionerSessionSummaryItemResponseDto })
  item!: PractitionerSessionSummaryItemResponseDto;
}

export class PractitionerSessionSummarySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerSessionSummaryDataResponseDto })
  data!: PractitionerSessionSummaryDataResponseDto;
}
