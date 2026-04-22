import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketPriority, SupportTicketType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum AdminSupportReporterRoleDto {
  PATIENT = 'PATIENT',
  PRACTITIONER = 'PRACTITIONER',
}

export class CreateAdminSupportTicketForReporterDto {
  @ApiProperty()
  @IsUUID()
  reporterUserId!: string;

  @ApiProperty({ enum: AdminSupportReporterRoleDto })
  @IsEnum(AdminSupportReporterRoleDto)
  reporterRole!: AdminSupportReporterRoleDto;

  @ApiPropertyOptional({
    enum: SupportTicketType,
    default: SupportTicketType.GENERAL,
  })
  @IsOptional()
  @IsEnum(SupportTicketType)
  category?: SupportTicketType;

  @ApiPropertyOptional({ example: 'متابعة من فريق الدعم بخصوص بلاغك' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  subject?: string;

  @ApiPropertyOptional({
    example: 'نرجو تزويدنا بتفاصيل إضافية حتى نتمكن من المساعدة.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: SupportTicketPriority,
    default: SupportTicketPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;
}
