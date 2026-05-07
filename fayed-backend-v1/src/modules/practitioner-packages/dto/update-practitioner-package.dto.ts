import { PartialType } from '@nestjs/swagger';
import { CreatePractitionerPackageDto } from './create-practitioner-package.dto';

export class UpdatePractitionerPackageDto extends PartialType(
  CreatePractitionerPackageDto,
) {}
