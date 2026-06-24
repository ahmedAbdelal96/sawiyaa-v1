import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ListAdminLedgerExplorerDto } from './list-admin-ledger-explorer.dto';

export class ExportAdminLedgerExplorerDto extends ListAdminLedgerExplorerDto {
  @ApiPropertyOptional({
    description:
      'Maximum number of ledger rows to export in one file. Keeps synchronous exports bounded.',
    minimum: 1,
    maximum: 5000,
    default: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  exportLimit?: number = 2000;
}
