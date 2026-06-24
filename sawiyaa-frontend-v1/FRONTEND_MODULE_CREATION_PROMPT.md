# Sawiyaa Frontend — Module & Page Creation Guide

> **هذا الملف هو المرجع الإلزامي لكل شاشة أو feature جديدة في المشروع.**
> اقرأه بالكامل قبل كتابة أي كود جديد.

---

## 1. مبادئ لا تُكسر

| المبدأ | التفاصيل |
|--------|----------|
| **SSR-first** | كل `page.tsx` يكون Server Component بشكل افتراضي. البيانات تُجلب server-side لصالح SEO والأداء. |
| **Thin pages** | `page.tsx` لا يحتوي business logic. يقرأ params/searchParams فقط، يمرر للـ components. |
| **Feature isolation** | كل domain له folder مستقل في `src/features/`. لا cross-feature imports مباشرة إلا من خلال index.ts. |
| **Real backend only** | لا mock data في الـ pages النهائية. لا static/fake screens. |
| **i18n من البداية** | كل نص مرئي يمر من `useTranslations` أو `getTranslations`. لا hardcoded strings. |
| **RTL/LTR** | كل component يعمل في ar وen. استخدم logical CSS (`start-`, `end-`, `rtl:`) وليس `left-`/`right-`. |
| **Dark mode** | كل component يحترم `dark:` variants من البداية. |
| **No client without reason** | `"use client"` فقط لو في: form state، animation، browser events، أو React Query hooks. |

> **القاعدة الذهبية للـ UX في فايد:**
> المستخدم يصل لما يحتاجه بأقل ضغطة زرار ممكنة، بتجربة سلسة واحترافية على كل الشاشات.

---

## 1b. معايير تجربة المستخدم (UX Standards) — إلزامية

### وصول سريع — أقل عدد خطوات ممكن

- **Zero dead ends:** كل صفحة فارغة أو error state فيها CTA واضح (مش فقط نص).
- **Progressive disclosure:** اعرض الأهم أولاً. التفاصيل في click ثاني.
- **Sticky navigation:** الـ navbar والـ sidebar تبقى accessible في أي scroll.
- **Back links واضحة:** في كل detail page يكون في رابط رجوع واضح للـ listing.
- **Breadcrumbs:** في كل صفحة لها hierarchy (listing → detail).
- **لا orphan pages:** كل صفحة متوصل ليها من مكان واضح في الـ navigation.
- **Smart defaults:** الـ filters والـ sorts تبدأ بأكثر قيمة للمستخدم (مش blank).

### Loading States — لا blank screens

```
كل component يجلب بيانات يحتاج:
  ✓ Skeleton (مش spinner) للـ content blocks الكبيرة
  ✓ Spinner مقبول للـ inline actions (زر save مثلاً)
  ✓ Optimistic updates للـ mutations البسيطة لو ممكن
  ✗ لا blank white screen
  ✗ لا layout shift بعد التحميل
```

### Empty States — مش فراغ

```
لما البيانات تبقى فاضية:
  ✓ Illustration أو icon معبر
  ✓ عنوان واضح يشرح السبب
  ✓ CTA أو اقتراح فعل (مثال: "ابدأ بإضافة..." أو "تصفح المختصين")
  ✗ لا "No data found" بدون context
```

### Error States — مش crash صامت

```
لو الـ API فشلت:
  ✓ رسالة human-readable (مش stack trace)
  ✓ زرار "حاول مرة أخرى" لو منطقي
  ✓ Fallback content لو الـ section مش critical
  ✗ لا blank section بدون explanation
```

### Feedback فوري على أي action

```
بعد كل mutation (save, update, delete):
  ✓ Toast notification أو inline success message
  ✓ الـ button يكون disabled + loading أثناء التنفيذ
  ✓ Validation errors تظهر inline قرب الـ field مش فقط في top
  ✗ لا صمت بعد الضغط على أي زرار
```

---

## 1c. معايير الـ Responsive Design — إلزامية

### نهج Mobile-first

```
اكتب الـ CSS للموبيل أولاً ثم وسّع للـ desktop:
  ✓ Base styles → موبيل (< 768px)
  ✓ md: → تابلت (768px+)
  ✓ lg: → ديسك توب (1024px+)
  ✓ xl: → شاشات كبيرة (1280px+)
```

