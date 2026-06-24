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
  ListBenefitPlansUseCase,
  GetBenefitPlanUseCase,
  CreateBenefitPlanUseCase,
  UpdateBenefitPlanUseCase,
  UpdateBenefitPlanStatusUseCase,
} from '../use-cases/benefit-plan.use-cases';
import { CorporateContractRepository } from '../repositories/corporate-contract.repository';
import {
  CreateBenefitPlanDto,
  UpdateBenefitPlanDto,
  UpdateBenefitPlanStatusDto,
  ListBenefitPlansQueryDto,
  BenefitPlanListResponseDto,
  BenefitPlanItemResponseDto,
} from '../dto/benefit-plan.dto';

@ApiTags('Admin - Corporate Benefit Plans')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/corporate')
export class AdminCorporateBenefitPlansController {
  constructor(
    private readonly listBenefitPlansUseCase: ListBenefitPlansUseCase,
    private readonly getBenefitPlanUseCase: GetBenefitPlanUseCase,
    private readonly createBenefitPlanUseCase: CreateBenefitPlanUseCase,
    private readonly updateBenefitPlanUseCase: UpdateBenefitPlanUseCase,
    private readonly updateBenefitPlanStatusUseCase: UpdateBenefitPlanStatusUseCase,
    private readonly contractRepository: CorporateContractRepository,
  ) {}

  @Get('contracts/:contractId/plans')
  @Permissions(PermissionKey.CORPORATE_PLANS_MANAGE)
  @ApiOperation({ summary: 'List benefit plans for a contract' })
  @ApiParam({ name: 'contractId', description: 'Contract UUID' })
  @ApiResponse({ status: 200, type: BenefitPlanListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Query() query: ListBenefitPlansQueryDto,
  ) {
    const result = await this.listBenefitPlansUseCase.execute({
      contractId,
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

  @Get('plans/:id')
  @Permissions(PermissionKey.CORPORATE_PLANS_MANAGE)
  @ApiOperation({ summary: 'Get benefit plan details' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: 200, type: BenefitPlanItemResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getBenefitPlanUseCase.execute(id);
    return { success: true as const, data: result };
  }

  @Post('contracts/:contractId/plans')
  @Permissions(PermissionKey.CORPORATE_PLANS_MANAGE)
  @ApiOperation({ summary: 'Create benefit plan for a contract' })
  @ApiParam({ name: 'contractId', description: 'Contract UUID' })
  @ApiResponse({ status: 201, type: BenefitPlanItemResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input or business rule violation',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async create(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() body: CreateBenefitPlanDto,
  ) {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    const result = await this.createBenefitPlanUseCase.execute({
      contractId,
      name: body.name,
      coverageType: body.coverageType,
      coveragePercent: body.coveragePercent,
      maxCoverageAmount: body.maxCoverageAmount,
      maxTotalCoverage: body.maxTotalCoverage,
      currency: body.currency,
      codeUsageLimit: body.codeUsageLimit,
      codeReservationTtlMinutes: body.codeReservationTtlMinutes,
      status: body.status,
      specialtyIds: body.specialtyIds,
      practitionerIds: body.practitionerIds,
    });

    return { success: true as const, data: result };
  }

  @Patch('plans/:id')
  @Permissions(PermissionKey.CORPORATE_PLANS_MANAGE)
  @ApiOperation({ summary: 'Update benefit plan' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: 200, type: BenefitPlanItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBenefitPlanDto,
  ) {
    const result = await this.updateBenefitPlanUseCase.execute({ id, ...body });
    return { success: true as const, data: result };
  }

  @Patch('plans/:id/status')
  @Permissions(PermissionKey.CORPORATE_PLANS_MANAGE)
  @ApiOperation({ summary: 'Update benefit plan status' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: 200, type: BenefitPlanItemResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBenefitPlanStatusDto,
  ) {
    const result = await this.updateBenefitPlanStatusUseCase.execute({
      id,
      status: body.status,
    });
    return { success: true as const, data: result };
  }
}
