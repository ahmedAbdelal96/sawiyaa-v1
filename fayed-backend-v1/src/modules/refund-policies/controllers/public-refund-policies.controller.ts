import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RefundPolicyType } from '@prisma/client';
import {
  PublicRefundPoliciesCurrentResponseDto,
  RefundPolicyDto,
} from '../dto/refund-policy.dto';
import { RefundPolicyService } from '../services/refund-policy.service';

@ApiTags('Refund Policies')
@Controller('public/refund-policies')
export class PublicRefundPoliciesController {
  constructor(private readonly refundPolicyService: RefundPolicyService) {}

  @Get('current')
  @ApiOperation({
    summary: 'List current refund policies',
    description: 'Returns the current active refund policies for public pages.',
  })
  @ApiResponse({ status: 200, type: PublicRefundPoliciesCurrentResponseDto })
  listCurrent() {
    return this.refundPolicyService.getPublicCurrent();
  }

  @Get('session')
  @ApiOperation({
    summary: 'Read the current session refund policy',
    description:
      'Returns the current active session refund policy if published.',
  })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiNotFoundResponse({ description: 'Active session policy was not found' })
  getSessionPolicy() {
    return this.refundPolicyService.getPublicPolicy(RefundPolicyType.SESSION);
  }

  @Get('package')
  @ApiOperation({
    summary: 'Read the current package refund policy',
    description:
      'Returns the current active package refund policy if published.',
  })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiNotFoundResponse({ description: 'Active package policy was not found' })
  getPackagePolicy() {
    return this.refundPolicyService.getPublicPolicy(RefundPolicyType.PACKAGE);
  }

  @Get(':policyType')
  @ApiOperation({
    summary: 'Read a current refund policy by type',
    description:
      'Returns the current active refund policy for the requested type.',
  })
  @ApiParam({ name: 'policyType', enum: RefundPolicyType })
  @ApiResponse({ status: 200, type: RefundPolicyDto })
  @ApiNotFoundResponse({ description: 'Active policy was not found' })
  getByType(
    @Param('policyType', new ParseEnumPipe(RefundPolicyType))
    policyType: RefundPolicyType,
  ) {
    return this.refundPolicyService.getPublicPolicy(policyType);
  }
}
