import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserProfileLinksDto } from './current-user-summary-response.dto';

export class CurrentUserProfileLinksResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: CurrentUserProfileLinksDto })
  profileLinks!: CurrentUserProfileLinksDto;
}

export class CurrentUserProfileLinksEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentUserProfileLinksResponseDto })
  data!: CurrentUserProfileLinksResponseDto;
}