### Breakpoints Checklist لكل شاشة

| الشاشة | المتطلب |
|--------|---------|
| **موبيل (< 768px)** | Single column. Navigation في bottom bar أو hamburger. Touch targets ≥ 44px. لا overflow أفقي. |
| **تابلت (768–1024px)** | 2-column layouts حيث منطقي. Sidebar collapsible. |
| **ديسك توب (1024px+)** | Full layout مع sidebar. Max-width container `max-w-7xl` centered. |

### قواعد لا تُكسر في الـ Layout

```
✓ max-w-7xl mx-auto px-4 sm:px-6 lg:px-8   ← container ثابت
✓ gap-4 sm:gap-6 lg:gap-8                  ← spacing يكبر مع الشاشة
✓ text-sm sm:text-base                     ← typography responsive
✓ grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ← grids تتكيف
✗ لا fixed widths بالـ px على containers
✗ لا overflow-x على أي level
✗ لا font-size أصغر من 12px على موبيل
```

### Touch UX على الموبيل

```
✓ كل الأزرار والـ links height ≥ 44px (Apple HIG minimum)
✓ Tap targets متباعدة (مش ملتصقة)
✓ Forms تفتح keyboard مناسب (type="email", type="tel", inputmode="numeric")
✓ Modals وDrawers تُغلق بـ swipe أو backdrop click
✓ الـ sticky header لا يأكل content مهم
```

### Typography Scale

```
✓ Headings: text-xl sm:text-2xl md:text-3xl lg:text-4xl
✓ Body: text-sm sm:text-base
✓ Captions/labels: text-xs sm:text-sm
✓ Line height كافي للقراءة: leading-relaxed للـ body text
✓ Arabic text: font-weight أثقل قليلاً أو استخدم font مناسب
```

### Consistency بين الشاشات

```
✓ نفس design tokens (colors, spacing, radii) في كل مكان
✓ نفس شكل الـ cards عبر كل الـ listings
✓ نفس الـ loading skeleton style في كل الـ features
✓ نفس الـ empty state style في كل الـ features
✓ نفس الـ error state style في كل الـ features
✓ الـ animations والـ transitions نفس timing (150ms–300ms)
```

### قاعدة مدخلات التاريخ — إلزامية

```
✗ ممنوع استخدام <input type="date"> مباشرة في أي form
✓ استخدم DateField (src/components/form/input/DateField.tsx) دائمًا

لماذا:
  - <input type="date"> يعطي browser-native UX مختلف بين المتصفحات
  - DateField يستخدم flatpickr: تجربة calendar موحدة، RTL/LTR safe، dark mode

كيفية الاستخدام مع react-hook-form:
  <Controller
    control={control}
    name="fieldName"
    render={({ field }) => (
      <DateField
        label={t("fields.fieldName.label")}
        placeholder={t("fields.fieldName.placeholder")}
        value={field.value ?? ""}
        onChange={field.onChange}
        error={errors.fieldName?.message}
      />
    )}
  />
```

---

## 2. بنية الـ Feature الصحيحة

```
src/features/<feature-name>/
  api/
    <feature>.api.ts          ← API calls (httpClient للـ client-side فقط)
    <feature>-ssr.api.ts      ← SSR-safe API calls (serverGet لـ Server Components)
  hooks/
    use-<feature>.ts          ← React Query hooks (useQuery / useMutation)
  types/
    <feature>.types.ts        ← TypeScript interfaces/types
  constants/
    query-keys.ts             ← Stable React Query keys factory
  components/
    <ComponentName>.tsx       ← Feature-specific components
  index.ts                    ← Barrel exports
```

### قواعد المجلدات

- **`api/`** — الـ API functions فقط. لا state، لا hooks.
  - `*.api.ts` → يستخدم `httpClient` (browser runtime, مع access token)
  - `*-ssr.api.ts` → يستخدم `serverGet` (Server Components, بدون browser deps)
