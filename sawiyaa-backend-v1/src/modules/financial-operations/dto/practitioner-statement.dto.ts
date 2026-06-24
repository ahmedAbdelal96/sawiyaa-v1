import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ListPractitionerStatementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'EARNING', 'PAYOUT'],
    default: 'ALL',
  })
  @IsOptional()
  @IsIn(['ALL', 'EARNING', 'PAYOUT'])
  rowType?: 'ALL' | 'EARNING' | 'PAYOUT' = 'ALL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
