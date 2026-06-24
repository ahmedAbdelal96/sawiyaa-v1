import { Injectable } from '@nestjs/common';
import { AssessmentDefinitionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AssessmentDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPublishedActive() {
    return this.prisma.assessmentDefinition.findMany({
      where: {
        status: AssessmentDefinitionStatus.ACTIVE,
        isPublished: true,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        status: true,
        introText: true,
        outroText: true,
        estimatedDurationMinutes: true,
      },
    });
  }

  findPublishedActiveBySlug(slug: string) {
    return this.prisma.assessmentDefinition.findFirst({
      where: {
        slug,
        status: AssessmentDefinitionStatus.ACTIVE,
        isPublished: true,
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
          include: {
            options: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
    });
  }
}
