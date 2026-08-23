import type { ValidationError } from 'class-validator';
import { summarizeValidationErrors } from './summarize-validation-errors';

describe('summarizeValidationErrors', () => {
  it('returns field paths and constraint names without request values', () => {
    const errors: ValidationError[] = [
      {
        property: 'slots',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'startTime',
                constraints: { isTimeFormat: 'contains a private value' },
                children: [],
              },
            ],
            constraints: {},
          },
        ],
        constraints: {},
      },
    ];

    expect(summarizeValidationErrors(errors)).toEqual([
      { field: 'slots[0].startTime', constraints: ['isTimeFormat'] },
    ]);
    expect(JSON.stringify(summarizeValidationErrors(errors))).not.toContain('private value');
  });
});
