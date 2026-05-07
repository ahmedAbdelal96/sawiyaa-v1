import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  PackageSettlementListResponseDto,
  PackageSettlementSuccessResponseDto,
} from '../dto/package-settlement.dto';
import { ListPackageSettlementsDto } from '../dto/list-package-settlements.dto';
import { GetAdminPackageSettlementUseCase } from '../use-cases/get-admin-package-settlement.use-case';
import { ListAdminPackageSettlementsUseCase } from '../use-cases/list-admin-package-settlements.use-case';
import { ReleasePackageSettlementUseCase } from '../use-cases/release-package-settlement.use-case';

@ApiTags('Admin - Package Settlements')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/package-settlements')
export class AdminPackageSettlementsController {
  constructor(
    private readonly listAdminPackageSettlementsUseCase: ListAdminPackageSettlementsUseCase,
    private readonly getAdminPackageSettlementUseCase: GetAdminPackageSettlementUseCase,
    private readonly releasePackageSettlementUseCase: ReleasePackageSettlementUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List package settlements',
    description:
      'Returns package settlement rows for operational review, release tracking, and package payout holding visibility.',
  })
  @ApiResponse({ status: 200, type: PackageSettlementListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid package settlement filters' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  list(@Query() query: ListPackageSettlementsDto) {
    return this.listAdminPackageSettlementsUseCase.execute({ query });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get package settlement details',
    description:
      'Returns one package settlement with purchase and practitioner context for operational review.',
  })
  @ApiParam({ name: 'id', description: 'Package settlement id' })
  @ApiResponse({ status: 200, type: PackageSettlementSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Package settlement was not found' })
  details(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getAdminPackageSettlementUseCase.execute(id);
  }

  @Post(':id/release')
  @ApiOperation({
    summary: 'Release ready package settlement',
    description:
      'Releases a READY_TO_RELEASE package settlement into available practitioner earnings exactly once.',
  })
  @ApiParam({ name: 'id', description: 'Package settlement id' })
  @ApiResponse({ status: 200, type: PackageSettlementSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Package settlement is invalid or not ready for release',
  })
  @ApiConflictResponse({
    description: 'Package settlement is not ready to be released',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Package settlement was not found' })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  release(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.releasePackageSettlementUseCase.execute({
      settlementId: id,
      releasedByAdminId: currentUser.id,
    });
  }
}
