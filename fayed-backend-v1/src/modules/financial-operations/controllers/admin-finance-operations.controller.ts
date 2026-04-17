import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import {
  FinanceOperationEventItemSuccessResponseDto,
  FinanceOperationEventListSuccessResponseDto,
} from '../dto/financial-operations-response.dto';
import { ListFinanceOperationEventsDto } from '../dto/list-finance-operation-events.dto';
import { GetFinanceOperationEventUseCase } from '../use-cases/get-finance-operation-event.use-case';
import { ListFinanceOperationEventsUseCase } from '../use-cases/list-finance-operation-events.use-case';

@ApiTags('Admin - Finance Operations')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/finance/operations')
export class AdminFinanceOperationsController {
  constructor(
    private readonly listFinanceOperationEventsUseCase: ListFinanceOperationEventsUseCase,
    private readonly getFinanceOperationEventUseCase: GetFinanceOperationEventUseCase,
  ) {}

  @Get('events')
  @ApiOperation({
    summary: 'List finance operation events',
    description:
      'Returns normalized, repository-backed payment/refund operation events for operational finance debugging workflows.',
  })
  @ApiResponse({ status: 200, type: FinanceOperationEventListSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid filter semantics for finance operations event inspection',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  listEvents(@Query() query: ListFinanceOperationEventsDto) {
    return this.listFinanceOperationEventsUseCase.execute(query);
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Get finance operation event detail',
    description:
      'Returns one normalized event detail row with safe operational metadata and linked finance references.',
  })
  @ApiParam({ name: 'id', description: 'Finance operation event id' })
  @ApiResponse({ status: 200, type: FinanceOperationEventItemSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Event id must be a valid UUID' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Finance operation event was not found in scope' })
  eventDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getFinanceOperationEventUseCase.execute(id);
  }
}
