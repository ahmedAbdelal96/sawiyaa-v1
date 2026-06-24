import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AssessmentDefinitionSuccessResponseDto,
  AssessmentListSuccessResponseDto,
} from '../dto/assessment-response.dto';
import { GetAssessmentDefinitionUseCase } from '../use-cases/get-assessment-definition.use-case';
import { ListActiveAssessmentsUseCase } from '../use-cases/list-active-assessments.use-case';

@ApiTags('Assessments')
@Controller('assessments')
export class PublicAssessmentsController {
  constructor(
    private readonly listActiveAssessmentsUseCase: ListActiveAssessmentsUseCase,
    private readonly getAssessmentDefinitionUseCase: GetAssessmentDefinitionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List published active assessments',
    description:
      'Returns assessment definitions available for user-facing self-discovery flows.',
  })
  @ApiResponse({ status: 200, type: AssessmentListSuccessResponseDto })
  list() {
    return this.listActiveAssessmentsUseCase.execute().then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get assessment definition by slug',
    description:
      'Returns one published assessment definition including ordered questions and options.',
  })
  @ApiResponse({ status: 200, type: AssessmentDefinitionSuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Assessment definition was not found' })
  details(@Param('slug') slug: string) {
    return this.getAssessmentDefinitionUseCase
      .execute({ slug })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
