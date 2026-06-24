import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignSupportTicketDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Admin/support user id. Null/undefined means unassign.',
  })
  @IsOptional()
  @IsUUID()
  assignedAdminUserId?: string;
}
