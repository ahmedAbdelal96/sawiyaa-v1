import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class HelpCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  titleAr!: string;

  @ApiProperty()
  titleEn!: string;

  @ApiPropertyOptional({ nullable: true })
  descriptionAr!: string | null;

  @ApiPropertyOptional({ nullable: true })
  descriptionEn!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class HelpQuestionDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categorySlug!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryTitleAr!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryTitleEn!: string | null;

  @ApiProperty()
  questionAr!: string;

  @ApiProperty()
  questionEn!: string;

  @ApiProperty()
  answerAr!: string;

  @ApiProperty()
  answerEn!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class HelpCategoriesResponseDto {
  @ApiProperty({ type: HelpCategoryDto, isArray: true })
  items!: HelpCategoryDto[];
}

export class HelpQuestionsResponseDto {
  @ApiProperty({ type: HelpQuestionDto, isArray: true })
  items!: HelpQuestionDto[];
}

export class PublicHelpResponseDto {
  @ApiProperty({ type: HelpCategoryDto, isArray: true })
  categories!: HelpCategoryDto[];

  @ApiProperty({ type: HelpQuestionDto, isArray: true })
  questions!: HelpQuestionDto[];
}

export class UpsertHelpCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  titleAr!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  titleEn!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertHelpQuestionDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  questionAr!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  questionEn!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  answerAr!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  answerEn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class HelpCategoryOrderItemDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class HelpQuestionOrderItemDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderHelpCategoriesDto {
  @ApiProperty({ type: HelpCategoryOrderItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HelpCategoryOrderItemDto)
  items!: HelpCategoryOrderItemDto[];
}

export class ReorderHelpQuestionsDto {
  @ApiProperty({ type: HelpQuestionOrderItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HelpQuestionOrderItemDto)
  items!: HelpQuestionOrderItemDto[];
}
