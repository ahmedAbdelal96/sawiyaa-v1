import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AppRole } from '@common/enums/app-role.enum';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  ListOrganizationsUseCase,
  GetOrganizationUseCase,
  CreateOrganizationUseCase,
  UpdateOrganizationUseCase,
  UpdateOrganizationStatusUseCase,
} from '../use-cases/organization.use-cases';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
  ListOrganizationsQueryDto,
  OrganizationListResponseDto,
  OrganizationItemResponseDto,
} from '../dto/organization.dto';

@ApiTags('Admin - Corporate Organizations')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/corporate/organizations')
export class AdminCorporateOrganizationsController {
  constructor(
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly updateOrganizationStatusUseCase: UpdateOrganizationStatusUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'List corporate organizations' })
  @ApiResponse({ status: 200, type: OrganizationListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async list(@Query() query: ListOrganizationsQueryDto) {
    const result = await this.listOrganizationsUseCase.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
      sortBy: query.sortBy ?? 'createdAt',
      sortDirection: query.sortDirection ?? 'desc',
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Get(':id')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'Get corporate organization details' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationItemResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getOrganizationUseCase.execute(id);
    return { success: true as const, data: result };
  }

  @Post()
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_MANAGE)
  @ApiOperation({ summary: 'Create corporate organization' })
  @ApiResponse({ status: 201, type: OrganizationItemResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input or duplicate company code',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async create(
    @Body() body: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.createOrganizationUseCase.execute(body);
    return { success: true as const, data: result };
  }

  @Patch(':id')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_MANAGE)
  @ApiOperation({ summary: 'Update corporate organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    const result = await this.updateOrganizationUseCase.execute({
      id,
      ...body,
    });
    return { success: true as const, data: result };
  }

  @Patch(':id/status')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_MANAGE)
  @ApiOperation({ summary: 'Update corporate organization status' })
  @ApiParam({ name: 'id', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: OrganizationItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationStatusDto,
  ) {
    const result = await this.updateOrganizationStatusUseCase.execute({
      id,
      status: body.status,
    });
    return { success: true as const, data: result };
  }
}
