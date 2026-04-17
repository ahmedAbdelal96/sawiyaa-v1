import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ConversationParticipantRole } from '@prisma/client';

export enum GeneralChatTargetRoleDto {
  PATIENT = 'PATIENT',
  PRACTITIONER = 'PRACTITIONER',
}

export class CreateGeneralChatConversationDto {
  @ApiProperty()
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({ enum: GeneralChatTargetRoleDto })
  @IsEnum(GeneralChatTargetRoleDto)
  targetRole!: GeneralChatTargetRoleDto;

  @ApiPropertyOptional({
    description:
      'Optional session scope for post-booking operational chat between the same patient-practitioner pair.',
  })
  @IsOptional()
  @IsUUID()
  linkedSessionId?: string;
}

export class GeneralChatParticipantDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ConversationParticipantRole })
  role!: ConversationParticipantRole;
}

export class GeneralChatConversationIdentityDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  conversationRef!: string;

  @ApiProperty({ enum: ['SYSTEM'] })
  conversationType!: 'SYSTEM';

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  linkedSessionId!: string | null;

  @ApiProperty({ type: GeneralChatParticipantDto, isArray: true })
  participants!: GeneralChatParticipantDto[];

  @ApiProperty()
  wasCreated!: boolean;
}

export class GeneralChatConversationDataDto {
  @ApiProperty({ type: GeneralChatConversationIdentityDto })
  @Type(() => GeneralChatConversationIdentityDto)
  item!: GeneralChatConversationIdentityDto;
}

export class GeneralChatConversationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: GeneralChatConversationDataDto })
  @Type(() => GeneralChatConversationDataDto)
  data!: GeneralChatConversationDataDto;
}

