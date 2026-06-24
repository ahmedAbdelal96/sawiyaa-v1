import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class GeneralChatActorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findParticipantProfileByUser(input: {
    userId: string;
    role: 'PATIENT' | 'PRACTITIONER';
  }) {
    if (input.role === 'PATIENT') {
      return this.prisma.patientProfile.findUnique({
        where: { userId: input.userId },
        select: {
          id: true,
          userId: true,
        },
      });
    }

    return this.prisma.practitionerProfile.findUnique({
      where: { userId: input.userId },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  findSessionPairLink(input: {
    sessionId: string;
    patientProfileId: string;
    practitionerProfileId: string;
  }) {
    return this.prisma.session.findFirst({
      where: {
        id: input.sessionId,
        patientId: input.patientProfileId,
        practitionerId: input.practitionerProfileId,
      },
      select: {
        id: true,
      },
    });
  }
}
