import { ApiProperty } from '@nestjs/swagger';

export class StepUpVerifiedEnvelopeResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;
}
