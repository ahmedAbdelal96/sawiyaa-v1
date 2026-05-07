import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

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
}
