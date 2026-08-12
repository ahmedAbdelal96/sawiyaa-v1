import type { ValidationError } from 'class-validator';

export type SafeValidationField = {
  field: string;
  constraints: string[];
};

function appendPath(path: string, child: ValidationError): string {
  return child.property.match(/^\d+$/) ? `${path}[${child.property}]` : `${path}.${child.property}`;
}

export function summarizeValidationErrors(
  errors: ValidationError[],
): SafeValidationField[] {
  const output: SafeValidationField[] = [];

  function visit(error: ValidationError, path = error.property) {
    const constraints = error.constraints ? Object.keys(error.constraints).sort() : [];
    if (constraints.length > 0) output.push({ field: path, constraints });
    for (const child of error.children ?? []) visit(child, appendPath(path, child));
  }

  for (const error of errors) visit(error);
  return output.slice(0, 50);
}
