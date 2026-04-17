import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
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
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PractitionerStatementSuccessResponseDto } from '../dto/financial-operations-response.dto';
import { ListPractitionerStatementDto } from '../dto/practitioner-statement.dto';
import { GetPractitionerStatementUseCase } from '../use-cases/get-practitioner-statement.use-case';

@ApiTags('Admin - Practitioner Statements')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/practitioners/:practitionerId/statement')
export class AdminPractitionerStatementsController {
  constructor(
    private readonly getPractitionerStatementUseCase: GetPractitionerStatementUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get practitioner statement timeline',
    description:
      'Returns a truthful practitioner financial timeline built from ledger earnings and payout records. Running balances are intentionally not invented here.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({ status: 200, type: PractitionerStatementSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getStatement(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListPractitionerStatementDto,
  ) {
    return this.getPractitionerStatementUseCase.execute({
      practitionerId,
      query,
    });
  }
}
