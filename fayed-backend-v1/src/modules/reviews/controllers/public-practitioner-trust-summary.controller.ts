import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PublicPractitionerTrustSummarySuccessResponseDto } from '../dto/review-response.dto';
import { GetPublicPractitionerTrustSummaryUseCase } from '../use-cases/get-public-practitioner-trust-summary.use-case';

@ApiTags('Reviews')
@Public()
@Controller('public/practitioners/:slug/trust-summary')
export class PublicPractitionerTrustSummaryController {
  constructor(
    private readonly getPublicPractitionerTrustSummaryUseCase: GetPublicPractitionerTrustSummaryUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get moderation-safe practitioner credibility summary',
  })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerTrustSummarySuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Practitioner slug not found or not publicly visible',
  })
  getBySlug(@Param('slug') slug: string) {
    return this.getPublicPractitionerTrustSummaryUseCase
      .execute({ slug })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
