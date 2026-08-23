import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PractitionerRequirementAdminAction {
  SATISFY = 'SATISFY',
  REJECT = 'REJECT',
  REOPEN = 'REOPEN',
}

export class UpdatePractitionerRequirementDto {
  @ApiProperty({ enum: PractitionerRequirementAdminAction })
  @IsEnum(PractitionerRequirementAdminAction)
  action!: PractitionerRequirementAdminAction;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
