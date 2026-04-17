import { ConfigDataType, Prisma } from '@prisma/client';
import { ConfigTypeMismatchException } from '../exceptions/config-type-mismatch.exception';
import { ConfigValueFormatException } from '../exceptions/config-value-format.exception';

type DbConfigValueShape = {
  valueString: string | null;
  valueNumber: Prisma.Decimal | null;
  valueBoolean: boolean | null;
  valueJson: Prisma.JsonValue | null;
};

export function extractDatabaseConfigValue(
  dataType: ConfigDataType,
  value: DbConfigValueShape,
): Prisma.JsonValue | string | number | boolean | null {
  switch (dataType) {
    case ConfigDataType.STRING:
      return value.valueString;
    case ConfigDataType.NUMBER:
      return value.valueNumber ? value.valueNumber.toNumber() : null;
    case ConfigDataType.BOOLEAN:
      return value.valueBoolean;
    case ConfigDataType.JSON:
    case ConfigDataType.STRING_ARRAY:
    case ConfigDataType.NUMBER_ARRAY:
      return value.valueJson;
    default:
      return null;
  }
}

export function assertConfigValueType(
  key: string,
  expected: ConfigDataType,
  actual: ConfigDataType,
): void {
  if (expected !== actual) {
    throw new ConfigTypeMismatchException(key, expected, actual);
  }
}

export function assertJsonCompatibleConfigType(
  key: string,
  actual: ConfigDataType,
): void {
  if (
    actual !== ConfigDataType.JSON &&
    actual !== ConfigDataType.STRING_ARRAY &&
    actual !== ConfigDataType.NUMBER_ARRAY
  ) {
    throw new ConfigTypeMismatchException(key, 'JSON_COMPATIBLE', actual);
  }
}

export function assertResolvedJsonValueMatchesDataType(
  key: string,
  actualType: ConfigDataType,
  value: Prisma.JsonValue | string | number | boolean | null,
): void {
  if (value === null) {
    return;
  }

  if (actualType === ConfigDataType.STRING_ARRAY) {
    const isValidStringArray =
      Array.isArray(value) && value.every((item) => typeof item === 'string');

    if (!isValidStringArray) {
      throw new ConfigValueFormatException(key, ConfigDataType.STRING_ARRAY);
    }
  }

  if (actualType === ConfigDataType.NUMBER_ARRAY) {
    const isValidNumberArray =
      Array.isArray(value) && value.every((item) => typeof item === 'number');

    if (!isValidNumberArray) {
      throw new ConfigValueFormatException(key, ConfigDataType.NUMBER_ARRAY);
    }
  }
}
