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
