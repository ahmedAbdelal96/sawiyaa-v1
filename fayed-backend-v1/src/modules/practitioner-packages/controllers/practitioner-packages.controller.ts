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
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
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
import { CreatePractitionerPackageDto } from '../dto/create-practitioner-package.dto';
import { ListMyPractitionerPackagesDto } from '../dto/list-my-practitioner-packages.dto';
import {
  PractitionerPackageItemSuccessResponseDto,
  PractitionerPackageListSuccessResponseDto,
} from '../dto/practitioner-package-response.dto';
import { UpdatePractitionerPackageDto } from '../dto/update-practitioner-package.dto';
import { ActivatePractitionerPackageUseCase } from '../use-cases/activate-practitioner-package.use-case';
import { ArchivePractitionerPackageUseCase } from '../use-cases/archive-practitioner-package.use-case';
import { CreatePractitionerPackageUseCase } from '../use-cases/create-practitioner-package.use-case';
import { GetMyPractitionerPackageUseCase } from '../use-cases/get-my-practitioner-package.use-case';
import { ListMyPractitionerPackagesUseCase } from '../use-cases/list-my-practitioner-packages.use-case';
import { PausePractitionerPackageUseCase } from '../use-cases/pause-practitioner-package.use-case';
import { UpdatePractitionerPackageUseCase } from '../use-cases/update-practitioner-package.use-case';

@ApiTags('Practitioner Packages')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/packages')
export class PractitionerPackagesController {
  constructor(
    private readonly createPractitionerPackageUseCase: CreatePractitionerPackageUseCase,
    private readonly updatePractitionerPackageUseCase: UpdatePractitionerPackageUseCase,
    private readonly activatePractitionerPackageUseCase: ActivatePractitionerPackageUseCase,
    private readonly pausePractitionerPackageUseCase: PausePractitionerPackageUseCase,
    private readonly archivePractitionerPackageUseCase: ArchivePractitionerPackageUseCase,
    private readonly listMyPractitionerPackagesUseCase: ListMyPractitionerPackagesUseCase,
    private readonly getMyPractitionerPackageUseCase: GetMyPractitionerPackageUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create practitioner package draft' })
  @ApiBody({ type: CreatePractitionerPackageDto })
  @ApiResponse({ status: 201, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreatePractitionerPackageDto,
  ) {
    return this.createPractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List my practitioner packages' })
  @ApiResponse({ status: 200, type: PractitionerPackageListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListMyPractitionerPackagesDto,
  ) {
    return this.listMyPractitionerPackagesUseCase
      .execute({
        userId: currentUser.id,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my practitioner package detail' })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({ status: 200, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  detail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') packageId: string,
  ) {
    return this.getMyPractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        packageId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my practitioner package' })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiBody({ type: UpdatePractitionerPackageDto })
  @ApiResponse({ status: 200, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') packageId: string,
    @Body() body: UpdatePractitionerPackageDto,
  ) {
    return this.updatePractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        packageId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate my practitioner package' })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({ status: 200, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  @ApiConflictResponse({
    description:
      'Package cannot be activated because it violates package rules',
  })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  activate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') packageId: string,
  ) {
    return this.activatePractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        packageId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause my practitioner package' })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({ status: 200, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  @ApiConflictResponse({
    description: 'Package must be active before it can be paused',
  })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  pause(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') packageId: string,
  ) {
    return this.pausePractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        packageId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive my practitioner package' })
  @ApiParam({ name: 'id', description: 'Package id' })
  @ApiResponse({ status: 200, type: PractitionerPackageItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only approved OTP-verified practitioner accounts may manage packages',
  })
  @ApiNotFoundResponse({ description: 'Package was not found' })
  archive(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') packageId: string,
  ) {
    return this.archivePractitionerPackageUseCase
      .execute({
        userId: currentUser.id,
        packageId,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
