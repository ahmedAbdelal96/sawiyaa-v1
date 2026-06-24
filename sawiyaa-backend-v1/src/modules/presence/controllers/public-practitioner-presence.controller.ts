import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PublicPresenceSuccessResponseDto } from '../dto/presence-response.dto';
import { GetPublicPractitionerPresenceUseCase } from '../use-cases/get-public-practitioner-presence.use-case';

/**
 * Public-safe live presence surface for practitioner profile and discovery UI.
 */
@ApiTags('Presence Public')
@Public()
@Controller('public/practitioners/:slug/presence')
export class PublicPractitionerPresenceController {
  constructor(
    private readonly getPublicPractitionerPresenceUseCase: GetPublicPractitionerPresenceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get public practitioner presence',
    description:
      'Returns public-safe live-state indicators only for practitioners visible on public surfaces.',
  })
  @ApiParam({ name: 'slug', description: 'Practitioner public slug' })
  @ApiResponse({ status: 200, type: PublicPresenceSuccessResponseDto })
  @ApiNotFoundResponse({
    description: 'Practitioner was not found or is not publicly visible',
  })
  getPublicPresence(@Param('slug') slug: string) {
    return this.getPublicPractitionerPresenceUseCase.execute({ slug });
  }
}
