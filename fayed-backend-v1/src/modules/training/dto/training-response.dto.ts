import { ApiProperty } from '@nestjs/swagger';
import {
  AttendanceStatus,
  ContentLocale,
  CourseScheduleStatus,
  CourseStatus,
  CourseType,
  CourseVisibility,
  EnrollmentAttendanceStatus,
  EnrollmentStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import {
  TrainingEnrollmentAvailabilityReason,
  TrainingJoinBlockedReason,
} from '../types/training.types';

export class TrainingSeoDto {
  @ApiProperty({ nullable: true })
  metaTitle!: string | null;

  @ApiProperty({ nullable: true })
  metaDescription!: string | null;
}

export class TrainingsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TrainingScheduleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduleCode!: string;

  @ApiProperty({ enum: CourseScheduleStatus })
  status!: CourseScheduleStatus;

  @ApiProperty({ nullable: true })
  enrollmentOpenAt!: string | null;

  @ApiProperty({ nullable: true })
  enrollmentCloseAt!: string | null;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({ nullable: true })
  maxEnrollments!: number | null;

  @ApiProperty({ nullable: true })
  availableSeats!: number | null;

  @ApiProperty()
  isEnrollmentOpen!: boolean;

  @ApiProperty({ enum: TrainingEnrollmentAvailabilityReason })
  enrollmentAvailabilityReason!: TrainingEnrollmentAvailabilityReason;
}

export class PublicTrainingListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  shortDescription!: string | null;

  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ enum: CourseType })
  courseType!: CourseType;
}

export class PublicTrainingDetailsDto extends PublicTrainingListItemDto {
  @ApiProperty({ nullable: true })
  fullDescription!: string | null;

  @ApiProperty({ type: TrainingSeoDto })
  seo!: TrainingSeoDto;

  @ApiProperty({ enum: ContentLocale })
  locale!: ContentLocale;

  @ApiProperty({ type: TrainingScheduleDto, isArray: true })
  schedules!: TrainingScheduleDto[];
}

export class AdminTrainingItemDto extends PublicTrainingDetailsDto {
  @ApiProperty({ enum: CourseStatus })
  status!: CourseStatus;

  @ApiProperty({ enum: CourseVisibility })
  visibility!: CourseVisibility;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ nullable: true })
  createdAt!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class AdminTrainingScheduleDto extends TrainingScheduleDto {
  @ApiProperty({ nullable: true })
  externalRoomProvider!: string | null;

  @ApiProperty({ nullable: true })
  externalRoomJoinUrl!: string | null;

  @ApiProperty({ nullable: true })
  externalRoomHostUrl!: string | null;
}

export class AdminTrainingScheduleListDataDto {
  @ApiProperty({ type: () => AdminTrainingScheduleDto, isArray: true })
  items!: AdminTrainingScheduleDto[];
}

export class AdminTrainingScheduleItemDataDto {
  @ApiProperty({ type: () => AdminTrainingScheduleDto })
  item!: AdminTrainingScheduleDto;
}

export class EnrollmentPaymentSnapshotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  checkoutUrl!: string | null;

  @ApiProperty({ nullable: true })
  clientSecret!: string | null;
}

export class PatientTrainingEnrollmentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  courseId!: string;

  @ApiProperty()
  scheduleId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ nullable: true })
  paymentStatus!: string | null;

  @ApiProperty()
  enrolledAt!: string;

  @ApiProperty({ nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ nullable: true })
  refundedAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ enum: EnrollmentAttendanceStatus })
  attendanceStatus!: EnrollmentAttendanceStatus;

  @ApiProperty()
  courseTitle!: string;

  @ApiProperty()
  scheduleCode!: string;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;

  @ApiProperty({ type: EnrollmentPaymentSnapshotDto, nullable: true })
  payment!: EnrollmentPaymentSnapshotDto | null;
}

export class PatientTrainingEnrollmentListDataDto {
  @ApiProperty({ type: PatientTrainingEnrollmentItemDto, isArray: true })
  items!: PatientTrainingEnrollmentItemDto[];

  @ApiProperty({ type: () => TrainingsPaginationDto })
  pagination!: TrainingsPaginationDto;
}

export class PatientTrainingEnrollmentItemDataDto {
  @ApiProperty({ type: PatientTrainingEnrollmentItemDto })
  item!: PatientTrainingEnrollmentItemDto;
}

export class PatientTrainingJoinAccessItemDto {
  @ApiProperty()
  enrollmentId!: string;

