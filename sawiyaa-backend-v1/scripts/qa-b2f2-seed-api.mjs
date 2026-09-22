const baseUrl = process.env.BLOC_2F2_API_URL ?? 'http://127.0.0.1:6101/api/v1';

const expected = {
  s1: {
    slug: 'dev-b2f2-s1-ar-primary',
    arTitle: 'BLOC2F2_AR_TITLE_S1',
    enTitle: 'BLOC2F2_EN_TITLE_S1',
  },
  s2: {
    slug: 'dev-b2f2-s2-en-primary',
    arTitle: 'BLOC2F2_AR_TITLE_S2',
    enTitle: 'BLOC2F2_EN_TITLE_S2',
  },
  s3: { slug: 'dev-b2f2-s3-partial-secondary', enTitle: 'BLOC2F2_EN_TITLE_S3' },
  s4: { slug: 'dev-b2f2-s4-legacy-only' },
  s6: { slug: 'dev-b2f2-s6-dedup' },
};

function assert(condition, message) {
  if (!condition) throw new Error(`BLOC-2F2 API assertion failed: ${message}`);
}

async function get(path, locale, search) {
  const url = new URL(`${baseUrl}${path}`);
  if (search) url.searchParams.set('search', search);
  url.searchParams.set('limit', '50');
  const response = await fetch(url, {
    headers: { 'x-lang': locale, 'accept-language': locale },
  });
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    throw new Error(`${response.status} ${url}: ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function main() {
  const arS1 = await get('/public/practitioners', 'ar', 'BLOC2F2_AR_TITLE_S1');
  const enS1 = await get('/public/practitioners', 'en', 'BLOC2F2_EN_TITLE_S1');
  const arS2 = await get('/public/practitioners', 'ar', 'BLOC2F2_AR_TITLE_S2');
  const enS2 = await get('/public/practitioners', 'en', 'BLOC2F2_EN_TITLE_S2');
  const arBioS1 = await get('/public/practitioners', 'ar', 'BLOC2F2_AR_BIO_S1');
  const enBioS1 = await get('/public/practitioners', 'en', 'BLOC2F2_EN_BIO_S1');
  const enS3 = await get('/public/practitioners', 'en', 'BLOC2F2_EN_TITLE_S3');
  const legacyS4 = await get(
    '/public/practitioners',
    'en',
    'BLOC2F2_LEGACY_TITLE_S4',
  );
  const hiddenS5 = await get(
    '/public/practitioners',
    'en',
    'BLOC2F2_HIDDEN_EN_TITLE_S5',
  );
  const dedupS6 = await get('/public/practitioners', 'en', 'BLOC2F2_DEDUP_S6');

  for (const [name, data, slug] of [
    ['AR S1 title', arS1, expected.s1.slug],
    ['EN S1 title', enS1, expected.s1.slug],
    ['AR S2 title', arS2, expected.s2.slug],
    ['EN S2 title', enS2, expected.s2.slug],
    ['AR S1 bio', arBioS1, expected.s1.slug],
    ['EN S1 bio', enBioS1, expected.s1.slug],
    ['EN S3 title', enS3, expected.s3.slug],
    ['legacy S4', legacyS4, expected.s4.slug],
    ['dedup S6', dedupS6, expected.s6.slug],
  ]) {
    assert(data.pagination.totalItems === 1, `${name} should return one item`);
    assert(
      data.items[0].slug === slug,
      `${name} returned ${data.items[0].slug}`,
    );
  }
  assert(
    hiddenS5.pagination.totalItems === 0,
    'S5 must be excluded from public search',
  );

  const arS1Details = (
    await get(`/public/practitioners/${expected.s1.slug}`, 'ar')
  ).item;
  const enS1Details = (
    await get(`/public/practitioners/${expected.s1.slug}`, 'en')
  ).item;
  const arS2Details = (
    await get(`/public/practitioners/${expected.s2.slug}`, 'ar')
  ).item;
  const enS2Details = (
    await get(`/public/practitioners/${expected.s2.slug}`, 'en')
  ).item;
  const enS3Details = (
    await get(`/public/practitioners/${expected.s3.slug}`, 'en')
  ).item;
  const arS4Details = (
    await get(`/public/practitioners/${expected.s4.slug}`, 'ar')
  ).item;
  const enS4Details = (
    await get(`/public/practitioners/${expected.s4.slug}`, 'en')
  ).item;

  assert(
    arS1Details.professionalTitle.includes(expected.s1.arTitle),
    'S1 AR title projection',
  );
  assert(
    enS1Details.professionalTitle.includes(expected.s1.enTitle),
    'S1 EN title projection',
  );
  assert(
    arS2Details.professionalTitle.includes(expected.s2.arTitle),
    'S2 AR title projection',
  );
  assert(
    enS2Details.professionalTitle.includes(expected.s2.enTitle),
    'S2 EN title projection',
  );
  assert(
    enS3Details.professionalTitle.includes(expected.s3.enTitle),
    'S3 EN title projection',
  );
  assert(
    enS3Details.fullBio.includes('BLOC2F2_AR_BIO_S3'),
    'S3 EN bio field fallback',
  );
  assert(
    arS4Details.fullBio.includes('BLOC2F2_LEGACY_BIO_S4'),
    'S4 AR legacy fallback',
  );
  assert(
    enS4Details.fullBio.includes('BLOC2F2_LEGACY_BIO_S4'),
    'S4 EN legacy fallback',
  );

  const arPackage = await get(
    '/public/package-offers',
    'ar',
    'BLOC2F2_AR_TITLE_S1',
  );
  const enPackage = await get(
    '/public/package-offers',
    'en',
    'BLOC2F2_EN_TITLE_S1',
  );
  const dedupPackage = await get(
    '/public/package-offers',
    'en',
    'BLOC2F2_DEDUP_S6',
  );
  const uniquePackageOwners = (data) =>
    new Set(data.items.map((item) => item.practitioner.publicSlug));
  assert(
    uniquePackageOwners(arPackage).size === 1,
    'AR package title owner deduplication',
  );
  assert(
    uniquePackageOwners(enPackage).size === 1,
    'EN package title owner deduplication',
  );
  assert(
    uniquePackageOwners(dedupPackage).size === 1,
    'S6 package owner deduplication',
  );
  assert(
    arPackage.items.length > 1,
    'AR package search should retain package-plan rows',
  );
  assert(
    enPackage.items.length === arPackage.items.length,
    'localized package row count',
  );
  assert(
    dedupPackage.items[0].practitioner.publicSlug === expected.s6.slug,
    'S6 package dedup owner',
  );
  assert(
    JSON.stringify(arPackage.items[0].availableDurations) ===
      JSON.stringify(enPackage.items[0].availableDurations),
    'package durations/prices must remain locale invariant',
  );

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        checks: [
          'AR/EN localized title search',
          'AR/EN bio search',
          'partial secondary field fallback',
          'legacy-only fallback',
          'non-public exclusion',
          'public deduplication',
          'package search and invariants',
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
