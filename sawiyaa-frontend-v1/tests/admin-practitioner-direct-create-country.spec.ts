import { expect, test } from '@playwright/test';
import {
  buildCountryOptions,
  resolveCountryLoadState,
} from '../src/features/admin/practitioner-applications/utils/country-source';
import { normalizeDirectCreateTranslationKey } from '../src/features/admin/practitioner-applications/utils/country-source';

test.describe('Admin direct-create country source contract', () => {
  test('builds select options from backend country records only', () => {
    const options = buildCountryOptions([
      {
        id: 'country-eg',
        isoCode: 'EG',
        name: 'Egypt',
        nativeName: 'Egypt',
      },
      {
        id: 'country-sa',
        isoCode: 'SA',
        name: 'Saudi Arabia',
        nativeName: 'Saudi Arabia',
      },
    ]);

    expect(options).toEqual([
      { value: 'EG', label: 'Egypt (EG)', description: null, searchText: 'Egypt Egypt EG' },
      {
        value: 'SA',
        label: 'Saudi Arabia (SA)',
        description: null,
        searchText: 'Saudi Arabia Saudi Arabia SA',
      },
    ]);
  });

  test('blocks selection and submit when countries endpoint is empty', () => {
    const state = resolveCountryLoadState({
      isLoading: false,
      isError: false,
      isSuccess: true,
      optionsCount: 0,
    });

    expect(state.countriesEmpty).toBeTruthy();
    expect(state.countrySelectionBlocked).toBeTruthy();
  });

  test('distinguishes loading and failure from empty success', () => {
    const loading = resolveCountryLoadState({
      isLoading: true,
      isError: false,
      isSuccess: false,
      optionsCount: 0,
    });
    expect(loading.countriesLoading).toBeTruthy();
    expect(loading.countriesEmpty).toBeFalsy();

    const failed = resolveCountryLoadState({
      isLoading: false,
      isError: true,
      isSuccess: false,
      optionsCount: 0,
    });
    expect(failed.countriesLoadFailed).toBeTruthy();
    expect(failed.countrySelectionBlocked).toBeTruthy();
  });

  test('allows submit path only when backend countries are available', () => {
    const state = resolveCountryLoadState({
      isLoading: false,
      isError: false,
      isSuccess: true,
      optionsCount: 2,
    });

    expect(state.countrySelectionBlocked).toBeFalsy();
  });

  test('maps direct-create validation keys to the existing admin catalog namespace', () => {
    expect(
      normalizeDirectCreateTranslationKey(
        'applications.directCreate.validation.titleRequired',
      ),
    ).toBe('applications.validation.titleRequired');
    expect(
      normalizeDirectCreateTranslationKey(
        'applications.directCreate.validationCategoryRequired',
      ),
    ).toBe('applications.validationCategoryRequired');
  });
});
