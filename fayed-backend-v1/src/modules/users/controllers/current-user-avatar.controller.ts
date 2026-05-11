import {
  Controller,
  Delete,
  Get,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GetCurrentUserAvatarFileUseCase } from '../use-cases/get-current-user-avatar-file.use-case';
import { RemoveCurrentUserAvatarUseCase } from '../use-cases/remove-current-user-avatar.use-case';
import { UpdateCurrentUserAvatarUseCase } from '../use-cases/update-current-user-avatar.use-case';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('users/me/avatar')
export class CurrentUserAvatarController {
  constructor(
    private readonly updateCurrentUserAvatarUseCase: UpdateCurrentUserAvatarUseCase,
    private readonly removeCurrentUserAvatarUseCase: RemoveCurrentUserAvatarUseCase,
    private readonly getCurrentUserAvatarFileUseCase: GetCurrentUserAvatarFileUseCase,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 512 * 1024 } }),
  )
  @ApiOperation({
    summary: 'Upload current user avatar',
    description:
      'Uploads or replaces the current user avatar with strict validation and deterministic storage cleanup.',
  })
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
  @ApiResponse({ status: 201, description: 'Avatar updated' })
  @ApiBadRequestResponse({
    description: 'Missing file, unsupported image type, or file too large',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  uploadAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @UploadedFile() file: UploadedAvatarFile | undefined,
  ) {
    return this.updateCurrentUserAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
      file,
    });
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove current user avatar',
    description: 'Removes current user avatar and deletes stored file.',
  })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  removeAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.removeCurrentUserAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get current user avatar binary',
    description: 'Returns the current user avatar binary stream.',
  })
  @ApiResponse({ status: 200, description: 'Avatar binary stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  @ApiNotFoundResponse({ description: 'Avatar does not exist' })
  async getAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const avatar = await this.getCurrentUserAvatarFileUseCase.execute({
      userId: currentUser.id,
    });

    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(createReadStream(avatar.absolutePath));
  }
}