- **`hooks/`** — React Query hooks فقط. تستدعي الـ api functions.
- **`types/`** — interfaces و types بالـ DTO pattern. لا inferred types.
- **`constants/query-keys.ts`** — factory object ثابت (لا magic strings منتشرة).
- **`components/`** — components خاصة بهذا الـ feature. الـ shared تروح `src/components/shared/`.
- **`index.ts`** — barrel export لكل ما في الـ feature.

---

## 2b. Feature Ownership & Naming Rules

### متى تستخدم `*-public`

- استخدم `*-public` عندما يكون الـ feature مالكًا لعقود public SSR/indexable pages فقط.
- أمثلة في فايِد:
  - `specialties-public` لقراءات specialties العامة
  - لا تضع داخله mutations أو auth-aware hooks
- لو نفس الـ resource له admin/private surface، يبقى public read في `*-public` والـ private/admin ownership في feature آخر واضح.

### متى تستخدم `*-discovery`

- استخدم `*-discovery` عندما يكون الهدف listing/search/filter/browse experience لمورد عام أو شبه عام.
- `practitioners-discovery` يملك:
  - public listing
  - filter normalization
  - pagination/search params mapping
  - listing cards / grid / empty states
- لا تضع داخله profile details ownership لو فيه detail page مستقلة.

### متى تستخدم `*-profile`

- استخدم `*-profile` عندما يكون الـ feature مالكًا لصفحة detail/profile لمورد واحد واضح.
- `practitioner-profile` يملك:
  - profile detail SSR fetch by slug
  - metadata / notFound / detail sections
- لا تضع داخله listing filters أو discovery query params.

### منع ازدواج ownership

- نفس الـ resource لا يملك أكثر من feature بدون سبب واضح ومكتوب.
- لا تكرر نفس backend contract types أو endpoint wrappers عبر أكثر من feature بدون سبب موثّق داخل التنفيذ أو summary.
- ممنوع وجود:
  - `practitioners` و `practitioners-public` و `practitioners-discovery` وكلهم ينفذون نفس list endpoint بدون boundary واضح.
- لو endpoint واحد يُستخدم في أكثر من مكان:
  - إما يبقى owned من feature واحد ويُعاد استخدامه
  - أو يُفصل ownership بسبب اختلاف domain حقيقي (`public` vs `dashboard`, `listing` vs `profile`)

### متى تمد feature موجودة بدل إنشاء feature جديدة

- مدّ feature موجودة إذا كان التغيير:
  - نفس resource
  - نفس route intent
  - نفس ownership boundary
- أنشئ feature جديدة فقط إذا كان هناك:
  - route intent مختلف بوضوح
  - public vs authenticated split حقيقي
  - listing/discovery boundary مختلفة عن detail/profile
  - backend contract مختلف وظيفيًا وليس مجرد شاشة جديدة لنفس الشيء

### قاعدة قرار سريعة

```text
هل هذه الشاشة تكمّل نفس resource ownership؟
  نعم → extend existing feature
  لا → create a new feature with explicit boundary

هل الفرق فقط في UI composition؟
  نعم → لا تنشئ feature جديدة

هل الفرق في public/discovery/profile responsibility؟
  نعم → feature مستقلة مسموحة
```

---

## 3. Layer 1: API Functions

### 3a. Client-side API (httpClient) — للـ mutations والـ auth endpoints

```typescript
// src/features/<feature>/api/<feature>.api.ts
import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { SomeSuccessResponse, SomeUpdateRequest } from "../types/<feature>.types";

/**
 * JSDoc بسيط يصف الـ endpoint
 */
export async function getMyResource() {
  const response = await httpClient.get<ApiPayload<SomeSuccessResponse>>("/resource/me");
  return extractData(response.data);
}

export async function updateMyResource(data: SomeUpdateRequest) {
  const response = await httpClient.patch<ApiPayload<SomeSuccessResponse>>("/resource/me", data);
  return extractData(response.data);
}
```

**متى تستخدم `httpClient`:**
- كل المتحولات (mutations: POST/PATCH/PUT/DELETE)
- Endpoints تحتاج access token
- الاستخدام دائماً في Client Components أو `hooks/`
- **لا تستخدمه داخل Server Components** — سيكسر لأن `httpClient` يستدعي `js-cookie`

---

### 3b. SSR-safe API (serverGet) — للـ Server Components و SSR pages

