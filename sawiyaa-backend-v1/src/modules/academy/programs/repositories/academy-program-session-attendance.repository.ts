import { Injectable } from '@nestjs/common';
import {
  AcademyProgramSessionAttendanceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AcademyProgramSessionAttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findAttendancesByProgramId(programId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramSessionAttendance.findMany({
      where: {
        academyProgramSession: {
          academyProgramId: programId,
        },
      },
      select: {
        id: true,
        academyProgramSessionId: true,
        academyProgramEnrollmentId: true,
        attendanceStatus: true,
        markedByUserId: true,
        markedAt: true,
        updatedAt: true,
      },
    });
  }

  findAttendancesBySessionId(sessionId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramSessionAttendance.findMany({
      where: {
        academyProgramSessionId: sessionId,
      },
      select: {
        id: true,
        academyProgramSessionId: true,
        academyProgramEnrollmentId: true,
        attendanceStatus: true,
        markedByUserId: true,
        markedAt: true,
        updatedAt: true,
      },
    });
  }

  findAttendancesByEnrollmentId(
    enrollmentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).academyProgramSessionAttendance.findMany({
      where: {
        academyProgramEnrollmentId: enrollmentId,
      },
      select: {
        id: true,
        academyProgramSessionId: true,
        academyProgramEnrollmentId: true,
        attendanceStatus: true,
        markedByUserId: true,
        markedAt: true,
        updatedAt: true,
      },
    });
  }

  upsertAttendance(input: {
    sessionId: string;
    enrollmentId: string;
    status: AcademyProgramSessionAttendanceStatus;
    markedByUserId: string | null;
  }, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramSessionAttendance.upsert({
      where: {
        academyProgramSessionId_academyProgramEnrollmentId: {
          academyProgramSessionId: input.sessionId,
          academyProgramEnrollmentId: input.enrollmentId,
        },
      },
      create: {
        academyProgramSessionId: input.sessionId,
        academyProgramEnrollmentId: input.enrollmentId,
        attendanceStatus: input.status,
        markedByUserId: input.markedByUserId,
        markedAt: new Date(),
      },
      update: {
        attendanceStatus: input.status,
        markedByUserId: input.markedByUserId,
        markedAt: new Date(),
      },
    });
  }

  deleteAttendance(input: { sessionId: string; enrollmentId: string }, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).academyProgramSessionAttendance.deleteMany({
      where: {
        academyProgramSessionId: input.sessionId,
        academyProgramEnrollmentId: input.enrollmentId,
      },
    });
  }
}
