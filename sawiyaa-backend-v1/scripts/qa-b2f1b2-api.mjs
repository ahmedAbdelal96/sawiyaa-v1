import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const baseUrl = process.env.BLOC_2F1B2_API_URL ?? 'http://127.0.0.1:6101/api/v1';
const artifactDir = process.env.BLOC_2F1B2_ARTIFACT_DIR ?? 'D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F1B2';
const prisma = new PrismaClient();

const expected = {
  aId: 'a2f1b200-0000-4000-8000-000000000021',
  aSlug: 'bloc-2f1b2-practitioner-a',
  bId: 'a2f1b200-0000-4000-8000-000000000022',
  dId: 'a2f1b200-0000-4000-8000-000000000024',
  displayName: 'BLOC QA Practitioner A',
  titles: { ar: 'معالج أسري متقدم', en: 'Advanced Family Therapist' },
  tokens: { arTitle: 'متقدم', arBio: 'المتكامل', enTitle: 'Advanced', enBio: 'integrated' },
};

const calls = [];

async function get(path, locale, search) {
  const url = new URL(`${baseUrl}${path}`);
  if (search) url.searchParams.set('search', search);
  url.searchParams.set('limit', '50');
  calls.push({ locale, url: url.toString() });
  const response = await fetch(url, { headers: { 'x-lang': locale, 'accept-language': locale } });
  const body = await response.json();
  if (!response.ok || body.success !== true) throw new Error(`${response.status} ${url}: ${JSON.stringify(body)}`);
  return body.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(`BLOC-2F1B2 API assertion failed: ${message}`);
}

function unique(values) { return new Set(values).size === values.length; }

function practitionerSummary(data) {
  return data.items.map((item) => ({ id: item.id, slug: item.slug, displayName: item.displayName, professionalTitle: item.professionalTitle }));
}

function packageSummary(data) {
  return data.items.map((item) => ({
    practitioner: { id: item.practitioner.id, slug: item.practitioner.publicSlug, displayName: item.practitioner.displayName, professionalTitle: item.practitioner.professionalTitle },
    packagePlan: item.packagePlan,
    selectedDurationMinutes: item.selectedDurationMinutes,
    availableDurations: item.availableDurations,
    activeQuote: item.activeQuote,
    ctaHref: item.ctaHref,
  }));
}

