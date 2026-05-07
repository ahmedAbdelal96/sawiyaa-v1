import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReconcileSessionPaymentReturnDto {
  @ApiPropertyOptional({
    required: false,
    nullable: true,
    description:
      'Provider reference returned by the hosted checkout return flow, typically the Paymob order id.',
  })
  @IsOptional()
  @IsString()
  providerReference?: string | null;

  @ApiPropertyOptional({
    required: false,
    nullable: true,
    description:
      'Normalized redirect outcome from the payment provider return URL.',
  })
  @IsOptional()
  @IsString()
  redirectStatus?: string | null;

  @ApiPropertyOptional({
    required: false,
    nullable: true,
    description: 'Optional success flag from the provider return URL.',
  })
  @IsOptional()
  @IsBoolean()
  success?: boolean | null;

  @ApiPropertyOptional({
    required: false,
    nullable: true,
    description: 'Optional pending flag from the provider return URL.',
  })
  @IsOptional()
  @IsBoolean()
  pending?: boolean | null;
}
