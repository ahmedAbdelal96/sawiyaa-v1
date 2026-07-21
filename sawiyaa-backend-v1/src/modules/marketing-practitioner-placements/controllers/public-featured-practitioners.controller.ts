import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPublicFeaturedPractitionersUseCase } from '../use-cases/list-public-featured-practitioners.use-case';
import { FeaturedPractitionerHomeCard } from '../repositories/practitioner-marketing-placement.repository';

@ApiTags('Public - Featured Practitioners')
@Controller('public/featured-practitioners')
export class PublicFeaturedPractitionersController {
  constructor(
    private readonly listPublicFeaturedPractitionersUseCase: ListPublicFeaturedPractitionersUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get active featured practitioners for homepage',
    description:
      'Returns the list of active featured practitioner placements for the HOME surface, ordered by priority. Publicly accessible — no authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of featured practitioners ordered by display priority.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          practitionerId: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          displayName: { type: 'string', nullable: true },
          professionalTitle: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          primarySpecialty: { type: 'string', nullable: true },
          averageRating: { type: 'number', nullable: true },
          totalReviews: { type: 'number' },
          displaySessionPrice30: { type: 'number', nullable: true },
          displaySessionPrice60: { type: 'number', nullable: true },
          isVerified: { type: 'boolean' },
          badgeLabel: { type: 'string' },
        },
      },
    },
  })
  async list(
    @Query('locale') locale: SupportedLocale,
    @Req() request: Request,
  ): Promise<FeaturedPractitionerHomeCard[]> {
    return this.listPublicFeaturedPractitionersUseCase.execute({
      locale: locale ?? 'en',
      requestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
    });
  }
}
