import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
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
import { Response } from 'express';
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
  GenerateCodeBatchUseCase,
  ListCodeBatchesUseCase,
  GetCodeBatchUseCase,
  RevokeCodeBatchUseCase,
} from '../use-cases/code-batch.use-cases';
import { CorporateBenefitPlanRepository } from '../repositories/corporate-benefit-plan.repository';
import {
  GenerateCodeBatchDto,
  ListCodeBatchesQueryDto,
  RevokeCodeBatchDto,
  CodeBatchListResponseDto,
  CodeBatchItemResponseDto,
} from '../dto/code-batch.dto';

@ApiTags('Admin - Corporate Code Batches')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller('admin/corporate')
export class AdminCorporateCodeBatchesController {
  constructor(
    private readonly generateCodeBatchUseCase: GenerateCodeBatchUseCase,
    private readonly listCodeBatchesUseCase: ListCodeBatchesUseCase,
    private readonly getCodeBatchUseCase: GetCodeBatchUseCase,
    private readonly revokeCodeBatchUseCase: RevokeCodeBatchUseCase,
    private readonly planRepository: CorporateBenefitPlanRepository,
  ) {}

  @Post('plans/:planId/code-batches')
  @Permissions(PermissionKey.CORPORATE_CODES_GENERATE)
  @ApiOperation({ summary: 'Generate a batch of benefit codes for a plan' })
  @ApiParam({ name: 'planId', description: 'Benefit Plan UUID' })
  @ApiResponse({ status: 201 })
  @ApiBadRequestResponse({ description: 'Invalid input or business rule violation' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @HttpCode(HttpStatus.CREATED)
  async generateBatch(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: GenerateCodeBatchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.generateCodeBatchUseCase.execute({
      benefitPlanId: planId,
      name: body.name,
      totalCodes: body.totalCodes,
      expiresAt: body.expiresAt,
      createdByAdminId: currentUser.id,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="batch-${result.batchId}.csv"`,
    );
    res.setHeader('X-Batch-Id', result.batchId);
    res.setHeader('X-Total-Codes', result.totalCodes.toString());
    res.setHeader('X-Generated-Count', result.generatedCount.toString());

    res.status(HttpStatus.OK).send(result.csvContent);
  }

  @Get('plans/:planId/code-batches')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'List code batches for a benefit plan' })
  @ApiParam({ name: 'planId', description: 'Benefit Plan UUID' })
  @ApiResponse({ status: 200, type: CodeBatchListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listByPlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Query() query: ListCodeBatchesQueryDto,
  ) {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Benefit plan with ID ${planId} not found`);
    }

    const result = await this.listCodeBatchesUseCase.execute({
      benefitPlanId: planId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      sortBy: query.sortBy ?? 'createdAt',
      sortDirection: query.sortDirection ?? 'desc',
    });

    return { success: true as const, data: result };
  }

  @Get('code-batches/:id')
  @Permissions(PermissionKey.CORPORATE_ORGANIZATIONS_READ)
  @ApiOperation({ summary: 'Get code batch details (no full codes exposed)' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, type: CodeBatchItemResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getBatch(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getCodeBatchUseCase.execute(id);
    return { success: true as const, data: result };
  }

  @Post('code-batches/:id/revoke')
  @Permissions(PermissionKey.CORPORATE_CODES_REVOKE)
  @ApiOperation({ summary: 'Revoke a code batch (revokes all AVAILABLE codes)' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200 })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async revokeBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevokeCodeBatchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.revokeCodeBatchUseCase.execute({
      batchId: id,
      revokedByAdminId: currentUser.id,
      revokeReason: body.revokeReason,
    });

    return { success: true as const, data: result };
  }
}
