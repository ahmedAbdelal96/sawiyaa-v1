import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { GetPublicPractitionerTrustBlockDto } from '../dto/get-public-practitioner-trust-block.dto';
import { PublicPractitionerTrustBlockSuccessResponseDto } from '../dto/review-response.dto';
import { GetPublicPractitionerTrustBlockUseCase } from '../use-cases/get-public-practitioner-trust-block.use-case';

@ApiTags('Reviews')
@Public()
@Controller('public/practitioners/:slug/trust-block')
export class PublicPractitionerTrustBlockController {
  constructor(
    private readonly getPublicPractitionerTrustBlockUseCase: GetPublicPractitionerTrustBlockUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get shared trust/conversion block for public practitioner surface',
  })
  @ApiResponse({ status: 200, type: PublicPractitionerTrustBlockSuccessResponseDto })
  @ApiNotFoundResponse({
    description: 'Practitioner slug not found or not publicly visible',
  })
  getBySlug(
    @Param('slug') slug: string,
    @Query() query: GetPublicPractitionerTrustBlockDto,
  ) {
    return this.getPublicPractitionerTrustBlockUseCase
      .execute({ slug, query })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
