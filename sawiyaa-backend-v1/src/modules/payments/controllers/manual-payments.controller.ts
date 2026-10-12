import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';
import {
  ListManualPaymentSubmissionsDto,
  RejectManualPaymentDto,
  SubmitManualPaymentDto,
  UpsertManualPaymentMethodDto,
} from '../dto/manual-payment.dto';
import { ManualPaymentService } from '../services/manual-payment.service';

type UploadedProof = { buffer: Buffer; mimetype: string; originalname?: string };

@ApiTags('Manual Payments')
@Controller('manual-payments')
export class ManualPaymentsController {
  constructor(private readonly service: ManualPaymentService) {}

  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'List enabled manual payment methods eligible for the request country' })
  listAvailableMethods(@Req() request: Request) {
    return this.service.listAvailableMethods(resolveCountryFromRequest(request).countryCode);
  }

  @Post('academy/enrollments/:enrollmentId/submissions')
  @Public()
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit one manual payment proof for an Academy enrollment' })
  submit(
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
    @Body() body: SubmitManualPaymentDto,
    @UploadedFile() proof: UploadedProof | undefined,
    @CurrentUser() user: AuthenticatedUser | null,
    @Req() request: Request,
  ) {
    return this.service.submit({
      enrollmentId,
      token: body.token,
      userId: user?.id,
      countryIsoCode: resolveCountryFromRequest(request).countryCode,
      payload: body,
      proof,
    });
  }

  @Get('academy/enrollments/:enrollmentId/submissions')
  @Public()
  listPatientSubmissions(
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
    @Query('token') token: string | undefined,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.service.listPatientSubmissions({ enrollmentId, token, userId: user?.id });
  }

  @Get('admin/methods')
  @AdminManualRead(PermissionKey.MANUAL_PAYMENTS_METHODS_READ)
  listMethods() {
    return this.service.listMethods();
  }

  @Post('admin/methods')
  @AdminManualManage(PermissionKey.MANUAL_PAYMENTS_METHODS_MANAGE)
  createMethod(@Body() body: UpsertManualPaymentMethodDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createMethod({ payload: body, actor: { id: user.id, roles: user.roles } });
  }

  @Patch('admin/methods/:id')
  @AdminManualManage(PermissionKey.MANUAL_PAYMENTS_METHODS_MANAGE)
  updateMethod(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpsertManualPaymentMethodDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateMethod({ id, payload: body, actor: { id: user.id, roles: user.roles } });
  }

  @Patch('admin/methods/:id/enabled')
  @AdminManualManage(PermissionKey.MANUAL_PAYMENTS_METHODS_MANAGE)
  setEnabled(@Param('id', new ParseUUIDPipe()) id: string, @Body('enabled') enabled: boolean, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setMethodEnabled({ id, enabled: Boolean(enabled), actor: { id: user.id, roles: user.roles } });
  }

  @Get('admin/submissions')
  @AdminManualRead(PermissionKey.MANUAL_PAYMENTS_SUBMISSIONS_READ)
  listSubmissions(@Query() query: ListManualPaymentSubmissionsDto) {
    return this.service.listSubmissions(query);
  }

  @Get('admin/submissions/:id')
  @AdminManualRead(PermissionKey.MANUAL_PAYMENTS_SUBMISSIONS_READ)
  getSubmission(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getSubmission(id);
  }

  @Get('admin/submissions/:id/proof')
  @AdminManualRead(PermissionKey.MANUAL_PAYMENTS_PROOFS_READ)
  async proof(@Param('id', new ParseUUIDPipe()) id: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.service.resolveProof(id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.sizeBytes));
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Post('admin/submissions/:id/approve')
  @AdminManualReview(PermissionKey.MANUAL_PAYMENTS_SUBMISSIONS_REVIEW)
  approve(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve({ id, actor: { id: user.id, roles: user.roles } });
  }

  @Post('admin/submissions/:id/reject')
  @AdminManualReview(PermissionKey.MANUAL_PAYMENTS_SUBMISSIONS_REVIEW)
  reject(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: RejectManualPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reject({ id, payload: body, actor: { id: user.id, roles: user.roles } });
  }
}

function AdminManualRead(permission: PermissionKey): MethodDecorator {
  return ((target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)(target, propertyKey, descriptor);
    Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)(target, propertyKey, descriptor);
    Permissions(permission)(target, propertyKey, descriptor);
  }) as MethodDecorator;
}

function AdminManualManage(permission: PermissionKey): MethodDecorator { return AdminManualRead(permission); }
function AdminManualReview(permission: PermissionKey): MethodDecorator { return AdminManualRead(permission); }