```typescript
// src/features/<feature>/api/<feature>-ssr.api.ts
import { serverGet } from "@/lib/api/server-http-client";
import type { SomeListResponse, SomeDetailResponse } from "../types/<feature>.types";

/**
 * WHY THIS FILE: httpClient imports js-cookie (browser-only).
 * Server Components use serverGet (native Axios, no browser deps).
 * Locale passed explicitly from page params.
 */

export async function fetchPublicResourceList(
  locale: string,
  params?: { search?: string; page?: number; limit?: number }
): Promise<SomeListResponse> {
  return serverGet<SomeListResponse>("/public/resource", { locale, params });
}

export async function fetchPublicResourceBySlug(
  slug: string,
  locale: string,
): Promise<SomeDetailResponse | null> {
  try {
    return await serverGet<SomeDetailResponse>(`/public/resource/${slug}`, { locale });
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}
```

**متى تستخدم `serverGet`:**
- Public endpoints (لا تحتاج access token)
- أي fetch في Server Component أو `page.tsx`
- ISR cache: أضف `next: { revalidate: N }` لو Backend يدعمه
- **لا تستخدمه لـ mutations**

---

## 3c. Contract Verification Before UI

قبل بناء أي UI فوق endpoint جديد أو موجود:

- **endpoint confirmation:** تأكد من المسار الفعلي كما هو مستخدم في المشروع الآن
  - أمثلة حالية:
    - `GET /api/v1/public/practitioners`
    - `GET /api/v1/public/practitioners/:slug`
    - public specialties endpoints
- **payload verification:** راجع backend DTO/controller/docs قبل كتابة types. لا تعتمد على تخمين اسم field.
- **nullable field handling:** أي field nullable في الـ backend يُكتب `| null` صراحة في الـ types ويُعالَج في UI.
- **public identifier verification:** تأكد هل الصفحة تعتمد على `slug` أم `id`.
  - public pages تستخدم slug أو public identifier فقط
  - internal ids لا تُستخدم في canonical public routes إلا إذا العقد نفسه يفرض ذلك
- **empty / not found / failure states:** لازم تكون محددة قبل UI implementation:
  - Empty list
  - Empty filters result
  - 404 detail page
  - Recoverable fetch failure
  - Non-recoverable backend failure

### قواعد إلزامية

```text
لا تبدأ UI قبل أن تعرف:
  1. ما هو endpoint المؤكد؟
  2. ما هو shape الحقيقي للـ response؟
  3. ما هي الـ nullable fields؟
  4. هل identifier = slug أم internal id؟
  5. ما هو expected behavior في empty / 404 / error؟
```

---

## 3d. Mandatory Contract-First Start Gate (Before Any Backend-Driven Slice)

Before implementation starts, the owner must complete a short **Contract Audit Snapshot** for the slice.

Required fields:

- backend endpoints that actually exist (method + path)
- request shape actually accepted by backend
- response shape actually returned by backend
- statuses/actions/transitions actually supported
- machine-readable backend error fields/codes currently available
- blocked vs ready decision
- explicit honest frontend boundary (what is intentionally out of scope now)

Start gate rule:

```text
No backend-driven UI implementation starts before this snapshot is complete.
If one required field is unknown, the slice stays in contract-discovery mode.
```

Where to keep it:

- Add it in the implementation summary / execution notes for the slice.
- Keep it short and concrete (no process essay, no speculative product language).

---

## 4. Layer 2: Types

```typescript
// src/features/<feature>/types/<feature>.types.ts

/**
 * <Feature> feature contracts — mapped to backend DTO shape.
 * Keep types explicit. No inferred types from API responses.
 */

export interface MyResource {
  id: string;
  slug: string;
  nameAr: string | null;
  nameEn: string | null;
  // ... كل الـ fields من الـ backend contract
  createdAt: string;
  updatedAt: string;
}

// Response envelopes
export interface MyResourceSuccessResponse {
  message: string;
  resource: MyResource;
}

export interface MyResourceListResponse {
  items: MyResource[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Request DTOs
export interface UpdateMyResourceRequest {
  nameAr?: string;
  nameEn?: string;
  // ... optional fields فقط
}
```

