import { ConflictException } from '@nestjs/common';
import { ContentLocale, CourseStatus, CourseType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { CreateTrainingUseCase } from './create-training.use-case';

describe('CreateTrainingUseCase', () => {
  const trainingRepository = {
    createCourse: jest.fn(),
  } as unknown as TrainingRepository;

  const trainingPresenter = {
    presentAdminTrainingItem: jest.fn(),
  } as unknown as TrainingPresenter;

  const useCase = new CreateTrainingUseCase(
    trainingRepository,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates training draft successfully', async () => {
    (trainingRepository.createCourse as jest.Mock).mockResolvedValue({
      id: 'course_1',
      courseType: CourseType.LIVE_COURSE,
      status: CourseStatus.DRAFT,
      visibility: 'PUBLIC',
      archivedAt: null,
      publishedAt: null,
      createdAt: new Date('2026-03-31T10:00:00.000Z'),
      updatedAt: new Date('2026-03-31T10:00:00.000Z'),
      coverImageUrl: null,
      thumbnailUrl: null,
      translations: [
        {
          locale: ContentLocale.ar,
          title: 'Training',
          slug: 'training',
          shortDescription: null,
          fullDescription: null,
          metaTitle: null,
          metaDescription: null,
        },
      ],
    });
    (trainingPresenter.presentAdminTrainingItem as jest.Mock).mockReturnValue({
      id: 'course_1',
      status: CourseStatus.DRAFT,
    });

    const result = await useCase.execute({
      payload: {
        locale: ContentLocale.ar,
        title: 'Training',
        slug: 'training',
        courseType: CourseType.LIVE_COURSE,
      },
    });

    expect(result.item).toEqual({
      id: 'course_1',
      status: CourseStatus.DRAFT,
    });
    expect(trainingRepository.createCourse).toHaveBeenCalled();
  });

  it('maps slug uniqueness conflicts', async () => {
    (trainingRepository.createCourse as jest.Mock).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      useCase.execute({
        payload: {
          locale: ContentLocale.ar,
          title: 'Training',
          slug: 'training',
          courseType: CourseType.LIVE_COURSE,
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
