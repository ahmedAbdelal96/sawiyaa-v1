import { ApiProperty } from '@nestjs/swagger';
import { AdminSessionManualDecisionItemDto } from './admin-session-manual-decision-response.dto';

export class AdminSessionManualDecisionListDataResponseDto {
  @ApiProperty({ type: AdminSessionManualDecisionItemDto, isArray: true })
  items!: AdminSessionManualDecisionItemDto[];

  @ApiProperty()
  totalCount!: number;
}

export class AdminSessionManualDecisionListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionManualDecisionListDataResponseDto })
  data!: AdminSessionManualDecisionListDataResponseDto;
}
