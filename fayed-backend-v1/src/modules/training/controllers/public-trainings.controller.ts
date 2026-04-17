import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListPublicTrainingsDto } from '../dto/list-public-trainings.dto';
import {
  PublicTrainingItemSuccessResponseDto,
  PublicTrainingListSuccessResponseDto,
} from '../dto/training-response.dto';
import { TrainingLocaleQueryDto } from '../dto/training-locale-query.dto';
import { GetPublicTrainingBySlugUseCase } from '../use-cases/get-public-training-by-slug.use-case';
import { ListPublicTrainingsUseCase } from '../use-cases/list-public-trainings.use-case';

@ApiTags('Training')
@Controller('trainings')
export class PublicTrainingsController {
  constructor(
    private readonly listPublicTrainingsUseCase: ListPublicTrainingsUseCase,
    private readonly getPublicTrainingBySlugUseCase: GetPublicTrainingBySlugUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published training catalog items' })
  @ApiResponse({ status: 200, type: PublicTrainingListSuccessResponseDto })
  list(@Query() query: ListPublicTrainingsDto) {
    return this.listPublicTrainingsUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published training details by slug' })
  @ApiResponse({ status: 200, type: PublicTrainingItemSuccessResponseDto })
  getBySlug(
    @Param('slug') slug: string,
    @Query() query: TrainingLocaleQueryDto,
  ) {
    return this.getPublicTrainingBySlugUseCase
      .execute({
        slug,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
