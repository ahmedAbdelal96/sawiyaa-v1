import { ApiProperty } from '@nestjs/swagger';

export class SessionAttendanceWebhookDataResponseDto {
  @ApiProperty({ example: true })
  received!: true;

  @ApiProperty({ example: true })
  handled!: boolean;

  @ApiProperty({
    enum: [
      'ATTENDANCE_EVENT_STORED',
      'ATTENDANCE_EVENT_DUPLICATE',
      'ATTENDANCE_EVENT_UNSUPPORTED',
      'ATTENDANCE_EVENT_SESSION_UNMAPPABLE',
    ],
  })
  reason!:
    | 'ATTENDANCE_EVENT_STORED'
    | 'ATTENDANCE_EVENT_DUPLICATE'
    | 'ATTENDANCE_EVENT_UNSUPPORTED'
    | 'ATTENDANCE_EVENT_SESSION_UNMAPPABLE';

  @ApiProperty({ nullable: true })
  sessionId!: string | null;
}

export class SessionAttendanceWebhookSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionAttendanceWebhookDataResponseDto })
  data!: SessionAttendanceWebhookDataResponseDto;
}
