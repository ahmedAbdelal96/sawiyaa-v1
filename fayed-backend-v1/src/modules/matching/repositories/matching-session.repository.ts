import { Injectable } from '@nestjs/common';
import { MatchingAnswerKey, MatchingSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MatchingAnswerPayload } from '../types/matching.types';

@Injectable()
export class MatchingSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCompletedSession(input: {
    patientProfileId: string;
    answers: MatchingAnswerPayload[];
    recommendations: Array<{
      practitionerProfileId: string;
      score: number;
      rank: number;
      rationaleJson: unknown;
    }>;
  }) {
    return this.prisma.matchingSession.create({
      data: {
        patientProfileId: input.patientProfileId,
        status: MatchingSessionStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        answers: {
          create: input.answers.map((answer) => ({
            key: answer.key,
            valueJson: answer.valueJson as Prisma.InputJsonValue,
          })),
        },
        recommendations: {
          create: input.recommendations.map((recommendation) => ({
            practitionerProfileId: recommendation.practitionerProfileId,
            score: recommendation.score,
            rank: recommendation.rank,
            rationaleJson: recommendation.rationaleJson as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        recommendations: {
          orderBy: {
            rank: 'asc',
          },
          include: {
            practitionerProfile: {
              include: {
                user: {
                  select: {
                    displayName: true,
                  },
                },
                languages: {
                  include: {
                    language: {
                      select: {
                        code: true,
                      },
                    },
                  },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                },
                specialties: {
                  where: {
                    specialty: {
                      isActive: true,
                    },
                  },
                  include: {
                    specialty: {
                      include: {
                        translations: {
                          orderBy: { locale: 'asc' },
                          select: {
                            title: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
      },
    });
  }

  findOwnedCompletedSession(sessionId: string, patientProfileId: string) {
    return this.prisma.matchingSession.findFirst({
      where: {
        id: sessionId,
        patientProfileId,
      },
      include: {
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        recommendations: {
          orderBy: {
            rank: 'asc',
          },
          include: {
            practitionerProfile: {
              include: {
                user: {
                  select: {
                    displayName: true,
                  },
                },
                languages: {
                  include: {
                    language: {
                      select: {
                        code: true,
                      },
                    },
                  },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                },
                specialties: {
                  where: {
                    specialty: {
                      isActive: true,
                    },
                  },
                  include: {
                    specialty: {
                      include: {
                        translations: {
                          orderBy: { locale: 'asc' },
                          select: {
                            title: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
      },
    });
  }

  extractAnswersMap(
    answers: Array<{ key: MatchingAnswerKey; valueJson: Prisma.JsonValue }>,
  ) {
    return answers.reduce<Record<MatchingAnswerKey, Prisma.JsonValue>>(
      (accumulator, item) => {
        accumulator[item.key] = item.valueJson;
        return accumulator;
      },
      {} as Record<MatchingAnswerKey, Prisma.JsonValue>,
    );
  }
}

