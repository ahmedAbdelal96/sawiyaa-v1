import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class UpdateRevenueShareRulesDto {
  @ApiProperty({ example: '30.00' })
  @IsNumberString()
  localPlatformRatePercent!: string;

  @ApiProperty({ example: '70.00' })
  @IsNumberString()
  localPractitionerRatePercent!: string;

  @ApiProperty({ example: '50.00' })
  @IsNumberString()
  crossBorderPlatformRatePercent!: string;

  @ApiProperty({ example: '50.00' })
  @IsNumberString()
  crossBorderPractitionerRatePercent!: string;
}
