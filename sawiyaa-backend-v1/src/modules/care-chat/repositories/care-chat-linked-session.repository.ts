import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class CareChatLinkedSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedPatientSession(sessionId: string, patientId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        patientId,
      },
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
      },
    });
  }
}
