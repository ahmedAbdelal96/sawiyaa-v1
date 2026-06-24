#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function toPascalCase(value) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

const moduleName = process.argv[2];
if (!moduleName) {
  console.error("Usage: npm run module:new -- <module-name>");
  process.exit(1);
}

const root = process.cwd();
const pascal = toPascalCase(moduleName);
const featureDir = path.join(root, "src", "features", moduleName);
const pageDir = path.join(root, "src", "app", "[locale]", "(admin)", moduleName);
const hooksDir = path.join(root, "src", "lib", "api", "hooks");
const servicesDir = path.join(root, "src", "lib", "api", "services");
const messagesEnDir = path.join(root, "messages", "en");
const messagesArDir = path.join(root, "messages", "ar");

ensureDir(path.join(featureDir, "components"));
ensureDir(pageDir);
ensureDir(hooksDir);
ensureDir(servicesDir);
ensureDir(messagesEnDir);
ensureDir(messagesArDir);

const created = [];

const clientComponentPath = path.join(
  featureDir,
  "components",
  `${pascal}Client.tsx`
);
if (
  writeIfMissing(
    clientComponentPath,
    `"use client";

import { useTranslations } from "next-intl";

export function ${pascal}Client() {
  const t = useTranslations("${moduleName}");

  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary p-6">
      <h2 className="text-lg font-semibold text-text-primary">{t("page.heading")}</h2>
      <p className="mt-2 text-sm text-text-secondary">{t("page.subheading")}</p>
    </div>
  );
}
`
  )
) {
  created.push(path.relative(root, clientComponentPath));
}

const pagePath = path.join(pageDir, "page.tsx");
if (
  writeIfMissing(
    pagePath,
    `import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ${pascal}Client } from "@/features/${moduleName}/components/${pascal}Client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "${moduleName}" });

  return {
    title: t("page.title"),
    description: t("page.description"),
  };
}

export default async function ${pascal}Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="p-6">
      <${pascal}Client />
    </div>
  );
}
`
  )
) {
  created.push(path.relative(root, pagePath));
}

const servicePath = path.join(servicesDir, `${moduleName}.ts`);
if (
  writeIfMissing(
    servicePath,
    `import httpClient from "../http-client";
import { normalizeListQueryParams, type ListQueryParams } from "../query-params";

export const ${moduleName}Api = {
  async list(params?: ListQueryParams) {
    const normalized = normalizeListQueryParams(params);
    const response = await httpClient.get("/${moduleName}", { params: normalized });
    return response.data;
  },
};
`
  )
) {
  created.push(path.relative(root, servicePath));
}

const hookPath = path.join(hooksDir, `use-${moduleName}.ts`);
if (
  writeIfMissing(
    hookPath,
    `import { useQuery } from "@tanstack/react-query";
import { ${moduleName}Api } from "../services/${moduleName}";
import type { ListQueryParams } from "../query-params";

export const ${moduleName}Keys = {
  all: ["${moduleName}"] as const,
  list: (params?: ListQueryParams) => ["${moduleName}", "list", params ?? {}] as const,
};

export function use${pascal}List(params?: ListQueryParams) {
  return useQuery({
    queryKey: ${moduleName}Keys.list(params),
    queryFn: () => ${moduleName}Api.list(params),
  });
}
`
  )
) {
  created.push(path.relative(root, hookPath));
}

const i18nEnPath = path.join(messagesEnDir, `${moduleName}.json`);
if (
  writeIfMissing(
    i18nEnPath,
    `{
  "page": {
    "title": "${pascal} | Sawiyaa",
    "description": "Manage ${moduleName} module",
    "heading": "${pascal}",
    "subheading": "Module scaffold created. Implement real screens and API integration next."
  }
}
`
  )
) {
  created.push(path.relative(root, i18nEnPath));
}

const i18nArPath = path.join(messagesArDir, `${moduleName}.json`);
if (
  writeIfMissing(
    i18nArPath,
    `{
  "page": {
    "title": "${pascal} | Sawiyaa",
    "description": "إدارة وحدة ${moduleName}",
    "heading": "${pascal}",
    "subheading": "تم إنشاء الهيكل المبدئي للوحدة. أكمل الشاشات الفعلية وربط الـ API لاحقًا."
  }
}
`
  )
) {
  created.push(path.relative(root, i18nArPath));
}

if (created.length === 0) {
  console.log("No files created. Module scaffold already exists.");
  process.exit(0);
}

console.log("Module scaffold created:");
for (const file of created) {
  console.log(`- ${file}`);
}
