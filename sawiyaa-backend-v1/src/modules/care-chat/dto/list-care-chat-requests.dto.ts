import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatApprovalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class ListCareChatRequestsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ChatApprovalStatus })
  @IsOptional()
  @IsEnum(ChatApprovalStatus)
  status?: ChatApprovalStatus;
}
