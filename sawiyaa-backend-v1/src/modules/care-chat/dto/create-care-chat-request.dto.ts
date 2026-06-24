import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCareChatRequestDto {
  @ApiProperty({
    description: 'Practitioner public slug',
  })
  @IsString()
  @MaxLength(191)
  practitionerSlug!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Optional linked session id',
  })
  @IsOptional()
  @IsUUID()
  relatedSessionId?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
