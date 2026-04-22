import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  CustomerWalletEntriesSuccessResponseDto,
  CustomerWalletSummarySuccessResponseDto,
} from '../dto/customer-wallet-response.dto';
import { ListCustomerWalletEntriesDto } from '../dto/list-customer-wallet-entries.dto';
import { GetCustomerWalletSummaryUseCase } from '../use-cases/get-customer-wallet-summary.use-case';
import { ListCustomerWalletEntriesUseCase } from '../use-cases/list-customer-wallet-entries.use-case';

@ApiTags('Admin - Customer Wallet')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/patients/:patientId/wallet')
export class AdminCustomerWalletController {
  constructor(
    private readonly getCustomerWalletSummaryUseCase: GetCustomerWalletSummaryUseCase,
    private readonly listCustomerWalletEntriesUseCase: ListCustomerWalletEntriesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get wallet summary for a specific patient profile',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({ status: 200, type: CustomerWalletSummarySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles may access this route',
  })
  summary(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query('currencyCode') currencyCode?: string,
  ) {
    return this.getCustomerWalletSummaryUseCase.execute({
      patientId,
      currencyCode,
    });
  }

  @Get('entries')
  @ApiOperation({
    summary: 'List wallet entries for a specific patient profile',
  })
  @ApiParam({ name: 'patientId', description: 'Patient profile id' })
  @ApiResponse({ status: 200, type: CustomerWalletEntriesSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles may access this route',
  })
  entries(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query() query: ListCustomerWalletEntriesDto,
  ) {
    return this.listCustomerWalletEntriesUseCase.execute({
      patientId,
      query,
    });
  }
}
