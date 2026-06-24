import { ContentLocale, CourseStatus, CourseVisibility } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { TrainingRepository } from './training.repository';

describe('TrainingRepository public contract', () => {
  const prisma = {
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    courseSchedule: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new TrainingRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.course.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.course.count as jest.Mock).mockResolvedValue(0);
    (prisma.course.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.courseSchedule.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('listPublicCourses returns published public courses only', async () => {
    await repository.listPublicCourses({
      page: 1,
      limit: 12,
      locale: ContentLocale.ar,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: CourseStatus.PUBLISHED,
          visibility: {
            in: [CourseVisibility.PUBLIC],
          },
        }),
      }),
    );
  });

  it('findPublicCourseBySlug resolves published public details only', async () => {
    await repository.findPublicCourseBySlug({
      slug: 'training-slug',
      locale: ContentLocale.ar,
    });

    expect(prisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: CourseStatus.PUBLISHED,
          visibility: {
            in: [CourseVisibility.PUBLIC],
          },
        }),
      }),
    );
  });

  it('listPublicCourseSchedules only includes open/full upcoming schedules', async () => {
    await repository.listPublicCourseSchedules('course_1');

    expect(prisma.courseSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          courseId: 'course_1',
          status: {
            in: ['OPEN_FOR_ENROLLMENT', 'FULL'],
          },
          startsAt: {
            gte: expect.any(Date),
          },
        }),
      }),
    );
  });
});
