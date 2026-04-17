import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserSecurityStateDto } from './current-user-summary-response.dto';

export class CurrentUserSecurityStateResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: CurrentUserSecurityStateDto })
  securityState!: CurrentUserSecurityStateDto;
}

export class CurrentUserSecurityStateEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentUserSecurityStateResponseDto })
  data!: CurrentUserSecurityStateResponseDto;
}
