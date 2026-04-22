import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
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
import {
  CustomerWalletEntriesSuccessResponseDto,
  CustomerWalletSummarySuccessResponseDto,
} from '../dto/customer-wallet-response.dto';
import { ListCustomerWalletEntriesDto } from '../dto/list-customer-wallet-entries.dto';
import { GetCustomerWalletSummaryUseCase } from '../use-cases/get-customer-wallet-summary.use-case';
import { ListCustomerWalletEntriesUseCase } from '../use-cases/list-customer-wallet-entries.use-case';

@ApiTags('Customer Wallet')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/wallet')
export class PatientCustomerWalletController {
  constructor(
    private readonly getCustomerWalletSummaryUseCase: GetCustomerWalletSummaryUseCase,
    private readonly listCustomerWalletEntriesUseCase: ListCustomerWalletEntriesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get authenticated patient wallet summary',
  })
  @ApiResponse({ status: 200, type: CustomerWalletSummarySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access wallet routes',
  })
  summary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('currencyCode') currencyCode?: string,
  ) {
    return this.getCustomerWalletSummaryUseCase.execute({
      userId: currentUser.id,
      currencyCode,
    });
  }

  @Get('entries')
  @ApiOperation({
    summary: 'List authenticated patient wallet entries',
  })
  @ApiResponse({ status: 200, type: CustomerWalletEntriesSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access wallet routes',
  })
  entries(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListCustomerWalletEntriesDto,
  ) {
    return this.listCustomerWalletEntriesUseCase.execute({
      userId: currentUser.id,
      query,
    });
  }
}
