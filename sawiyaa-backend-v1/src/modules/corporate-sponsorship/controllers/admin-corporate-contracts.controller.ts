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
  NotFoundException,
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
import {
  ListContractsUseCase,
  GetContractUseCase,
  CreateContractUseCase,
  UpdateContractUseCase,
  UpdateContractStatusUseCase,
} from '../use-cases/contract.use-cases';
import { CorporateOrganizationRepository } from '../repositories/corporate-organization.repository';
import {
  CreateContractDto,
  UpdateContractDto,
  UpdateContractStatusDto,
  ListContractsQueryDto,
  ContractListResponseDto,
  ContractItemResponseDto,
} from '../dto/contract.dto';

@ApiTags('Admin - Corporate Contracts')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/corporate')
export class AdminCorporateContractsController {
  constructor(
    private readonly listContractsUseCase: ListContractsUseCase,
    private readonly getContractUseCase: GetContractUseCase,
    private readonly createContractUseCase: CreateContractUseCase,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly updateContractStatusUseCase: UpdateContractStatusUseCase,
    private readonly organizationRepository: CorporateOrganizationRepository,
  ) {}

  @Get('organizations/:organizationId/contracts')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'List contracts for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 200, type: ContractListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ListContractsQueryDto,
  ) {
    const result = await this.listContractsUseCase.execute({
      organizationId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      sortBy: query.sortBy ?? 'createdAt',
      sortDirection: query.sortDirection ?? 'desc',
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Get('contracts/:id')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'Get contract details' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({ status: 200, type: ContractItemResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getContractUseCase.execute(id);
    return { success: true as const, data: result };
  }

  @Post('organizations/:organizationId/contracts')
  @Permissions(PermissionKey.CORPORATE_CONTRACTS_MANAGE)
  @ApiOperation({ summary: 'Create contract for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: 201, type: ContractItemResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input or business rule violation',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: CreateContractDto,
  ) {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    const result = await this.createContractUseCase.execute({
      organizationId,
      startDate: body.startDate,
      endDate: body.endDate,
      billingMode: body.billingMode,
      currency: body.currency,
      market: body.market,
      status: body.status,
      notes: body.notes,
    });

    return { success: true as const, data: result };
  }

  @Patch('contracts/:id')
  @Permissions(PermissionKey.CORPORATE_CONTRACTS_MANAGE)
  @ApiOperation({ summary: 'Update contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({ status: 200, type: ContractItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContractDto,
  ) {
    const result = await this.updateContractUseCase.execute({ id, ...body });
    return { success: true as const, data: result };
  }

  @Patch('contracts/:id/status')
  @Permissions(PermissionKey.CORPORATE_CONTRACTS_MANAGE)
  @ApiOperation({ summary: 'Update contract status' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({ status: 200, type: ContractItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContractStatusDto,
  ) {
    const result = await this.updateContractStatusUseCase.execute({
      id,
      status: body.status,
    });
    return { success: true as const, data: result };
  }
}
