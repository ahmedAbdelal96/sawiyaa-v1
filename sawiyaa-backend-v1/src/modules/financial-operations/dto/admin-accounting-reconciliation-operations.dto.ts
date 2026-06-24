import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, Max, Min } from 'class-validator';

function normalizeUppercase(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeTrimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class TriggerAccountingReconciliationRunDto {
  @IsOptional()
  @Transform(({ value }) => normalizeUppercase(value))
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(90)
  lookbackDays?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(10)
  @Max(1000)
  batchSize?: number;

  @IsOptional()
  @IsString()
  query?: string;
}

export class ListAccountingReconciliationRunsDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  scope?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  status?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  trigger?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  entityType?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  entityId?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeUppercase(value))
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  triggeredByUserId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class ListAccountingReconciliationIssuesDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  scope?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  status?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  severity?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  entityType?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  entityId?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeUppercase(value))
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  issueCode?: string;

  @IsOptional()
  @IsString()
  runId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class UpdateAccountingReconciliationIssueDto {
  @IsOptional()
  @Transform(({ value }) => normalizeTrimmed(value))
  @IsString()
  note?: string;
}
