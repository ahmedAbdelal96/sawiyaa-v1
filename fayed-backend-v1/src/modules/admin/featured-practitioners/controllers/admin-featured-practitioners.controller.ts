import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  CreateFeaturedPractitionerPlacementDto,
  ListFeaturedPractitionersPlacementsDto,
  PlacementActionNoteDto,
  UpdateFeaturedPractitionerPlacementDto,
} from '../dto/featured-practitioners-admin.dto';
import { CreateFeaturedPractitionerPlacementUseCase } from '../use-cases/create-featured-practitioner-placement.use-case';
import { GetFeaturedPractitionerPlacementHistoryUseCase } from '../use-cases/get-featured-practitioner-placement-history.use-case';
import { GetFeaturedPractitionerPlacementUseCase } from '../use-cases/get-featured-practitioner-placement.use-case';
import { ListFeaturedPractitionerPlacementsUseCase } from '../use-cases/list-featured-practitioner-placements.use-case';
import { PauseFeaturedPractitionerPlacementUseCase } from '../use-cases/pause-featured-practitioner-placement.use-case';
import { ResumeFeaturedPractitionerPlacementUseCase } from '../use-cases/resume-featured-practitioner-placement.use-case';
import { UpdateFeaturedPractitionerPlacementUseCase } from '../use-cases/update-featured-practitioner-placement.use-case';

@ApiTags('Admin - Featured Practitioners')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.MARKETING_STAFF)
@Controller('admin/featured-practitioners')
export class AdminFeaturedPractitionersController {
  constructor(
    private readonly listUseCase: ListFeaturedPractitionerPlacementsUseCase,
    private readonly getUseCase: GetFeaturedPractitionerPlacementUseCase,
    private readonly createUseCase: CreateFeaturedPractitionerPlacementUseCase,
    private readonly updateUseCase: UpdateFeaturedPractitionerPlacementUseCase,
    private readonly pauseUseCase: PauseFeaturedPractitionerPlacementUseCase,
    private readonly resumeUseCase: ResumeFeaturedPractitionerPlacementUseCase,
    private readonly historyUseCase: GetFeaturedPractitionerPlacementHistoryUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_READ)
  @ApiOperation({ summary: 'List featured practitioner placements' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: ListFeaturedPractitionersPlacementsDto) {
    return this.listUseCase.execute(query).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Get(':id')
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_READ)
  @ApiOperation({ summary: 'Get featured practitioner placement details' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  detail(@Param('id') id: string) {
    return this.getUseCase.execute(id).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Post()
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_MANAGE)
  @ApiOperation({ summary: 'Create featured practitioner placement' })
  @ApiResponse({ status: 201 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateFeaturedPractitionerPlacementDto,
  ) {
    return this.createUseCase
      .execute({
        actorUserId: currentUser.id,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Patch(':id')
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_MANAGE)
  @ApiOperation({ summary: 'Update featured practitioner placement' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateFeaturedPractitionerPlacementDto,
  ) {
    return this.updateUseCase
      .execute({
        id,
        actorUserId: currentUser.id,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Post(':id/pause')
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_MANAGE)
  @ApiOperation({ summary: 'Pause featured practitioner placement' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  pause(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: PlacementActionNoteDto,
  ) {
    return this.pauseUseCase
      .execute({
        id,
        actorUserId: currentUser.id,
        note: body.note,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Post(':id/resume')
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_MANAGE)
  @ApiOperation({ summary: 'Resume featured practitioner placement' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  resume(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: PlacementActionNoteDto,
  ) {
    return this.resumeUseCase
      .execute({
        id,
        actorUserId: currentUser.id,
        note: body.note,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Get(':id/history')
  @Permissions(PermissionKey.FEATURED_PRACTITIONERS_READ)
  @ApiOperation({ summary: 'List featured practitioner placement history' })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  history(@Param('id') id: string) {
    return this.historyUseCase.execute(id).then((data) => ({
      success: true as const,
      data,
    }));
  }
}

