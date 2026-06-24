import { ApiProperty } from '@nestjs/swagger';
import { PackagePlanViewModel } from '../types/package-plans.types';

export class PackagePlanItemDataDto {
  @ApiProperty()
  item!: PackagePlanViewModel;
}

export class PackagePlanListDataDto {
  @ApiProperty({ type: [Object] })
  items!: PackagePlanViewModel[];
}

export class PackagePlanItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanItemDataDto })
  data!: PackagePlanItemDataDto;
}

export class PackagePlanListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanListDataDto })
  data!: PackagePlanListDataDto;
}
