import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import {
  HelpCategoriesResponseDto,
  HelpQuestionsResponseDto,
  ReorderHelpCategoriesDto,
  ReorderHelpQuestionsDto,
  UpsertHelpCategoryDto,
  UpsertHelpQuestionDto,
} from '../dto/help.dto';
import { HelpService } from '../services/help.service';

@ApiTags('Help')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/help')
export class AdminHelpController {
  constructor(private readonly helpService: HelpService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List help categories' })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Only admin active accounts can access this route' })
  listCategories() {
    return this.helpService.listAdminCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a help category' })
  @ApiBody({ type: UpsertHelpCategoryDto })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Only admin active accounts can access this route' })
  createCategory(@Body() body: UpsertHelpCategoryDto) {
    return this.helpService.createCategory(body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a help category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiBody({ type: UpsertHelpCategoryDto })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  @ApiNotFoundResponse({ description: 'Category was not found' })
  updateCategory(@Param('id') id: string, @Body() body: UpsertHelpCategoryDto) {
    return this.helpService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a help category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  @ApiNotFoundResponse({ description: 'Category was not found' })
  deleteCategory(@Param('id') id: string) {
    return this.helpService.deleteCategory(id);
  }

  @Patch('categories/reorder')
  @ApiOperation({ summary: 'Reorder help categories' })
  @ApiBody({ type: ReorderHelpCategoriesDto })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  reorderCategories(@Body() body: ReorderHelpCategoriesDto) {
    return this.helpService.reorderCategories(body);
  }

  @Get('questions')
  @ApiOperation({ summary: 'List help questions' })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  listQuestions() {
    return this.helpService.listAdminQuestions();
  }

  @Post('questions')
  @ApiOperation({ summary: 'Create a help question' })
  @ApiBody({ type: UpsertHelpQuestionDto })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  createQuestion(@Body() body: UpsertHelpQuestionDto) {
    return this.helpService.createQuestion(body);
  }

  @Patch('questions/:id')
  @ApiOperation({ summary: 'Update a help question' })
  @ApiParam({ name: 'id', description: 'Question UUID' })
  @ApiBody({ type: UpsertHelpQuestionDto })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  @ApiNotFoundResponse({ description: 'Question was not found' })
  updateQuestion(@Param('id') id: string, @Body() body: UpsertHelpQuestionDto) {
    return this.helpService.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Delete a help question' })
  @ApiParam({ name: 'id', description: 'Question UUID' })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  @ApiNotFoundResponse({ description: 'Question was not found' })
  deleteQuestion(@Param('id') id: string) {
    return this.helpService.deleteQuestion(id);
  }

  @Patch('questions/reorder')
  @ApiOperation({ summary: 'Reorder help questions' })
  @ApiBody({ type: ReorderHelpQuestionsDto })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  reorderQuestions(@Body() body: ReorderHelpQuestionsDto) {
    return this.helpService.reorderQuestions(body);
  }
}
