import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramCertificateStorageService } from '../services/academy-program-certificate-storage.service';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';

@Injectable()
export class GetAcademyProgramEnrollmentCertificateFileUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramCertificateStorageService: AcademyProgramCertificateStorageService,
  ) {}

  async execute(input: {
    enrollmentId: string;
    userId?: string | null;
  }) {
    const enrollment = input.userId
      ? await this.academyProgramEnrollmentRepository.findEnrollmentByIdForUser(
          input.enrollmentId,
          input.userId,
        )
      : await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
          input.enrollmentId,
        );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    if (!enrollment.certificateFileStoragePath) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.certificateNotFound',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_NOT_FOUND',
      });
    }

    const resolved = await this.academyProgramCertificateStorageService.resolveCertificate(
      enrollment.certificateFileStoragePath,
    );

    if (!resolved) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.certificateNotFound',
        error: 'ACADEMY_PROGRAM_CERTIFICATE_NOT_FOUND',
      });
    }

    return {
      ...resolved,
      originalFileName: enrollment.certificateFileName ?? 'certificate.pdf',
    };
  }
}
