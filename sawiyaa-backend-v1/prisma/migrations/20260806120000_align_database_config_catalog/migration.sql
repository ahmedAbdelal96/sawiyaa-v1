-- Keep the development Database Config catalog aligned with the canonical
-- registry. These keys are required by the Admin Platform Settings list and
-- by finance policy resolution.

INSERT INTO "ConfigKeyCatalog"
  ("id", "key", "slug", "displayName", "description", "configKind", "dataType", "category", "isSensitive", "isRequired", "supportsOverride", "defaultValueJson", "createdAt", "updatedAt")
VALUES
  ('2c24e5d9-6d46-4e28-8f4c-000000000201', 'finance.practitionerSharePercent.sameCountry', 'finance-practitioner-share-percent-same-country', 'Practitioner Share Percent (Same Country)', 'Default percentage allocated to practitioner when patient and practitioner share the same country.', 'POLICY', 'NUMBER', 'PAYOUT', false, true, true, '70'::jsonb, now(), now()),
  ('2c24e5d9-6d46-4e28-8f4c-000000000202', 'finance.practitionerSharePercent.crossCountry', 'finance-practitioner-share-percent-cross-country', 'Practitioner Share Percent (Cross Country)', 'Default percentage allocated to practitioner when patient and practitioner are in different countries.', 'POLICY', 'NUMBER', 'PAYOUT', false, true, true, '50'::jsonb, now(), now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "ConfigValue"
  ("id", "configKeyId", "scopeType", "priority", "isActive", "valueNumber", "createdAt", "updatedAt")
SELECT md5(c."id"::text || ':global')::uuid,
       c."id",
       'GLOBAL',
       100,
       true,
       CASE c."key"
         WHEN 'finance.practitionerSharePercent.sameCountry' THEN 70
         WHEN 'finance.practitionerSharePercent.crossCountry' THEN 50
       END,
       now(),
       now()
FROM "ConfigKeyCatalog" c
WHERE c."key" IN (
  'finance.practitionerSharePercent.sameCountry',
  'finance.practitionerSharePercent.crossCountry'
)
AND NOT EXISTS (
  SELECT 1
  FROM "ConfigValue" v
  WHERE v."configKeyId" = c."id"
    AND v."scopeType" = 'GLOBAL'
    AND v."scopeRefId" IS NULL
);
