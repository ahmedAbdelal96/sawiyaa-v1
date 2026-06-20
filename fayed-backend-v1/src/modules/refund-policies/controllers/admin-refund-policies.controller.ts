import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RefundPolicyType } from '@prisma/client';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import {
  CreateRefundPolicyClauseDto,
  PublicRefundPoliciesCurrentResponseDto,
  RefundPoliciesResponseDto,
  RefundPolicyDto,
  ReorderRefundPolicyClausesDto,
  UpdateRefundPolicyDto,
} from '../dto/refund-policy.dto';
import { RefundPolicyService } from '../services/refund-policy.service';

@ApiTags('Refund Policies')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Permissions(PermissionKey.REFUNDS_APPROVE)
@Controller('admin/refund-policies')
export class AdminRefundPoliciesController {
  constructor(private readonly refundPolicyService: RefundPolicyService) {}

  @Get()
  @Permissions(PermissionKey.REFUNDS_RETRY)
  @ApiOperation({
    summary: 'List refund policies',
    description:
      'Returns the current refund policies and their ordered clauses.',
  })
  @ApiResponse({ status: 200, type: RefundPoliciesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  listPolicies() {
    return this.refundPolicyService.listPolicies();
  }

  @Get(':policyType')
  @Permissions(PermissionKey.REFUNDS_RETRY)
  @ApiOperation({
    summary: 'Read a refund policy',
    description: 'Returns a single refund policy with its ordered clauses.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Policy was not found' })
  getPolicy(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
  ) {
    return this.refundPolicyService.getPolicy(policyType);
  }

  @Patch(':policyType')
  @ApiOperation({
    summary: 'Update a refund policy',
    description: 'Updates the policy titles and active status.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiBody({ type: UpdateRefundPolicyDto })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Policy was not found' })
  updatePolicy(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
    @Body() body: UpdateRefundPolicyDto,
  ) {
    return this.refundPolicyService.updatePolicy(policyType, body);
  }

  @Patch(':policyType/clauses/reorder')
  @ApiOperation({
    summary: 'Reorder refund policy clauses',
    description: 'Updates clause sort order for the selected policy.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiBody({ type: ReorderRefundPolicyClausesDto })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Policy was not found' })
  reorderClauses(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
    @Body() body: ReorderRefundPolicyClausesDto,
  ) {
    return this.refundPolicyService.reorderClauses(policyType, body);
  }

  @Post(':policyType/clauses')
  @ApiOperation({
    summary: 'Create a refund policy clause',
    description: 'Adds a new clause to the selected policy.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiBody({ type: CreateRefundPolicyClauseDto })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Policy was not found' })
  createClause(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
    @Body() body: CreateRefundPolicyClauseDto,
  ) {
    return this.refundPolicyService.createClause(policyType, body);
  }

  @Patch(':policyType/clauses/:clauseId')
  @ApiOperation({
    summary: 'Update a refund policy clause',
    description: 'Updates a single clause within the selected policy.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiParam({ name: 'clauseId', description: 'Policy clause UUID' })
  @ApiBody({ type: CreateRefundPolicyClauseDto })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Clause was not found' })
  updateClause(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
    @Param('clauseId')
    clauseId: string,
    @Body() body: CreateRefundPolicyClauseDto,
  ) {
    return this.refundPolicyService.updateClause(policyType, clauseId, body);
  }

  @Delete(':policyType/clauses/:clauseId')
  @ApiOperation({
    summary: 'Delete a refund policy clause',
    description: 'Deletes a single clause from the selected policy.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiParam({ name: 'clauseId', description: 'Policy clause UUID' })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Clause was not found' })
  deleteClause(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
    @Param('clauseId')
    clauseId: string,
  ) {
    return this.refundPolicyService.deleteClause(policyType, clauseId);
  }
}
