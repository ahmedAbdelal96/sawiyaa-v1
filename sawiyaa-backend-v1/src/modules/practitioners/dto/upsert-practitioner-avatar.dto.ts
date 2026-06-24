import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertPractitionerAvatarDto {
  @ApiProperty({
    example: 'https://cdn.fayed.app/avatars/practitioner-123.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({
    require_protocol: true,
  })
  avatarUrl?: string;
}
