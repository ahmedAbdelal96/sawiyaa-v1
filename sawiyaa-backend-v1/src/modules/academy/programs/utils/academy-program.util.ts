import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeAcademyPriceValue } from '../../utils/academy-pricing.util';
import { slugifyAcademyTitle } from '../../utils/academy-slug.util';

export type AcademyProgramRequiredField =
  | 'titleAr'
  | 'titleEn'
  | 'descriptionAr'
  | 'descriptionEn'
  | 'priceEgp'
  | 'priceUsd'
  | 'startAt'
  | 'endAt';

export function normalizeAcademyProgramPriceValue(
  value?: string | null,
): string | null {
  const normalized = normalizeAcademyPriceValue(value);
  if (!normalized) {
    return null;
  }

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    throw new BadRequestException({
      messageKey: 'academyProgram.errors.invalidPrice',
      error: 'ACADEMY_PROGRAM_INVALID_PRICE',
    });
  }

  if (decimal.isNegative()) {
    throw new BadRequestException({
      messageKey: 'academyProgram.errors.invalidPrice',
      error: 'ACADEMY_PROGRAM_INVALID_PRICE',
    });
  }

  return decimal.toFixed(2);
}

export function parseAcademyProgramDate(
  value?: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      messageKey: 'academyProgram.errors.invalidDate',
      error: 'ACADEMY_PROGRAM_INVALID_DATE',
    });
  }

  return parsed;
}

export function ensureAcademyProgramWindowIsValid(input: {
  startAt: Date | null;
  endAt: Date | null;
}) {
  if (input.startAt && input.endAt && input.endAt <= input.startAt) {
    throw new BadRequestException({
      messageKey: 'academyProgram.errors.invalidWindow',
      error: 'ACADEMY_PROGRAM_INVALID_WINDOW',
    });
  }
}

const ACADEMY_PROGRAM_REQUIRED_FIELD_ERRORS: Record<
  AcademyProgramRequiredField,
  {
    messageKey: string;
    error: string;
  }
> = {
  titleAr: {
    messageKey: 'academyProgram.errors.titleArRequired',
    error: 'ACADEMY_PROGRAM_TITLE_AR_REQUIRED',
  },
  titleEn: {
    messageKey: 'academyProgram.errors.titleEnRequired',
    error: 'ACADEMY_PROGRAM_TITLE_EN_REQUIRED',
  },
  descriptionAr: {
    messageKey: 'academyProgram.errors.descriptionArRequired',
    error: 'ACADEMY_PROGRAM_DESCRIPTION_AR_REQUIRED',
  },
  descriptionEn: {
    messageKey: 'academyProgram.errors.descriptionEnRequired',
    error: 'ACADEMY_PROGRAM_DESCRIPTION_EN_REQUIRED',
  },
  priceEgp: {
    messageKey: 'academyProgram.errors.priceEgpRequired',
    error: 'ACADEMY_PROGRAM_PRICE_EGP_REQUIRED',
  },
  priceUsd: {
    messageKey: 'academyProgram.errors.priceUsdRequired',
    error: 'ACADEMY_PROGRAM_PRICE_USD_REQUIRED',
  },
  startAt: {
    messageKey: 'academyProgram.errors.startAtRequired',
    error: 'ACADEMY_PROGRAM_START_AT_REQUIRED',
  },
  endAt: {
    messageKey: 'academyProgram.errors.endAtRequired',
    error: 'ACADEMY_PROGRAM_END_AT_REQUIRED',
  },
};

function throwAcademyProgramRequiredFieldError(field: AcademyProgramRequiredField): never {
  const error = ACADEMY_PROGRAM_REQUIRED_FIELD_ERRORS[field];
  throw new BadRequestException({
    messageKey: error.messageKey,
    error: error.error,
  });
}

export function ensureAcademyProgramRequiredFields(input: {
  titleAr?: string | null;
  titleEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  priceEgp?: string | null;
  priceUsd?: string | null;
  startAt?: Date | null;
  endAt?: Date | null;
}) {
  const requiredFields: Array<[AcademyProgramRequiredField, string | Date | null | undefined]> = [
    ['titleAr', input.titleAr],
    ['titleEn', input.titleEn],
    ['descriptionAr', input.descriptionAr],
    ['descriptionEn', input.descriptionEn],
    ['priceEgp', input.priceEgp],
    ['priceUsd', input.priceUsd],
    ['startAt', input.startAt],
    ['endAt', input.endAt],
  ];

  for (const [field, value] of requiredFields) {
    if (typeof value === 'string') {
      if (!value.trim()) {
        throwAcademyProgramRequiredFieldError(field);
      }
      continue;
    }

    if (value === null || value === undefined) {
      throwAcademyProgramRequiredFieldError(field);
    }
  }
}

export function resolveAcademyProgramSlugSource(input: {
  slug?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
}): string {
  const source =
    input.slug?.trim() || input.titleEn?.trim() || input.titleAr?.trim();

  if (!source) {
    throw new BadRequestException({
      messageKey: 'academyProgram.errors.missingSlugSource',
      error: 'ACADEMY_PROGRAM_MISSING_SLUG_SOURCE',
    });
  }

  return slugifyAcademyTitle(source);
}
