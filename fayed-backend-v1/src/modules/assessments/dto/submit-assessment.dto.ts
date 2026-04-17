import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAssessmentAnswerDto {
  @ApiProperty({
    example: 'q1_frequency',
    description: 'Stable question key from assessment definition',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_:-]+$/i)
  questionKey!: string;

  @ApiProperty({
    example: 'often',
    description: 'Selected option key for the question',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_:-]+$/i)
  selectedOptionKey!: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({
    type: SubmitAssessmentAnswerDto,
    isArray: true,
    description: 'Completed single-choice answer set for the selected assessment',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAssessmentAnswerDto)
  answers!: SubmitAssessmentAnswerDto[];
}

export { SubmitAssessmentAnswerDto };