**قواعد الـ Types:**
- Types تعكس backend contract مباشرة
- nullable fields → `string | null` وليس `string | undefined`
- Dates دائماً `string` (ISO format من الـ backend)
- لا `any` لا `unknown` إلا لو ضروري جداً

---

## 5. Layer 3: Query Keys

```typescript
// src/features/<feature>/constants/query-keys.ts

/**
 * Stable query keys for <feature> endpoints.
 */
export const <feature>QueryKeys = {
  all: ["<feature>"] as const,
  lists: () => [...<feature>QueryKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    [...<feature>QueryKeys.lists(), params] as const,
  details: () => [...<feature>QueryKeys.all, "detail"] as const,
  detail: (slugOrId: string) => [...<feature>QueryKeys.details(), slugOrId] as const,
  me: () => [...<feature>QueryKeys.all, "me"] as const,
};
```

**قواعد Query Keys:**
- `all` دائماً `["featureName"] as const`
- كل sub-key تبنى فوق `all` لتسهيل invalidation
- استخدم `.all` لـ broad invalidation (بعد mutation)
- استخدم `.detail(slug)` لـ specific invalidation

---

## 6. Layer 4: React Query Hooks

```typescript
// src/features/<feature>/hooks/use-<feature>.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyResource, updateMyResource } from "../api/<feature>.api";
import { <feature>QueryKeys } from "../constants/query-keys";

/**
 * Query hook for current resource.
 * enabled param allows conditional fetching (e.g. user not yet loaded).
 */
export function useMyResource(enabled = true) {
  return useQuery({
    queryKey: <feature>QueryKeys.me(),
    queryFn: getMyResource,
    enabled,
    staleTime: 60_000,       // 1 minute — adjust per data volatility
    gcTime: 10 * 60_000,     // 10 minutes
  });
}

/**
 * Mutation hook for updating resource.
 * Invalidates related caches so UI stays consistent.
 */
export function useUpdateMyResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyResource,
    onSuccess: () => {
      // Invalidate this feature's cache
      queryClient.invalidateQueries({ queryKey: <feature>QueryKeys.all });
      // Invalidate related features if needed (e.g. displayName affects users/auth)
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
```

**قواعد staleTime:**
| نوع البيانات | staleTime |
|---|---|
| User profile / settings | `60_000` (1 min) |
| Security / sensitive | `30_000` (30 sec) |
| Public catalog (specialties, etc.) | `300_000` (5 min) |
| Real-time (sessions, presence) | `0` |

---

## 7. Layer 5: Barrel Export

```typescript
// src/features/<feature>/index.ts
export * from "./api/<feature>.api";
export * from "./hooks/use-<feature>";
export * from "./types/<feature>.types";
export * from "./constants/query-keys";
// لا تعمل export للـ SSR api هنا — تُستخدم مباشرة في page.tsx
```

---

## 8. Layer 6: Page (SSR-first)

```typescript
// src/app/[locale]/(area)/<route>/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { fetchPublicResourceList } from "@/features/<feature>/api/<feature>-ssr.api";
import ResourcePageHero from "@/features/<feature>/components/ResourcePageHero";
import ResourceGrid from "@/features/<feature>/components/ResourceGrid";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

// SSR metadata — locale-aware
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "سويّة | ..." : "Sawiyaa | ...",
    description: isAr ? "..." : "...",
  };
}

export default async function ResourcePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { search = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  // Translations server-side
  const t = await getTranslations("<namespace>");

  // Data fetch — SSR via serverGet (no browser deps)
  const data = await fetchPublicResourceList(locale, {
    search: search || undefined,
    page: currentPage,
    limit: 12,
  });

  return (
    <>
      <ResourcePageHero totalCount={data.pagination.totalItems} />
      <ResourceGrid items={data.items} />
    </>
  );
}
```

### Public SEO Rules

- **`generateMetadata` required** لأي public page قابلة للفهرسة.
- metadata يجب أن تكون locale-aware وتعكس نفس الـ entity أو listing المعروض.
- لو الـ backend data غير متاحة وقت metadata:
  - استخدم fallback title/description واضحة بدل ترك metadata generic جدًا.
- detail pages المبنية على slug:
  - لو الـ entity غير موجودة → `notFound()`
  - لا ترجع صفحة فارغة مع status 200
