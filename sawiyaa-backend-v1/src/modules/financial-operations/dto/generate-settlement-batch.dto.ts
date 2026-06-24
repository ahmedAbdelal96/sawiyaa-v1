import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class GenerateSettlementBatchDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  periodYear!: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({ example: 'EGP' })
  @IsString()
  @Length(3, 3)
  currencyCode!: string;
}