async function main() {
  const practitioner = {};
  const packages = {};
  for (const [key, locale, token] of [
    ['arTitle', 'ar', expected.tokens.arTitle],
    ['arBio', 'ar', expected.tokens.arBio],
    ['enTitle', 'en', expected.tokens.enTitle],
    ['enBio', 'en', expected.tokens.enBio],
    ['legacy', 'en', 'LegacyOnlyNeedle'],
    ['dedup', 'en', 'DedupNeedle'],
    ['specialty', 'en', 'SpecialtyNeedle'],
  ]) {
    practitioner[key] = await get('/public/practitioners', locale, token);
  }
  for (const [key, locale, token] of [
    ['arTitle', 'ar', expected.tokens.arTitle],
    ['arBio', 'ar', expected.tokens.arBio],
    ['enTitle', 'en', expected.tokens.enTitle],
    ['enBio', 'en', expected.tokens.enBio],
    ['legacy', 'en', 'LegacyOnlyNeedle'],
    ['dedup', 'en', 'DedupNeedle'],
  ]) {
    packages[key] = await get('/public/package-offers', locale, token);
  }

  assert(practitioner.arTitle.pagination.totalItems === 1, 'AR translated title should return one practitioner');
  assert(practitioner.arBio.pagination.totalItems === 1, 'AR translated bio should return one practitioner');
  assert(practitioner.enTitle.pagination.totalItems === 1, 'EN translated title should return one practitioner');
  assert(practitioner.enBio.pagination.totalItems === 1, 'EN translated bio should return one practitioner');
  for (const key of ['arTitle', 'arBio', 'enTitle', 'enBio']) {
    const item = practitioner[key].items[0];
    assert(item.id === expected.aId && item.slug === expected.aSlug, `${key} should identify practitioner A`);
    assert(item.displayName === expected.displayName, `${key} must keep canonical displayName`);
  }
  assert(practitioner.arTitle.items[0].professionalTitle === expected.titles.ar, 'AR title must resolve from AR translation');
  assert(practitioner.enTitle.items[0].professionalTitle === expected.titles.en, 'EN title must resolve from EN translation');

  assert(practitioner.legacy.pagination.totalItems === 1 && practitioner.legacy.items[0].id === expected.bId, 'legacy-only search regression');
  assert(practitioner.dedup.pagination.totalItems === 1 && unique(practitioner.dedup.items.map((item) => item.id)), 'practitioner dedup');
  assert(practitioner.specialty.pagination.totalItems === practitioner.specialty.items.length && unique(practitioner.specialty.items.map((item) => item.id)), 'specialty search must preserve unique IDs');
  assert(!practitioner.enTitle.items.some((item) => item.id === 'a2f1b200-0000-4000-8000-000000000023'), 'non-public translation match must be excluded');

  for (const key of ['arTitle', 'arBio', 'enTitle', 'enBio', 'legacy', 'dedup']) {
    assert(packages[key].pagination.totalItems === 1, `package ${key} should return one offer`);
    assert(unique(packages[key].items.map((item) => item.practitioner.id)), `package ${key} must not duplicate practitioner IDs`);
  }
  assert(packages.arTitle.items[0].practitioner.id === expected.aId, 'AR package title should identify practitioner A');
  assert(packages.enTitle.items[0].practitioner.id === expected.aId, 'EN package title should identify practitioner A');
  assert(packages.legacy.items[0].practitioner.id === expected.bId, 'legacy package search regression');
  assert(packages.dedup.items[0].practitioner.id === expected.dId, 'package dedup should produce the normal single offer');

  const arPackage = packages.arTitle.items[0];
  const enPackage = packages.enTitle.items[0];
  assert(arPackage.packagePlan.code === 'SESSIONS_4' && enPackage.packagePlan.code === 'SESSIONS_4', 'package plan invariant');
  assert(arPackage.packagePlan.sessionCount === 4 && enPackage.packagePlan.sessionCount === 4, 'session count invariant');
  assert(Number(arPackage.packagePlan.discountPercent) === 10 && Number(enPackage.packagePlan.discountPercent) === 10, 'discount invariant');
  assert(JSON.stringify(arPackage.availableDurations) === JSON.stringify(enPackage.availableDurations), 'available durations/prices must be locale invariant');
  assert(JSON.stringify(arPackage.activeQuote) === JSON.stringify(enPackage.activeQuote), 'active quote must be locale invariant');
  assert(arPackage.ctaHref === enPackage.ctaHref, 'package CTA destination must be locale invariant');
  assert(arPackage.practitioner.professionalTitle === expected.titles.ar && enPackage.practitioner.professionalTitle === expected.titles.en, 'package title localization');

  const sequences = {
    arEnAr: [
      practitioner.arTitle.items[0],
      (await get('/public/practitioners', 'en', expected.tokens.enTitle)).items[0],
      (await get('/public/practitioners', 'ar', expected.tokens.arTitle)).items[0],
    ],
    enArEn: [
      practitioner.enTitle.items[0],
      (await get('/public/practitioners', 'ar', expected.tokens.arTitle)).items[0],
      (await get('/public/practitioners', 'en', expected.tokens.enTitle)).items[0],
    ],
  };
  assert(sequences.arEnAr.map((item) => item.id).every((id) => id === expected.aId), 'AR/EN/AR locale isolation');
  assert(sequences.enArEn.map((item) => item.id).every((id) => id === expected.aId), 'EN/AR/EN locale isolation');
  assert(sequences.arEnAr[0].professionalTitle === expected.titles.ar && sequences.arEnAr[1].professionalTitle === expected.titles.en && sequences.arEnAr[2].professionalTitle === expected.titles.ar, 'AR/EN/AR presentation isolation');
  assert(sequences.enArEn[0].professionalTitle === expected.titles.en && sequences.enArEn[1].professionalTitle === expected.titles.ar && sequences.enArEn[2].professionalTitle === expected.titles.en, 'EN/AR/EN presentation isolation');

  const baseline = await get('/public/practitioners', 'en');
  const baselinePackages = await get('/public/package-offers', 'en');
  assert(unique(baseline.items.map((item) => item.id)), 'baseline practitioner total must not contain duplicate IDs');
  assert(unique(baselinePackages.items.map((item) => item.practitioner.id)), 'baseline package total must not contain duplicate practitioner IDs');
  assert(baseline.pagination.totalItems === baseline.items.length, 'baseline totalItems semantics');
  assert(baselinePackages.pagination.totalItems === baselinePackages.items.length, 'baseline package totalItems semantics');

  const dbCounts = await prisma.$queryRawUnsafe(`SELECT (SELECT count(*)::int FROM "PractitionerProfileTranslation") AS translations, (SELECT count(*)::int FROM "PractitionerProfile") AS profiles`);
  const result = {
    apiBaseUrl: baseUrl,
    fixture: { utf8: true, practitionerA: expected, dbCounts },
    practitioner: Object.fromEntries(Object.entries(practitioner).map(([key, data]) => [key, { pagination: data.pagination, items: practitionerSummary(data) }])),
    packages: Object.fromEntries(Object.entries(packages).map(([key, data]) => [key, { pagination: data.pagination, items: packageSummary(data) }])),
    localeIsolation: sequences,
    invariants: { baselinePractitioners: baseline.pagination, baselinePackages: baselinePackages.pagination, clientContract: 'search query + x-lang/Accept-Language boundary' },
    requests: calls,
  };
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(`${artifactDir}/api-results.json`, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ status: 'PASS', artifact: `${artifactDir}/api-results.json`, checks: ['localized title', 'localized bio', 'legacy', 'non-public exclusion', 'dedup', 'specialty', 'locale isolation', 'package invariants'] }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
