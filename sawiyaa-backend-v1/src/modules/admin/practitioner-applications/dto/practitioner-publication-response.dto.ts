import { ApiProperty } from '@nestjs/swagger';
import {
  PractitionerStatus,
  SessionMode,
  SessionStatus,
  UserStatus,
} from '@prisma/client';

export class PractitionerPublicationBlockerResponseDto {
  @ApiProperty() code!: string;
  @ApiProperty({ required: false }) field?: string;
  @ApiProperty() messageKey!: string;
}

export class PractitionerPublicationBookingImpactResponseDto {
  @ApiProperty() activeUpcomingCount!: number;
  @ApiProperty() scheduledTodayCount!: number;
  @ApiProperty({ nullable: true }) nearestUpcomingAt!: string | null;
  @ApiProperty({ type: 'array' }) upcomingBookings!: Array<{
    id: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    status: SessionStatus;
    sessionMode: SessionMode;
  }>;
}

export class PractitionerPublicationResponseDto {
  @ApiProperty() practitionerId!: string;
  @ApiProperty({ nullable: true }) displayName!: string | null;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: PractitionerStatus })
  practitionerStatus!: PractitionerStatus;
  @ApiProperty({ enum: UserStatus }) accountStatus!: UserStatus;
  @ApiProperty() isPublished!: boolean;
  @ApiProperty() isReadyForPublication!: boolean;
  @ApiProperty({
    type: PractitionerPublicationBlockerResponseDto,
    isArray: true,
  })
  blockers!: PractitionerPublicationBlockerResponseDto[];
  @ApiProperty({ type: PractitionerPublicationBookingImpactResponseDto })
  impact!: PractitionerPublicationBookingImpactResponseDto;
}

export class PractitionerPublicationSuccessResponseDto {
  @ApiProperty() message!: string;
  @ApiProperty({ type: PractitionerPublicationResponseDto })
  publication!: PractitionerPublicationResponseDto;
}
