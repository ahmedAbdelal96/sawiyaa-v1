import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class SessionPaymentCapabilitiesItemDto {
  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ enum: ['legacy', 'intention'] })
  checkoutFlow!: 'legacy' | 'intention';

  @ApiProperty({
    type: Object,
    isArray: true,
    description:
      'Registry entries for Paymob checkout methods enabled by config.',
  })
  methods!: Array<{
    key: string;
    label: string;
    type: string;
    enabled: boolean;
  }>;

  @ApiProperty({ type: String, isArray: true })
  supportedMethods!: string[];

  @ApiProperty({ nullable: true })
  defaultMethod!: string | null;

  @ApiProperty({ nullable: true })
  currency!: string | null;

  @ApiProperty({ enum: ['EGYPT_LOCAL', 'INTERNATIONAL'], nullable: true })
  regionalPricingMode!: 'EGYPT_LOCAL' | 'INTERNATIONAL' | null;

  @ApiProperty({ nullable: true })
  resolvedCountryIsoCode!: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Normalized, UI-safe methods list for the resolved provider context.',
  })
  normalizedMethods!: Array<{
    key: string;
    type: string;
    label: string;
    enabled: boolean;
    description?: string | null;
    brands?: string[];
  }>;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Wallet capability snapshot for this payment context. Present even when provider is external.',
  })
  wallet!: {
    enabled: boolean;
    availableBalance: string | null;
    currencyCode: string | null;
    canUseFullAmount: boolean;
    canUsePartialAmount: boolean;
  };
}

export class SessionPaymentCapabilitiesDataResponseDto {
  @ApiProperty({ type: SessionPaymentCapabilitiesItemDto })
  item!: SessionPaymentCapabilitiesItemDto;
}

export class SessionPaymentCapabilitiesSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionPaymentCapabilitiesDataResponseDto })
  data!: SessionPaymentCapabilitiesDataResponseDto;
}
