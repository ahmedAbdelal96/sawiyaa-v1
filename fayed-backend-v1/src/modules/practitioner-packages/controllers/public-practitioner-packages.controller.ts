import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPublicPractitionerPackagesDto } from '../dto/list-public-practitioner-packages.dto';
import {
  PublicPractitionerPackageItemSuccessResponseDto,
  PublicPractitionerPackageListSuccessResponseDto,
} from '../dto/public-practitioner-package-response.dto';
import { GetPublicPractitionerPackageUseCase } from '../use-cases/get-public-practitioner-package.use-case';
import { ListPublicPractitionerPackagesUseCase } from '../use-cases/list-public-practitioner-packages.use-case';

@ApiTags('Practitioner Packages Public')
@Public()
@Controller('public/practitioners')
export class PublicPractitionerPackagesController {
  constructor(
    private readonly listPublicPractitionerPackagesUseCase: ListPublicPractitionerPackagesUseCase,
    private readonly getPublicPractitionerPackageUseCase: GetPublicPractitionerPackageUseCase,
  ) {}

  @Get(':slug/packages')
  @ApiOperation({
    summary: 'List public practitioner packages',
    description:
      'Returns only active, purchasable package offers for a public practitioner profile.',
  })
  @ApiParam({ name: 'slug', description: 'Practitioner public slug' })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerPackageListSuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Practitioner slug was not found, not visible, or does not accept packages',
  })
  list(
    @Param('slug') slug: string,
    @Query() query: ListPublicPractitionerPackagesDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPublicPractitionerPackagesUseCase
      .execute({
        slug,
        locale,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':slug/packages/:packageSlug')
  @ApiOperation({
    summary: 'Get a public practitioner package',
    description:
      'Returns one active public package offer by practitioner slug and package slug.',
  })
  @ApiParam({ name: 'slug', description: 'Practitioner public slug' })
  @ApiParam({ name: 'packageSlug', description: 'Package slug' })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerPackageItemSuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Practitioner or package was not found, not visible, or not purchasable',
  })
  detail(
    @Param('slug') slug: string,
    @Param('packageSlug') packageSlug: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPublicPractitionerPackageUseCase
      .execute({
        practitionerSlug: slug,
        packageSlug,
        locale,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
