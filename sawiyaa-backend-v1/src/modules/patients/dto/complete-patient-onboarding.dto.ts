import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Dedicated DTO keeps the onboarding intent explicit even though PATCH /patients/me remains the only public endpoint in Phase 1.
 */
export class CompletePatientOnboardingDto {
  @ApiProperty()
  @IsBoolean()
  completeOnboarding!: boolean;
}
