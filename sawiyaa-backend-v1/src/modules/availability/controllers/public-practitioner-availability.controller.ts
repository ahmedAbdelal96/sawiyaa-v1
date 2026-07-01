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
  PublicPractitionerAvailabilityWindowsSuccessResponseDto,
} from '../dto/availability-response.dto';
import { ListPublicPractitionerAvailabilityWindowsDto } from '../dto/list-public-practitioner-availability-windows.dto';
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
    private readonly listPublicPractitionerAvailabilityWindowsUseCase: ListPublicPractitionerAvailabilityWindowsUseCase,
  ) {}

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
