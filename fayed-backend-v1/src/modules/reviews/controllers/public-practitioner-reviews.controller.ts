import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ListPublicPractitionerReviewsDto } from '../dto/list-public-practitioner-reviews.dto';
import { PublicPractitionerReviewsSuccessResponseDto } from '../dto/review-response.dto';
import { ListPublicPractitionerReviewsUseCase } from '../use-cases/list-public-practitioner-reviews.use-case';

@ApiTags('Reviews')
@Public()
@Controller('public/practitioners/:slug/reviews')
export class PublicPractitionerReviewsController {
  constructor(
    private readonly listPublicPractitionerReviewsUseCase: ListPublicPractitionerReviewsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List published public review snippets for one practitioner',
  })
  @ApiResponse({ status: 200, type: PublicPractitionerReviewsSuccessResponseDto })
  @ApiNotFoundResponse({
    description: 'Practitioner slug not found or not publicly visible',
  })
  listBySlug(
    @Param('slug') slug: string,
    @Query() query: ListPublicPractitionerReviewsDto,
  ) {
    return this.listPublicPractitionerReviewsUseCase
      .execute({ slug, query })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
