import { ApiProperty } from '@nestjs/swagger';

export class AdminFinanceHubCurrencyAmountDto {
  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  amount!: string;
}

export class AdminFinanceHubSummaryDataDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  pendingSessionEarningReviewsCount!: number;

  @ApiProperty({ type: AdminFinanceHubCurrencyAmountDto, isArray: true })
  pendingSessionEarningReviewsAmountByCurrency!: AdminFinanceHubCurrencyAmountDto[];

  @ApiProperty()
  openPractitionerRecoveriesCount!: number;

  @ApiProperty({ type: AdminFinanceHubCurrencyAmountDto, isArray: true })
  openPractitionerRecoveriesAmountByCurrency!: AdminFinanceHubCurrencyAmountDto[];

  @ApiProperty()
  readyPractitionerSettlementsCount!: number;

  @ApiProperty({ type: AdminFinanceHubCurrencyAmountDto, isArray: true })
  readyPractitionerSettlementsAmountByCurrency!: AdminFinanceHubCurrencyAmountDto[];

  @ApiProperty()
  pendingReconciliationReviewsCount!: number;

  @ApiProperty()
  openAccountingIssuesCount!: number;
}

export class AdminFinanceHubSummarySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminFinanceHubSummaryDataDto })
  data!: AdminFinanceHubSummaryDataDto;
}
