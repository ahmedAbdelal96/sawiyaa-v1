import {
  Body,
  Controller,
  BadRequestException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { CreateAcademyProgramDto } from '../dto/create-academy-program.dto';
import { CreateAcademyProgramSessionDto } from '../dto/create-academy-program-session.dto';
import { CreateAdminAcademyProgramEnrollmentDto } from '../dto/create-admin-academy-program-enrollment.dto';
import { BulkAcademyProgramEnrollmentActionDto } from '../dto/bulk-academy-program-enrollment-action.dto';
import { ListAdminAcademyProgramEnrollmentsDto } from '../dto/list-admin-academy-program-enrollments.dto';
import { ListAdminAcademyProgramAttendanceDto } from '../dto/list-admin-academy-program-attendance.dto';
import { ListAdminAcademyProgramsDto } from '../dto/list-admin-academy-programs.dto';
import { SaveAdminAcademyProgramAttendanceDto } from '../dto/save-admin-academy-program-attendance.dto';
import { UpdateAcademyProgramEnrollmentLearnerDto } from '../dto/update-academy-program-enrollment-learner.dto';
import { UpdateAcademyProgramDto } from '../dto/update-academy-program.dto';
import { UpdateAcademyProgramSessionDto } from '../dto/update-academy-program-session.dto';
import { ArchiveAcademyProgramUseCase } from '../use-cases/archive-academy-program.use-case';
import { CreateAcademyProgramSessionUseCase } from '../use-cases/create-academy-program-session.use-case';
import { CreateAcademyProgramUseCase } from '../use-cases/create-academy-program.use-case';
import { GetAdminAcademyProgramUseCase } from '../use-cases/get-admin-academy-program.use-case';
import { GetAdminAcademyProgramAttendanceUseCase } from '../use-cases/get-admin-academy-program-attendance.use-case';
import { GetAdminAcademyProgramEnrollmentUseCase } from '../use-cases/get-admin-academy-program-enrollment.use-case';
import { ListAdminAcademyProgramsUseCase } from '../use-cases/list-admin-academy-programs.use-case';
import { ListAdminAcademyProgramEnrollmentsUseCase } from '../use-cases/list-admin-academy-program-enrollments.use-case';
import { CreateAdminAcademyProgramEnrollmentUseCase } from '../use-cases/create-admin-academy-program-enrollment.use-case';
import { ManageAdminAcademyProgramEnrollmentsUseCase } from '../use-cases/manage-admin-academy-program-enrollments.use-case';
import { PublishAcademyProgramUseCase } from '../use-cases/publish-academy-program.use-case';
import { GetAcademyProgramEnrollmentCertificateFileUseCase } from '../use-cases/get-academy-program-enrollment-certificate-file.use-case';
import { SaveAdminAcademyProgramAttendanceUseCase } from '../use-cases/save-admin-academy-program-attendance.use-case';
import { UploadAdminAcademyProgramEnrollmentCertificateUseCase } from '../use-cases/upload-admin-academy-program-enrollment-certificate.use-case';
import { UpdateAcademyProgramSessionUseCase } from '../use-cases/update-academy-program-session.use-case';
import { UpdateAcademyProgramUseCase } from '../use-cases/update-academy-program.use-case';
import { UpdateAdminAcademyProgramEnrollmentLearnerUseCase } from '../use-cases/update-admin-academy-program-enrollment-learner.use-case';
import { AcademyProgramCoverStorageService } from '../services/academy-program-cover-storage.service';

const MAX_COVER_IMAGE_BYTES = 10 * 1024 * 1024;

@ApiTags('Academy')
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/academy')
export class AdminAcademyProgramsController {
  constructor(
    private readonly listAdminAcademyProgramsUseCase: ListAdminAcademyProgramsUseCase,
    private readonly getAdminAcademyProgramUseCase: GetAdminAcademyProgramUseCase,
    private readonly listAdminAcademyProgramEnrollmentsUseCase: ListAdminAcademyProgramEnrollmentsUseCase,
    private readonly getAdminAcademyProgramEnrollmentUseCase: GetAdminAcademyProgramEnrollmentUseCase,
    private readonly manageAdminAcademyProgramEnrollmentsUseCase: ManageAdminAcademyProgramEnrollmentsUseCase,
    private readonly createAdminAcademyProgramEnrollmentUseCase: CreateAdminAcademyProgramEnrollmentUseCase,
    private readonly updateAdminAcademyProgramEnrollmentLearnerUseCase: UpdateAdminAcademyProgramEnrollmentLearnerUseCase,
    private readonly getAdminAcademyProgramAttendanceUseCase: GetAdminAcademyProgramAttendanceUseCase,
    private readonly saveAdminAcademyProgramAttendanceUseCase: SaveAdminAcademyProgramAttendanceUseCase,
    private readonly uploadAdminAcademyProgramEnrollmentCertificateUseCase: UploadAdminAcademyProgramEnrollmentCertificateUseCase,
    private readonly getAcademyProgramEnrollmentCertificateFileUseCase: GetAcademyProgramEnrollmentCertificateFileUseCase,
    private readonly createAcademyProgramUseCase: CreateAcademyProgramUseCase,
    private readonly updateAcademyProgramUseCase: UpdateAcademyProgramUseCase,
    private readonly publishAcademyProgramUseCase: PublishAcademyProgramUseCase,
    private readonly archiveAcademyProgramUseCase: ArchiveAcademyProgramUseCase,
    private readonly createAcademyProgramSessionUseCase: CreateAcademyProgramSessionUseCase,
    private readonly updateAcademyProgramSessionUseCase: UpdateAcademyProgramSessionUseCase,
    private readonly academyProgramCoverStorageService: AcademyProgramCoverStorageService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Post('programs/cover-upload')
  @ApiOperation({ summary: 'Upload academy program cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cover image uploaded successfully' })
  @ApiBadRequestResponse({ description: 'Missing file, invalid type, or file too large' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_COVER_IMAGE_BYTES } }))
  uploadProgramCover(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (!file?.buffer || file.buffer.length <= 0) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.coverFileRequired',
        error: 'ACADEMY_PROGRAM_COVER_FILE_REQUIRED',
      });
    }

    if (file.size > MAX_COVER_IMAGE_BYTES) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.coverFileTooLarge',
        error: 'ACADEMY_PROGRAM_COVER_FILE_TOO_LARGE',
      });
    }

    if (!this.academyProgramCoverStorageService.isAllowedMimeType(file.mimetype)) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.coverInvalidType',
        error: 'ACADEMY_PROGRAM_COVER_INVALID_TYPE',
      });
    }

    return this.academyProgramCoverStorageService.saveCover(file.buffer, file.mimetype).then((url) => {
      this.securityAuditService.logAsync({
        action: 'academy.program.cover.upload',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: currentUser.id,
        actorRoles: currentUser.roles,
        resourceType: 'AcademyProgram',
        resourceId: null,
        targetUserId: null,
        metadata: {
          fileName: file.originalname ?? null,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
        },
      });

      return {
        success: true as const,
        data: { url },
      };
    });
  }

  @Get('programs')
  @ApiOperation({ summary: 'List academy programs for admin management' })
  list(@Query() query: ListAdminAcademyProgramsDto) {
    return this.listAdminAcademyProgramsUseCase.execute(query);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get academy program details for admin management' })
  getProgram(@Param('id') programId: string) {
    return this.getAdminAcademyProgramUseCase.execute({ programId });
  }

  @Get('programs/:id/enrollments')
  @ApiOperation({ summary: 'List academy program enrollments for admin management' })
  listProgramEnrollments(
    @Param('id') academyProgramId: string,
    @Query() query: ListAdminAcademyProgramEnrollmentsDto,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.listAdminAcademyProgramEnrollmentsUseCase.execute({
      academyProgramId,
      ...query,
      locale,
    });
  }

  @Get('programs/:id/attendance')
  @ApiOperation({ summary: 'Get academy program attendance for admin management' })
  listProgramAttendance(
    @Param('id') programId: string,
    @Query() query: ListAdminAcademyProgramAttendanceDto,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.getAdminAcademyProgramAttendanceUseCase.execute({
      programId,
      locale,
      sessionId: query.sessionId ?? null,
    });
  }

  @Get('program-enrollments/:id')
  @ApiOperation({ summary: 'Get academy program enrollment details for admin management' })
  getProgramEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.getAdminAcademyProgramEnrollmentUseCase.execute({
      enrollmentId,
      locale,
    });
  }

  @Get('programs/:id/enrollments/export')
  @ApiOperation({ summary: 'Export academy program enrollments for admin management' })
  exportProgramEnrollments(
    @Param('id') academyProgramId: string,
    @Query() query: ListAdminAcademyProgramEnrollmentsDto,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.manageAdminAcademyProgramEnrollmentsUseCase.exportEnrollments({
      academyProgramId,
      ...query,
      locale,
    });
  }

  @Post('programs/:id/enrollments/manual')
  @RequireStepUp('academy.programEnrollment.manualCreate')
  @ApiOperation({ summary: 'Create a manual academy program enrollment' })
  createManualProgramEnrollment(
    @Param('id') programId: string,
    @Body() body: CreateAdminAcademyProgramEnrollmentDto,
    @CurrentLocale() locale: 'ar' | 'en',
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createAdminAcademyProgramEnrollmentUseCase
      .execute({
        programId,
        locale,
        actorUserId: currentUser.id,
        payload: body,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.programEnrollment.manualCreate',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgramEnrollment',
          resourceId: result.item.id,
          targetUserId: result.item.userId,
          metadata: {
            academyProgramId: programId,
            sourceLabel: 'admin-manual',
          },
        });

        return result;
      });
  }

  @Patch('program-enrollments/:id/learner')
  @ApiOperation({ summary: 'Update academy program enrollment learner details' })
  updateProgramEnrollmentLearner(
    @Param('id') enrollmentId: string,
    @Body() body: UpdateAcademyProgramEnrollmentLearnerDto,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.updateAdminAcademyProgramEnrollmentLearnerUseCase.execute({
      enrollmentId,
      locale,
      payload: body,
    });
  }

  @Post('program-enrollments/:id/certificate')
  @RequireStepUp('academy.programEnrollment.certificate.manage')
  @Permissions(PermissionKey.PATIENTS_UPDATE_ADMIN)
  @ApiOperation({ summary: 'Upload academy program enrollment certificate PDF' })
  @ApiParam({ name: 'id', description: 'Academy program enrollment id' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Certificate uploaded successfully' })
  @ApiBadRequestResponse({ description: 'Missing file, invalid type, or file too large' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Enrollment was not found' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadProgramEnrollmentCertificate(
    @Param('id') enrollmentId: string,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
    @CurrentLocale() locale: 'ar' | 'en',
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.uploadAdminAcademyProgramEnrollmentCertificateUseCase
      .execute({
        enrollmentId,
        locale,
        actorUserId: currentUser.id,
        file,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.programEnrollment.certificate.upload',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgramEnrollment',
          resourceId: result.item.id,
          targetUserId: result.item.userId,
          metadata: {
            academyProgramId: result.item.program.id,
            certificateStatus: result.item.certificate.status,
            certificateUploadedAt: result.item.certificate.uploadedAt,
          },
        });

        return result;
      });
  }

  @Get('program-enrollments/:id/certificate')
  @Permissions(PermissionKey.PATIENTS_READ_ADMIN)
  @ApiOperation({ summary: 'Stream academy program enrollment certificate PDF' })
  @ApiParam({ name: 'id', description: 'Academy program enrollment id' })
  @ApiResponse({ status: 200, description: 'Certificate PDF stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Certificate file was not found' })
  async downloadProgramEnrollmentCertificate(
    @Param('id') enrollmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.getAcademyProgramEnrollmentCertificateFileUseCase.execute({
      enrollmentId,
    });

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalFileName?.replace(/"/g, "'") ?? 'certificate.pdf'}"`,
    );

    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Put('programs/:id/attendance')
  @ApiOperation({ summary: 'Save academy program attendance for admin management' })
  saveProgramAttendance(
    @Param('id') programId: string,
    @Body() body: SaveAdminAcademyProgramAttendanceDto,
    @CurrentLocale() locale: 'ar' | 'en',
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.saveAdminAcademyProgramAttendanceUseCase
      .execute({
        programId,
        locale,
        actorUserId: currentUser.id,
        payload: body,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.programAttendance.update',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgramSessionAttendance',
          resourceId: result.item.selectedSessionId ?? programId,
          targetUserId: null,
          metadata: {
            academyProgramId: programId,
            sessionId: body.sessionId,
            markedCount: body.items.filter((item) => item.status !== 'UNMARKED').length,
            totalItems: body.items.length,
          },
        });

        return result;
      });
  }

  @Patch('program-enrollments/:id/cancel')
  @ApiOperation({ summary: 'Cancel academy program enrollment' })
  cancelProgramEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.manageAdminAcademyProgramEnrollmentsUseCase.cancelEnrollment({
      enrollmentId,
      locale,
    });
  }

  @Patch('program-enrollments/:id/complete')
  @ApiOperation({ summary: 'Mark academy program enrollment completed' })
  completeProgramEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.manageAdminAcademyProgramEnrollmentsUseCase.markCompleted({
      enrollmentId,
      locale,
    });
  }

  @Patch('program-enrollments/:id/certify')
  @ApiOperation({ summary: 'Mark academy program enrollment certified' })
  certifyProgramEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.manageAdminAcademyProgramEnrollmentsUseCase.markCertified({
      enrollmentId,
      locale,
    });
  }

  @Post('programs/:id/enrollments/bulk')
  @ApiOperation({ summary: 'Bulk update academy program enrollments' })
  bulkProgramEnrollments(
    @Param('id') academyProgramId: string,
    @Body() body: BulkAcademyProgramEnrollmentActionDto,
    @CurrentLocale() locale: 'ar' | 'en',
  ) {
    return this.manageAdminAcademyProgramEnrollmentsUseCase.bulkAction({
      academyProgramId,
      locale,
      payload: body,
    });
  }

  @Post('programs')
  @ApiOperation({ summary: 'Create academy program draft' })
  createProgram(
    @Body() body: CreateAcademyProgramDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createAcademyProgramUseCase
      .execute({
        createdByUserId: currentUser.id,
        payload: body,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.program.create',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgram',
          resourceId: result.item.id,
          targetUserId: null,
          metadata: {
            slug: result.item.slug,
            status: result.item.status,
            registrationOpen: result.item.registrationOpen,
          },
        });

        return result;
      });
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Update academy program' })
  updateProgram(
    @Param('id') programId: string,
    @Body() body: UpdateAcademyProgramDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updateAcademyProgramUseCase
      .execute({ programId, payload: body })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.program.update',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgram',
          resourceId: result.item.id,
          targetUserId: null,
          metadata: {
            slug: result.item.slug,
            status: result.item.status,
            registrationOpen: result.item.registrationOpen,
          },
        });

        return result;
      });
  }

  @Patch('programs/:id/publish')
  @ApiOperation({ summary: 'Publish academy program' })
  publishProgram(
    @Param('id') programId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.publishAcademyProgramUseCase
      .execute({ programId })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.program.publish',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgram',
          resourceId: result.item.id,
          targetUserId: null,
          metadata: {
            slug: result.item.slug,
            status: result.item.status,
            publishedAt: result.item.publishedAt,
          },
        });

        return result;
      });
  }

  @Patch('programs/:id/archive')
  @ApiOperation({ summary: 'Archive academy program' })
  archiveProgram(
    @Param('id') programId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.archiveAcademyProgramUseCase
      .execute({ programId })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'academy.program.archive',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'AcademyProgram',
          resourceId: result.item.id,
          targetUserId: null,
          metadata: {
            slug: result.item.slug,
            status: result.item.status,
            archivedAt: result.item.archivedAt,
          },
        });

        return result;
      });
  }

  @Post('programs/:id/sessions')
  @ApiOperation({ summary: 'Create academy program session' })
  createProgramSession(
    @Param('id') programId: string,
    @Body() body: CreateAcademyProgramSessionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createAcademyProgramSessionUseCase.execute({
      programId,
      createdByUserId: currentUser.id,
      payload: body,
    });
  }

  @Patch('programs/:id/sessions/:sessionId')
  @ApiOperation({ summary: 'Update academy program session' })
  updateProgramSession(
    @Param('id') programId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateAcademyProgramSessionDto,
  ) {
    return this.updateAcademyProgramSessionUseCase.execute({
      programId,
      sessionId,
      payload: body,
    });
  }
}
