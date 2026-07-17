import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { CreateSessionReviewDto } from '../dto/create-session-review.dto';
import { ListPendingPatientReviewsDto } from '../dto/list-pending-patient-reviews.dto';
import { ListPatientReviewsDto } from '../dto/list-patient-reviews.dto';
import {
  PendingPatientReviewListSuccessResponseDto,
  PatientReviewItemSuccessResponseDto,
  PatientReviewListSuccessResponseDto,
} from '../dto/review-response.dto';
import { CreateSessionReviewUseCase } from '../use-cases/create-session-review.use-case';
import { GetMyReviewUseCase } from '../use-cases/get-my-review.use-case';
import { ListMyReviewsUseCase } from '../use-cases/list-my-reviews.use-case';
import { ListPendingPatientReviewsUseCase } from '../use-cases/list-pending-patient-reviews.use-case';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me')
export class PatientReviewsController {
  constructor(
    private readonly createSessionReviewUseCase: CreateSessionReviewUseCase,
    private readonly listMyReviewsUseCase: ListMyReviewsUseCase,
    private readonly getMyReviewUseCase: GetMyReviewUseCase,
    private readonly listPendingPatientReviewsUseCase: ListPendingPatientReviewsUseCase,
  ) {}

  @Post('sessions/:id/review')
  @ApiOperation({
    summary: 'Submit one patient review for an eligible completed session',
  })
  @ApiBody({ type: CreateSessionReviewDto })
  @ApiResponse({ status: 201, type: PatientReviewItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts can submit reviews',
  })
  @ApiNotFoundResponse({
    description: 'Owned session or patient profile was not found',
  })
  submitForSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: CreateSessionReviewDto,
  ) {
    return this.createSessionReviewUseCase
      .execute({
        userId: currentUser.id,
        sessionId,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Get('reviews')
  @ApiOperation({
    summary: 'List patient-owned session reviews',
  })
  @ApiResponse({ status: 200, type: PatientReviewListSuccessResponseDto })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPatientReviewsDto,
  ) {
    return this.listMyReviewsUseCase
      .execute({
        userId: currentUser.id,
        query,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Get('reviews/pending')
  @ApiOperation({
    summary: 'List eligible patient sessions pending a review submission',
  })
  @ApiResponse({
    status: 200,
    type: PendingPatientReviewListSuccessResponseDto,
  })
  listPending(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPendingPatientReviewsDto,
  ) {
    return this.listPendingPatientReviewsUseCase
      .execute({
        userId: currentUser.id,
        query,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Get('reviews/:id')
  @ApiOperation({
    summary: 'Get one owned review details',
  })
  @ApiResponse({ status: 200, type: PatientReviewItemSuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Review was not found' })
  getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') reviewId: string,
  ) {
    return this.getMyReviewUseCase
      .execute({
        userId: currentUser.id,
        reviewId,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
