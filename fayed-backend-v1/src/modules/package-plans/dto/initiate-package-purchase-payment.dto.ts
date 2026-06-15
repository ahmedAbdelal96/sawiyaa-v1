import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class InitiatePackagePurchasePaymentDto {
  @ApiProperty({
    required: true,
    example: 'refund-policy-id-uuid',
    description:
      'Accepted package refund policy id. Payment initiation is blocked unless the current active package refund policy was explicitly accepted.',
  })
  @IsUUID()
  @IsNotEmpty()
  acceptedRefundPolicyId!: string;

  @ApiProperty({
    required: false,
    example: 'http://localhost:3000/en/patient/package-purchases/123',
    description:
      'Optional trusted return URL for hosted package checkout flows. When provided by a trusted caller surface, the payment provider can return directly to that same surface instead of the public default page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUrl?: string;
}