  @ApiProperty()
  courseId!: string;

  @ApiProperty()
  scheduleId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ enum: CourseScheduleStatus })
  scheduleStatus!: CourseScheduleStatus;

  @ApiProperty()
  canJoin!: boolean;

  @ApiProperty({ nullable: true, enum: TrainingJoinBlockedReason })
  blockedReason!: TrainingJoinBlockedReason | null;

  @ApiProperty({ nullable: true })
  provider!: string | null;

  @ApiProperty({ nullable: true })
  joinUrl!: string | null;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;
}

export class AdminTrainingScheduleEnrollmentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  patientDisplayName!: string | null;

  @ApiProperty()
  scheduleId!: string;

  @ApiProperty()
  scheduleCode!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({ enum: EnrollmentAttendanceStatus })
  attendanceStatus!: EnrollmentAttendanceStatus;

  @ApiProperty({ nullable: true })
  paymentStatus!: string | null;

  @ApiProperty()
  enrolledAt!: string;

  @ApiProperty({ nullable: true })
  startsAt!: string | null;

  @ApiProperty({ nullable: true })
  endsAt!: string | null;
}

export class AdminTrainingScheduleEnrollmentListDataDto {
  @ApiProperty({ type: AdminTrainingScheduleEnrollmentItemDto, isArray: true })
  items!: AdminTrainingScheduleEnrollmentItemDto[];

  @ApiProperty({ type: () => TrainingsPaginationDto })
  pagination!: TrainingsPaginationDto;
}

export class AdminTrainingScheduleEnrollmentItemDataDto {
  @ApiProperty({ type: AdminTrainingScheduleEnrollmentItemDto })
  item!: AdminTrainingScheduleEnrollmentItemDto;
}

export class PatientTrainingJoinAccessItemDataDto {
  @ApiProperty({ type: PatientTrainingJoinAccessItemDto })
  item!: PatientTrainingJoinAccessItemDto;
}

export class PublicTrainingListDataDto {
  @ApiProperty({ type: PublicTrainingListItemDto, isArray: true })
  items!: PublicTrainingListItemDto[];

  @ApiProperty({ type: () => TrainingsPaginationDto })
  pagination!: TrainingsPaginationDto;
}

export class PublicTrainingItemDataDto {
  @ApiProperty({ type: PublicTrainingDetailsDto })
  item!: PublicTrainingDetailsDto;
}

export class AdminTrainingListDataDto {
  @ApiProperty({ type: AdminTrainingItemDto, isArray: true })
  items!: AdminTrainingItemDto[];

  @ApiProperty({ type: () => TrainingsPaginationDto })
  pagination!: TrainingsPaginationDto;
}

export class AdminTrainingItemDataDto {
  @ApiProperty({ type: AdminTrainingItemDto })
  item!: AdminTrainingItemDto;
}

export class PublicTrainingListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicTrainingListDataDto })
  data!: PublicTrainingListDataDto;
}

export class PublicTrainingItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicTrainingItemDataDto })
  data!: PublicTrainingItemDataDto;
}

export class AdminTrainingListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingListDataDto })
  data!: AdminTrainingListDataDto;
}

export class AdminTrainingItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingItemDataDto })
  data!: AdminTrainingItemDataDto;
}

export class AdminTrainingScheduleListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingScheduleListDataDto })
  data!: AdminTrainingScheduleListDataDto;
}

export class AdminTrainingScheduleItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingScheduleItemDataDto })
  data!: AdminTrainingScheduleItemDataDto;
}

export class PatientTrainingEnrollmentListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientTrainingEnrollmentListDataDto })
  data!: PatientTrainingEnrollmentListDataDto;
}

export class PatientTrainingEnrollmentItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientTrainingEnrollmentItemDataDto })
  data!: PatientTrainingEnrollmentItemDataDto;
}

export class PatientTrainingJoinAccessItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientTrainingJoinAccessItemDataDto })
  data!: PatientTrainingJoinAccessItemDataDto;
}

export class AdminTrainingScheduleEnrollmentListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingScheduleEnrollmentListDataDto })
  data!: AdminTrainingScheduleEnrollmentListDataDto;
}

export class AdminTrainingScheduleEnrollmentItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminTrainingScheduleEnrollmentItemDataDto })
  data!: AdminTrainingScheduleEnrollmentItemDataDto;
}
