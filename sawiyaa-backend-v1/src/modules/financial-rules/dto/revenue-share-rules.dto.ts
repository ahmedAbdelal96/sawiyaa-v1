import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateRevenueShareRulesDto {
  @ApiProperty({
    example: '30.00',
    description:
      'The single platform commission percentage. Practitioner share is derived as 100.00 minus this value.',
  })
  @Matches(/^\d{1,3}(?:\.\d{1,2})?$/)
  platformCommissionPercent!: string;

  @ApiProperty({
    example: 'Unify the platform split for future session allocations.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Opaque version returned by GET for optimistic concurrency.',
  })
  @IsString()
  expectedUpdatedAt?: string | null;
}