- استخدم canonical-safe routing:
  - public routes يجب أن تعتمد identifier واحد واضح
  - لو فيه slug canonical وlegacy path، اعمل redirect للcanonical path
- **ممنوع client-first fetching** للصفحات العامة indexable:
  - listing pages العامة
  - detail pages العامة
  - أي صفحة نريد منها SEO أو social previews

### قاعدة SEO السريعة

```text
Public + indexable?
  نعم → SSR data + generateMetadata + notFound handling
  لا → يمكن التفكير في client fetch إذا فيه سبب واضح
```

### للـ authenticated pages (patient/practitioner area):

```typescript
// src/app/[locale]/(patient)/patient/<route>/page.tsx
// الـ page نفسها SSR لكن البيانات الـ user-specific تُجلب client-side بـ hooks

import { setRequestLocale } from "next-intl/server";
import ProfileForm from "@/features/patients/components/ProfileForm";
// لا تستدعي getPatientProfile() هنا مباشرة — سيحتاج access token
// بدلاً منه اترك الـ Client Component يستدعي usePatientProfile()

export default async function PatientProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // SSR: جلب فقط البيانات العامة التي لا تحتاج auth
  // مثل: translations, specialty labels, config
  const t = await getTranslations("patient-profile");

  return <ProfileForm />;
  // ProfileForm هو "use client" ويستخدم usePatientProfile() داخله
}
```

- client-side auth hooks هي الـ default pattern للبيانات user-specific.
- server-side auth-aware bootstrap مسموح فقط لو فيه سبب معماري واضح ومكتوب، وليس كبديل افتراضي للنمط الحالي.

---

## 9. قواعد تحديد Server vs Client Component

```
هل الـ component يحتاج إحدى هذه؟
  ✓ onClick / onChange / event handlers
  ✓ useState / useReducer
  ✓ useEffect / lifecycle
  ✓ React Query hooks (useQuery / useMutation)
  ✓ useRouter / usePathname / useSearchParams
  ✓ Browser APIs (localStorage, window, etc.)

→ "use client"

وإلا:
→ Server Component (الافتراضي — لا تكتب "use client")
```

---

## 9b. Search Params & Filters Rules

- في public listing pages يكون الـ URL هو source of truth للفلاتر والـ pagination حيثما كان ذلك مناسبًا.
- طبعًا لا تمرر search params الخام مباشرة إلى backend.
  - اعمل normalization أولًا
  - ثم safe defaults
- أي param غير صالح يجب أن يعود لـ fallback واضح بدل كسر الصفحة.

### قواعد عملية

- `page`:
  - parse integer
  - minimum = 1
  - invalid → fallback to `1`
- `limit`:
  - استخدم default ثابت من الصفحة/feature
  - invalid أو خارج الحد → fallback للقيمة الافتراضية
- `sort`:
  - لازم يكون من allowlist معروفة
  - invalid → fallback للdefault sort
- `slug/search/q`:
  - trim
  - empty string → `undefined`

### قاعدة التنفيذ

```text
searchParams → normalize → validate → fallback → pass to SSR/api layer
```

### ممنوع

- ممنوع استخدام state داخلي كـ source of truth الوحيد لفلاتر public discovery إذا كان المطلوب deep-linkable.
- ممنوع إرسال params غير normalized إلى SSR API.

---

## 10. قواعد الترجمات (i18n)

### في Server Components:
```typescript
import { getTranslations } from "next-intl/server";
const t = await getTranslations("<namespace>");
```

### في Client Components:
```typescript
import { useTranslations } from "next-intl";
const t = useTranslations("<namespace>");
```

### ملفات الترجمة:
```
messages/ar/<namespace>.json
messages/en/<namespace>.json
```

### تسجيل namespace جديد:
```typescript
// src/i18n/request.ts — أضف الـ namespace للـ messages object
```

### تسمية الـ namespaces:
| Area | Namespace |
|------|-----------|
| Patient area | `patient-profile`, `patient-settings`, ... |
| Practitioner area | `practitioner-onboarding`, `practitioner-dashboard`, ... |
| Shared | `common`, `errors`, `navigation` |
| Public pages | `home`, `practitioners-listing`, `specialties-public`, ... |

---

## 11. قواعد Component Naming و Location

