import { ApiProperty } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PackagePurchaseSessionSlotDto } from './package-purchase-session-slot.dto';

export class CreatePackagePurchaseDto {
  @ApiProperty({
    example: 'SESSIONS_4',
    description: 'Stable standardized package plan code',
  })
  @IsString()
  @MaxLength(100)
  packagePlanCode!: string;

  @ApiProperty({
    example: 'dr-youssef-abdallah',
    description: 'Public practitioner slug',
  })
  @IsString()
  @MaxLength(191)
  practitionerSlug!: string;

  @ApiProperty({
    enum: [30, 60],
    example: 60,
  })
  @IsInt()
  @IsIn([30, 60])
  durationMinutes!: 30 | 60;

  @ApiProperty({
    enum: SessionMode,
    example: SessionMode.VIDEO,
  })
  @IsEnum(SessionMode)
  sessionMode!: SessionMode;

  @ApiProperty({
    type: [PackagePurchaseSessionSlotDto],
    description:
      'Exactly one slot per package session count, each with a requested UTC start datetime',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => PackagePurchaseSessionSlotDto)
  selectedSessionSlots!: PackagePurchaseSessionSlotDto[];
}
