import { ApiProperty } from '@nestjs/swagger';

export class AdminPractitionerAvatarResponseDto {
  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class AdminPractitionerAvatarSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AdminPractitionerAvatarResponseDto })
  avatar!: AdminPractitionerAvatarResponseDto;
}
