import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HelpCategoriesResponseDto,
  HelpQuestionsResponseDto,
  PublicHelpResponseDto,
} from '../dto/help.dto';
import { HelpService } from '../services/help.service';

@ApiTags('Help')
@Controller('public/help')
export class PublicHelpController {
  constructor(private readonly helpService: HelpService) {}

  @Get()
  @ApiOperation({ summary: 'Get public help overview' })
  @ApiResponse({ status: 200, type: PublicHelpResponseDto })
  getPublicHelp() {
    return this.helpService.getPublicHelp();
  }

  @Get('categories')
  @ApiOperation({ summary: 'List public help categories' })
  @ApiResponse({ status: 200, type: HelpCategoriesResponseDto })
  getCategories() {
    return this.helpService.getPublicCategories();
  }

  @Get('questions')
  @ApiOperation({ summary: 'List public help questions' })
  @ApiResponse({ status: 200, type: HelpQuestionsResponseDto })
  getQuestions() {
    return this.helpService.getPublicQuestions();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search public help content' })
  @ApiResponse({ status: 200, type: PublicHelpResponseDto })
  search(@Query('q') query = '') {
    return this.helpService.searchPublicHelp(query);
  }
}
