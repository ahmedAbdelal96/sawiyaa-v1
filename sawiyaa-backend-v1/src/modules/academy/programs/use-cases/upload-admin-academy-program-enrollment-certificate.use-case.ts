import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AcademyProgramEnrollmentStatus, Prisma, SecurityAuditOutcome } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramCertificateStorageService } from '../services/academy-program-certificate-storage.service';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';

type UploadedCertificateFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

const MAX_CERTIFICATE_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class UploadAdminAcademyProgramEnrollmentCertificateUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    private readonly academyProgramCertificateStorageService: AcademyProgramCertificateStorageService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    actorUserId: string;
    file?: UploadedCertificateFile;
  }) {
    if (!input.file || !input.file.buffer || input.file.size <= 0) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.certificateFileRequired',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_FILE_REQUIRED',
      });
    }

    if (
      !this.academyProgramCertificateStorageService.isAllowedMimeType(
        input.file.mimetype,
      )
    ) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.certificateInvalidType',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_INVALID_TYPE',
      });
    }

    if (input.file.size > MAX_CERTIFICATE_FILE_BYTES) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.certificateFileTooLarge',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_FILE_TOO_LARGE',
      });
    }

    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
        input.enrollmentId,
      );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    if (enrollment.status !== AcademyProgramEnrollmentStatus.CONFIRMED) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.certificateEnrollmentNotEligible',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_ENROLLMENT_NOT_ELIGIBLE',
      });
    }

    const originalFileName = this.normalizeOriginalFileName(
      input.file.originalname,
    );
    const now = new Date();
    const stored = await this.academyProgramCertificateStorageService.saveCertificate(
      {
        enrollmentId: enrollment.id,
        fileBuffer: input.file.buffer,
      },
    );

    try {
      const data = {
          certificateFileStoragePath: stored.storagePath,
          certificateFileName: originalFileName,
          certificateUploadedAt: now,
          certificateUploadedByUserId: input.actorUserId,
          certificateIssuedAt: enrollment.certificateIssuedAt ?? now,
        };
      const updated = this.prisma && this.securityAuditService
        ? await this.prisma.$transaction(async (tx) => {
            const record = await this.academyProgramEnrollmentRepository.updateEnrollment(enrollment.id, data, tx);
            await this.securityAuditService!.recordRequired(tx, {
              action: enrollment.certificateFileStoragePath
                ? 'academy.programEnrollment.certificate.replace'
                : 'academy.programEnrollment.certificate.issue',
              outcome: SecurityAuditOutcome.SUCCESS,
              actorType: SecurityAuditActorType.USER,
              source: SecurityAuditSource.HTTP_REQUEST,
              actorUserId: input.actorUserId,
              resourceType: 'AcademyProgramEnrollment',
              resourceId: record.id,
              targetUserId: record.userId,
              metadata: {
                academyProgramId: enrollment.academyProgramId,
                certificateStatus: 'ISSUED',
                fileName: originalFileName,
                uploadedAt: now,
                replaced: Boolean(enrollment.certificateFileStoragePath),
              },
            });
            return record;
          })
        : await this.academyProgramEnrollmentRepository.updateEnrollment(enrollment.id, data);

      if (
        enrollment.certificateFileStoragePath &&
        enrollment.certificateFileStoragePath !== stored.storagePath
      ) {
        void this.academyProgramCertificateStorageService.deleteCertificate(
          enrollment.certificateFileStoragePath,
        );
      }

      return {
        item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          updated,
          input.locale,
        ),
      };
    } catch (error) {
      await this.academyProgramCertificateStorageService.deleteCertificate(
        stored.storagePath,
      );
      throw error;
    }
  }

  private normalizeOriginalFileName(fileName?: string | null): string | null {
    const trimmed = fileName?.trim();
    if (!trimmed) {
      return 'certificate.pdf';
    }

    if (/\.pdf$/i.test(trimmed)) {
      return trimmed;
    }

    return `${trimmed}.pdf`;
  }
}
