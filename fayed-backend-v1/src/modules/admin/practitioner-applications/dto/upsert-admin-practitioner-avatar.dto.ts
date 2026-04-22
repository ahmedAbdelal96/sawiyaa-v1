import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertAdminPractitionerAvatarDto {
  @ApiProperty({
    example: 'https://cdn.fayed.app/avatars/practitioner-123.jpg',
  })
  @IsString()
  @MaxLength(500)
  @IsUrl({
    require_protocol: true,
  })
  avatarUrl!: string;
}
