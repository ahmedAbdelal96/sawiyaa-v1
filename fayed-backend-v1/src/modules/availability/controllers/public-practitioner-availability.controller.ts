import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import {
  PublicPractitionerAvailabilitySuccessResponseDto,
  PublicPractitionerAvailabilityWindowsSuccessResponseDto,
} from '../dto/availability-response.dto';
import { ListPublicPractitionerAvailabilityWindowsDto } from '../dto/list-public-practitioner-availability-windows.dto';
import { GetPublicPractitionerAvailabilityUseCase } from '../use-cases/get-public-practitioner-availability.use-case';
import { ListPublicPractitionerAvailabilityWindowsUseCase } from '../use-cases/list-public-practitioner-availability-windows.use-case';

/**
 * Public availability controller exposes safe schedule reads only.
 * It deliberately avoids private exception reasons and any booking/session mutation behavior.
 */
@ApiTags('Availability Public')
@Public()
@Controller('public/practitioners/:slug/availability')
export class PublicPractitionerAvailabilityController {
  constructor(
    private readonly getPublicPractitionerAvailabilityUseCase: GetPublicPractitionerAvailabilityUseCase,
    private readonly listPublicPractitionerAvailabilityWindowsUseCase: ListPublicPractitionerAvailabilityWindowsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get public practitioner recurring availability summary',
    description:
      'Public read endpoint that returns public-safe recurring weekly schedule only. Temporary exceptions are not exposed here.',
  })
  @ApiParam({ name: 'slug', description: 'Practitioner public slug' })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerAvailabilitySuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Practitioner was not found or is not publicly visible',
  })
  getPublicAvailability(@Param('slug') slug: string) {
    return this.getPublicPractitionerAvailabilityUseCase.execute({ slug });
  }

  @Get('windows')
  @ApiOperation({
    summary: 'List public practitioner availability windows for a UTC range',
    description:
      'Builds concrete UTC availability windows from recurring weekly slots plus active exceptions. This endpoint is booking-facing read-only baseline only.',
  })
  @ApiParam({ name: 'slug', description: 'Practitioner public slug' })
  @ApiQuery({
    name: 'from',
    description: 'Inclusive UTC range start',
  })
  @ApiQuery({
    name: 'to',
    description: 'Exclusive UTC range end',
  })
  @ApiQuery({
    name: 'includeBooked',
    required: false,
    description:
      'Include public-safe booked/reserved occupied slots for schedule display',
  })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerAvailabilityWindowsSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Range is invalid or exceeds V1 window-size limits',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner was not found or is not publicly visible',
  })
  listWindows(
    @Param('slug') slug: string,
    @Query() query: ListPublicPractitionerAvailabilityWindowsDto,
  ) {
    return this.listPublicPractitionerAvailabilityWindowsUseCase.execute({
      slug,
      fromUtc: new Date(query.from),
      toUtc: new Date(query.to),
      includeBooked: query.includeBooked,
    });
  }
}
