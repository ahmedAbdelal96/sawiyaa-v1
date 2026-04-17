import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import {
  CreateAdminAssessmentDto,
  CreateAdminAssessmentOptionDto,
  CreateAdminAssessmentQuestionDto,
  ListAdminAssessmentsDto,
  PreviewAdminAssessmentScoreDto,
  ReorderAdminAssessmentOptionsDto,
  ReorderAdminAssessmentQuestionsDto,
  UpdateAdminAssessmentMetadataDto,
  UpdateAdminAssessmentOptionDto,
  UpdateAdminAssessmentQuestionDto,
  UpsertAssessmentScoringConfigDto,
} from '../dto/admin-assessment-authoring.dto';
import { AdminAssessmentAuthoringDefinitionsUseCase } from '../use-cases/admin-assessment-authoring-definitions.use-case';
import { AdminAssessmentAuthoringLifecycleUseCase } from '../use-cases/admin-assessment-authoring-lifecycle.use-case';
import { AdminAssessmentAuthoringQuestionsUseCase } from '../use-cases/admin-assessment-authoring-questions.use-case';

@ApiTags('Admin - Assessments Authoring')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/assessments')
export class AdminAssessmentsAuthoringController {
  constructor(
    private readonly definitionsUseCase: AdminAssessmentAuthoringDefinitionsUseCase,
    private readonly questionsUseCase: AdminAssessmentAuthoringQuestionsUseCase,
    private readonly lifecycleUseCase: AdminAssessmentAuthoringLifecycleUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List assessments for admin authoring' })
  list(@Query() query: ListAdminAssessmentsDto) {
    return this.definitionsUseCase.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create draft assessment definition' })
  @ApiResponse({ status: 201 })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  create(@Body() body: CreateAdminAssessmentDto) {
    return this.definitionsUseCase.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one assessment editable graph for admin' })
  @ApiNotFoundResponse()
  details(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.definitionsUseCase.details(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft assessment metadata' })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  updateMetadata(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminAssessmentMetadataDto,
  ) {
    return this.definitionsUseCase.updateMetadata(id, body);
  }

  @Post(':id/fork-draft')
  @ApiOperation({
    summary: 'Fork active published assessment into next draft version',
  })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  forkDraft(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.definitionsUseCase.forkDraft(id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Create draft question' })
  createQuestion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateAdminAssessmentQuestionDto,
  ) {
    return this.questionsUseCase.createQuestion(id, body);
  }

  @Patch(':id/questions/reorder')
  @ApiOperation({ summary: 'Reorder draft questions' })
  reorderQuestions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ReorderAdminAssessmentQuestionsDto,
  ) {
    return this.questionsUseCase.reorderQuestions(id, body.questionIds);
  }

  @Patch(':id/questions/:questionId')
  @ApiOperation({ summary: 'Update draft question' })
  updateQuestion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() body: UpdateAdminAssessmentQuestionDto,
  ) {
    return this.questionsUseCase.updateQuestion(id, questionId, body);
  }

  @Delete(':id/questions/:questionId')
  @ApiOperation({ summary: 'Delete draft question' })
  deleteQuestion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
  ) {
    return this.questionsUseCase.deleteQuestion(id, questionId);
  }

  @Post(':id/questions/:questionId/options')
  @ApiOperation({ summary: 'Create draft option for one question' })
  createOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() body: CreateAdminAssessmentOptionDto,
  ) {
    return this.questionsUseCase.createOption(id, questionId, body);
  }

  @Patch(':id/questions/:questionId/options/reorder')
  @ApiOperation({ summary: 'Reorder options for one draft question' })
  reorderOptions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() body: ReorderAdminAssessmentOptionsDto,
  ) {
    return this.questionsUseCase.reorderOptions(id, questionId, body.optionIds);
  }

  @Patch(':id/questions/:questionId/options/:optionId')
  @ApiOperation({ summary: 'Update draft option for one question' })
  updateOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Param('optionId', new ParseUUIDPipe()) optionId: string,
    @Body() body: UpdateAdminAssessmentOptionDto,
  ) {
    return this.questionsUseCase.updateOption(id, questionId, optionId, body);
  }

  @Delete(':id/questions/:questionId/options/:optionId')
  @ApiOperation({ summary: 'Delete draft option for one question' })
  deleteOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Param('optionId', new ParseUUIDPipe()) optionId: string,
  ) {
    return this.questionsUseCase.deleteOption(id, questionId, optionId);
  }

  @Patch(':id/scoring-config')
  @ApiOperation({ summary: 'Update draft scoring config thresholds' })
  updateScoringConfig(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpsertAssessmentScoringConfigDto,
  ) {
    return this.lifecycleUseCase.updateScoringConfig(id, body.thresholds);
  }

  @Post(':id/preview-score')
  @ApiOperation({
    summary: 'Preview score for sample answers without persistence',
  })
  previewScore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: PreviewAdminAssessmentScoreDto,
  ) {
    return this.lifecycleUseCase.previewScore(id, locale, body.answers);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish validated draft assessment' })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.lifecycleUseCase.publish(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish active assessment and set it inactive' })
  unpublish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.lifecycleUseCase.unpublish(id);
  }
}
