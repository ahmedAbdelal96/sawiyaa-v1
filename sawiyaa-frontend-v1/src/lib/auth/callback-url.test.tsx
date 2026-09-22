import { describe, expect, it } from 'vitest';
import { normalizeCallbackPath } from './callback-url';

describe('normalizeCallbackPath', () => {
  it('keeps internal practitioner paths and strips a duplicated locale', () => {
    expect(normalizeCallbackPath('/ar/patient/practitioners/dr-ali?intent=book')).toBe(
      '/patient/practitioners/dr-ali?intent=book',
    );
  });

  it('rejects external and protocol-relative targets', () => {
    expect(normalizeCallbackPath('https://evil.example/steal')).toBeNull();
    expect(normalizeCallbackPath('//evil.example/steal')).toBeNull();
  });
});