| نوع الـ component | مكانه |
|---|---|
| Generic UI (Button, Modal, Badge, etc.) | `src/components/ui/` |
| Cross-area shared (Loading, ErrorState, etc.) | `src/components/shared/` |
| Public page specific | `src/features/<name>/components/` أو `src/components/public/` |
| Patient area specific | `src/features/<name>/components/` |
| Practitioner area specific | `src/features/<name>/components/` |
| Admin area specific | `src/features/admin/components/` |

---

## 12. قواعد الـ Error Handling

```typescript
// في SSR pages — notFound() للـ 404
const data = await fetchResourceBySlug(slug, locale);
if (!data) notFound();

// في SSR pages — try/catch للـ best-effort sections
let related = [];
try {
  const relatedData = await fetchRelated(locale);
  related = relatedData.items;
} catch {
  // fail silently — not critical
}

// في Client Components — React Query error state
const { data, error, isLoading } = useMyResource();
if (error) return <ErrorState message={error.message} />;
```

---

## 12b. Debt / Blocker Annotation Rules

في implementation summary أو handoff notes استخدم الوسوم التالية فقط عندما تكون مستحقة فعلاً:

- **`BLOCKER`**
  - استخدمها عندما يكون التنفيذ متوقفًا بسبب شيء خارجي أو ناقص يمنع الإكمال الصحيح
  - أمثلة:
    - endpoint غير موجود
    - contract غير مؤكد
    - backend يرجع shape مختلف عن المتوقع
- **`DEBT`**
  - استخدمها عندما يوجد حل يعمل الآن لكن يحتاج تحسين لاحق معروف وغير مانع
  - أمثلة:
    - fallback مؤقت
    - duplicated mapping صغيرة لحين refactor
    - metadata baseline تحتاج enrichment لاحقًا
- **`FOLLOW-UP`**
  - استخدمها لخطوة لاحقة مقصودة لكنها ليست نقصًا أو مشكلة حالية
  - أمثلة:
    - إضافة pagination UI لاحقًا
    - إضافة filters جديدة بعد تفعيل backend params

### قواعد الاستخدام

- لا تستخدم `BLOCKER` لو الصفحة تعمل ويمكن شحنها.
- لا تستخدم `DEBT` لو المسألة مجرد فكرة تحسين عامة بدون أثر معماري واضح.
- لا تستخدم `FOLLOW-UP` كبديل لإخفاء bug أو contract mismatch.

---

## 13. Checklist قبل كل شاشة جديدة

قبل ما تبدأ تكتب أي شاشة جديدة:

**[ ] Contract-First Start Gate (mandatory)**
- [ ] Endpoints verified (method + path + ownership)
- [ ] Request/response shapes verified from real backend contract
- [ ] Supported statuses/actions/transitions verified
- [ ] Machine-readable error fields/codes verified
- [ ] Blocked vs ready decision recorded
- [ ] Honest frontend boundary recorded before implementation

**[ ] استكشاف الـ Backend**
- [ ] ما هي الـ endpoints المطلوبة؟ (`GET`, `PATCH`, `POST`)
- [ ] هل الـ endpoints موجودة في الـ feature API file؟
- [ ] هل في hooks موجودة لهذه الـ endpoints؟
- [ ] هل تم تأكيد الـ contract الفعلي من backend docs/controller/DTO؟
- [ ] هل nullable fields معروفة؟
- [ ] هل public identifier = slug أم id؟

**[ ] تجهيز الـ Feature Layer**
- [ ] Types معرّفة في `types/*.types.ts`
- [ ] Query keys محددة في `constants/query-keys.ts`
- [ ] API function موجودة في `api/*.api.ts`
- [ ] لو SSR مطلوب: `api/*-ssr.api.ts` موجود
- [ ] Hook موجود في `hooks/use-*.ts`
- [ ] Barrel export في `index.ts` محدّث

**[ ] تجهيز الـ Page**
- [ ] `page.tsx` هو Server Component
- [ ] `generateMetadata` locale-aware
- [ ] لو public page: metadata فيها fallback واضح
- [ ] `setRequestLocale(locale)` موجود
- [ ] كل نص يمر من translations
- [ ] `searchParams` normalized قبل الاستخدام
- [ ] `notFound()` موجود للـ detail pages عند اللزوم

