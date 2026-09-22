import { parseOptionalInteger } from './auth.config';

describe('auth optional numeric environment values', () => {
  it.each([undefined, '', '   '])(
    'treats blank value %j as unset',
    (value) => {
      expect(parseOptionalInteger(value)).toBeUndefined();
    },
  );

  it('parses a configured integer', () => {
    expect(parseOptionalInteger(' 5 ')).toBe(5);
  });
});
