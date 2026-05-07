import { ApiProperty } from '@nestjs/swagger';
import { PaymentItemDto } from './payment-response.dto';

export class ReconcileSessionPaymentReturnDataResponseDto {
  @ApiProperty()
  reconciled!: boolean;

  @ApiProperty({ type: PaymentItemDto, nullable: true })
  item!: PaymentItemDto | null;
}

export class ReconcileSessionPaymentReturnSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: ReconcileSessionPaymentReturnDataResponseDto })
  data!: ReconcileSessionPaymentReturnDataResponseDto;
}