**[ ] UI Standards**
- [ ] Dark mode `dark:` variants
- [ ] RTL logical CSS (`start-`, `end-`, `rtl:`)
- [ ] Loading states معالَجة
- [ ] Empty states معالَجة
- [ ] Error states معالَجة
- [ ] 404 handling بـ `notFound()`

---

## 14. المسارات الموجودة والـ APIs المتاحة

### Public (no auth)
| Endpoint | Feature | Hook/SSR Function |
|----------|---------|-------------------|
| `GET /api/v1/public/practitioners` | `practitioners-discovery` | `fetchPublicPractitioners()` |
| `GET /api/v1/public/practitioners/:slug` | `practitioner-profile` | `fetchPublicPractitionerBySlug()` |
| public specialties list endpoint | `specialties-public` | `fetchPublicSpecialties()` |
| public specialties detail endpoint | `specialties-public` | `fetchPublicSpecialtyBySlug()` |

### Authenticated — Patient
| Endpoint | Feature | Hook |
|----------|---------|------|
| `GET /patients/me` | `patients` | `usePatientProfile()` |
| `PATCH /patients/me` | `patients` | `useUpdatePatientProfile()` |

### Authenticated — Users (bootstrap)
| Endpoint | Feature | Hook |
|----------|---------|------|
| `GET /users/me` | `users` | `useCurrentUser()` |
| `GET /users/me/roles` | `users` | `useCurrentUserRoles()` |
| `GET /users/me/security-state` | `users` | `useCurrentUserSecurityState()` |

### Auth
| Endpoint | Feature | Hook |
|----------|---------|------|
| `GET /auth/me` | `auth` | `useAuthMe()` |
| `POST /auth/patient/*` | `auth` | `usePatientLogin()`, `usePatientRegister()`, ... |

---

## 15. مثال كامل — إنشاء Patient Profile Feature

```
الطلب: شاشة "الملف الشخصي للعميل" في /patient/profile
```

**Step 1 — التحقق:** `getPatientProfile()` موجود ✓، `usePatientProfile()` موجود ✓

**Step 2 — Types:** `PatientProfile`, `UpdatePatientProfileRequest` موجودة ✓

**Step 3 — Component (Client):**
```typescript
// src/features/patients/components/PatientProfileForm.tsx
"use client";
import { useTranslations } from "next-intl";
import { usePatientProfile, useUpdatePatientProfile } from "@/features/patients";

export default function PatientProfileForm() {
  const t = useTranslations("patient-profile");
  const { data, isLoading } = usePatientProfile();
  const { mutate, isPending } = useUpdatePatientProfile();

  if (isLoading) return <LoadingSkeleton />;
  // ... form JSX
}
```

**Step 4 — Page (Server):**
```typescript
// src/app/[locale]/(patient)/patient/profile/page.tsx
import { setRequestLocale } from "next-intl/server";
import PatientProfileForm from "@/features/patients/components/PatientProfileForm";

export default async function PatientProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PatientProfileForm />;
}
```

**Step 5 — Translations:**
```json
// messages/ar/patient-profile.json
{ "title": "ملفي الشخصي", "save": "حفظ", ... }
// messages/en/patient-profile.json
{ "title": "My Profile", "save": "Save", ... }
```
## Arabic Copy Quality

- Any Arabic text added or edited anywhere in the frontend must be valid, readable Arabic.
- Never leave Arabic text with broken encoding artifacts such as `???`, mojibake, replacement characters, or corrupted mixed symbols.
- Never introduce emoji in Arabic product copy unless the user explicitly asks for them.
- Arabic copy must be:
  - grammatically correct
  - natural for native readers
  - calm and professional
  - aligned with the product tone
- After editing Arabic strings, verify that:
  - the saved file still renders proper Arabic characters
  - no Arabic letters were replaced by question marks because of encoding issues
  - punctuation still reads naturally in RTL

### Arabic Verification Checklist

- [ ] Arabic text appears as real Arabic, not `???`
- [ ] No corrupted encoding artifacts exist in the edited file
- [ ] No unintended emoji were introduced
- [ ] Arabic and English remain meaningfully aligned
