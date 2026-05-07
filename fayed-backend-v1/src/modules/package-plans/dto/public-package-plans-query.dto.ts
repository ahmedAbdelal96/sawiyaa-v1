import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, Min, Max, IsInt } from 'class-validator';

export class PublicPackagePlansQueryDto {
  @ApiPropertyOptional({
    description: 'Session duration in minutes used for the public price preview',
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(60)
  durationMinutes?: number;

  @ApiPropertyOptional({
    enum: SessionMode,
    description: 'Session mode used for the public price preview',
    default: SessionMode.VIDEO,
  })
  @IsOptional()
  @IsEnum(SessionMode)
  sessionMode?: SessionMode;

  @ApiPropertyOptional({
    description: 'Selected pricing currency code for the public price preview',
    default: 'EGP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}
