import { z } from 'zod';
import {
  paymobGatewayMethodEntrySchema,
  paymentRouteSchema,
} from '@modules/payment-gateway-control/schemas/paymob-gateway-control.schema';
import { ConfigJsonSchemaId } from './config-definition.types';

const schemas = {
  'payment.provider.paymob.methodRegistry.v1': z.array(
    paymobGatewayMethodEntrySchema,
  ),
  'payment.routing.currencyRoutes.v1': z.array(paymentRouteSchema),
} satisfies Record<ConfigJsonSchemaId, z.ZodTypeAny>;

export function validateConfigJsonValue(
  schemaId: ConfigJsonSchemaId,
  value: unknown,
): { success: true } | { success: false; issues: string[] } {
  const result = schemas[schemaId].safeParse(value);
  return result.success
    ? { success: true }
    : {
        success: false,
        issues: result.error.issues.map((issue) =>
          `${issue.path.join('.')} ${issue.message}`.trim(),
        ),
      };
}
