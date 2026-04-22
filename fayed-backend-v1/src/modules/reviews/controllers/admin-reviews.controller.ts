import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListAdminReviewsDto } from '../dto/list-admin-reviews.dto';
import { ModerateReviewDto } from '../dto/moderate-review.dto';
import {
  AdminReviewItemSuccessResponseDto,
  AdminReviewListSuccessResponseDto,
  ReviewModerationSuccessResponseDto,
} from '../dto/review-response.dto';
import { GetAdminReviewUseCase } from '../use-cases/get-admin-review.use-case';
import { ListAdminReviewsUseCase } from '../use-cases/list-admin-reviews.use-case';
import { ModerateReviewUseCase } from '../use-cases/moderate-review.use-case';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.CONTENT_REVIEWER)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(
    private readonly listAdminReviewsUseCase: ListAdminReviewsUseCase,
    private readonly getAdminReviewUseCase: GetAdminReviewUseCase,
    private readonly moderateReviewUseCase: ModerateReviewUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List reviews for moderation/admin operations',
  })
  @ApiResponse({ status: 200, type: AdminReviewListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only admin/content reviewer roles can access moderation routes',
  })
  list(@Query() query: ListAdminReviewsDto) {
    return this.listAdminReviewsUseCase.execute({ query }).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one review details for moderation',
  })
  @ApiResponse({ status: 200, type: AdminReviewItemSuccessResponseDto })
  getById(@Param('id') reviewId: string) {
    return this.getAdminReviewUseCase.execute({ reviewId }).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Patch(':id/moderation')
  @ApiOperation({
    summary: 'Apply moderation action to one review',
  })
  @ApiBody({ type: ModerateReviewDto })
  @ApiResponse({ status: 200, type: ReviewModerationSuccessResponseDto })
  moderate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') reviewId: string,
    @Body() body: ModerateReviewDto,
  ) {
    return this.moderateReviewUseCase
      .execute({
        userId: currentUser.id,
        reviewId,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
