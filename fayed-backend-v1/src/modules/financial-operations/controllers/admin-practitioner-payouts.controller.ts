import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  PractitionerPayoutCreateSuccessResponseDto,
  PractitionerPayoutDetailSuccessResponseDto,
  PractitionerPayoutDueListSuccessResponseDto,
  PractitionerPayoutHistoryListSuccessResponseDto,
  PractitionerPayoutProofUploadSuccessResponseDto,
} from '../dto/financial-operations-response.dto';
import {
  ListPractitionerPayoutDueDto,
  ListPractitionerPayoutHistoryDto,
  RecordPractitionerPayoutDto,
} from '../dto/practitioner-payout.dto';
import { GetPractitionerPayoutDetailUseCase } from '../use-cases/get-practitioner-payout-detail.use-case';
import { GetPractitionerPayoutProofFileUseCase } from '../use-cases/get-practitioner-payout-proof-file.use-case';
import { ListPractitionerPayoutDuesUseCase } from '../use-cases/list-practitioner-payout-dues.use-case';
import { ListPractitionerPayoutHistoryUseCase } from '../use-cases/list-practitioner-payout-history.use-case';
import { RecordPractitionerPayoutUseCase } from '../use-cases/record-practitioner-payout.use-case';
import { UploadPractitionerPayoutProofUseCase } from '../use-cases/upload-practitioner-payout-proof.use-case';

@ApiTags('Admin - Practitioner Payouts')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/practitioners/:practitionerId/payouts')
export class AdminPractitionerPayoutsController {
  constructor(
    private readonly listPractitionerPayoutDuesUseCase: ListPractitionerPayoutDuesUseCase,
    private readonly listPractitionerPayoutHistoryUseCase: ListPractitionerPayoutHistoryUseCase,
    private readonly getPractitionerPayoutDetailUseCase: GetPractitionerPayoutDetailUseCase,
    private readonly recordPractitionerPayoutUseCase: RecordPractitionerPayoutUseCase,
    private readonly uploadPractitionerPayoutProofUseCase: UploadPractitionerPayoutProofUseCase,
    private readonly getPractitionerPayoutProofFileUseCase: GetPractitionerPayoutProofFileUseCase,
  ) {}

  @Get('due')
  @ApiOperation({
    summary: 'Get practitioner payout dues',
    description:
      'Returns current payout-relevant practitioner settlement rows and currency-level due summaries. Batch data is not part of this operational surface.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({
    status: 200,
    type: PractitionerPayoutDueListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getDues(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListPractitionerPayoutDueDto,
  ) {
    return this.listPractitionerPayoutDuesUseCase.execute({
      practitionerId,
      query,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List practitioner payout history',
    description:
      'Returns practitioner payout history records with proof metadata when available. This is the primary practitioner-centric review surface.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({
    status: 200,
    type: PractitionerPayoutHistoryListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  listHistory(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListPractitionerPayoutHistoryDto,
  ) {
    return this.listPractitionerPayoutHistoryUseCase.execute({
      practitionerId,
      query,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Record practitioner payout',
    description:
      'Records a practitioner payout against one due settlement row. Partial payout is supported as long as the paid amount does not exceed the remaining due.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiBody({ type: RecordPractitionerPayoutDto })
  @ApiResponse({
    status: 201,
    type: PractitionerPayoutCreateSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed, amount does not match due, or payout state is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({
    description: 'Practitioner profile or due row was not found',
  })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  record(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: RecordPractitionerPayoutDto,
  ) {
    return this.recordPractitionerPayoutUseCase.execute({
      practitionerId,
      body,
      operatorUserId: currentUser.id,
    });
  }

  @Post(':payoutId/proof')
  @ApiOperation({
    summary: 'Upload practitioner payout proof',
    description:
      'Stores an image or PDF proof for a practitioner payout record and keeps the file linked to the payout record.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiParam({ name: 'payoutId', description: 'Practitioner payout id' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    type: PractitionerPayoutProofUploadSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Missing proof file, invalid type, or file too large',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({
    description: 'Practitioner profile or payout record was not found',
  })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  uploadProof(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
  ) {
    return this.uploadPractitionerPayoutProofUseCase.execute({
      practitionerId,
      payoutId,
      file,
    });
  }

  @Get(':payoutId/proof')
  @ApiOperation({
    summary: 'Get practitioner payout proof file',
    description:
      'Streams the stored payout proof file. The proof remains linked to the payout record and is not exposed as a public asset.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiParam({ name: 'payoutId', description: 'Practitioner payout id' })
  @ApiResponse({ status: 200, description: 'Proof file stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile, payout, or proof file was not found',
  })
  async getProof(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const proof = await this.getPractitionerPayoutProofFileUseCase.execute({
      practitionerId,
      payoutId,
    });

    response.setHeader('Content-Type', proof.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    if (proof.originalFileName) {
      response.setHeader(
        'Content-Disposition',
        `inline; filename="${proof.originalFileName}"`,
      );
    }

    return new StreamableFile(createReadStream(proof.item.absolutePath));
  }

  @Get(':payoutId')
  @ApiOperation({
    summary: 'Get practitioner payout detail',
    description:
      'Returns one practitioner payout record and its linked due settlement snapshot. Batch groups remain historical only.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiParam({ name: 'payoutId', description: 'Practitioner payout id' })
  @ApiResponse({
    status: 200,
    type: PractitionerPayoutDetailSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile or payout record was not found',
  })
  getDetail(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
  ) {
    return this.getPractitionerPayoutDetailUseCase.execute({
      practitionerId,
      payoutId,
    });
  }
}
