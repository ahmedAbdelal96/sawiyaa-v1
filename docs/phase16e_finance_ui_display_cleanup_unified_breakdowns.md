# Phase 16E — Finance UI Display Cleanup & Unified Breakdowns

## Executive Summary
Phase 16E cleaned up finance-facing UI language and value rendering across key web and mobile surfaces without changing accounting business logic.

The main outcomes were:
- shared finance formatting was centralized on the web
- mobile finance formatting was made currency-aware and no longer silently defaults currency
- wallet displays were relabeled as projected or ledger-derived where appropriate
- several payment, reconciliation, and dashboard surfaces now use clearer, backend-sourced breakdown wording
- EGP/USD separation is more explicit and safer in the updated views

Backend accounting behavior was not changed.

## Scope Covered
- Admin web
- Practitioner web
- Patient web
- Mobile patient
- Mobile practitioner
- Backend: not changed

## Unified Finance Display Terminology
The UI language was aligned around the following terms:
- Payment / تحصيل
- Gross amount / إجمالي السعر
- Discount / الخصم
- Patient paid / المدفوع من المريض
- Platform commission / عمولة المنصة
- Practitioner earning / مستحقات المعالج
- Practitioner wallet / محفظة المعالج
- Settlement / تسوية
- Payout / تحويل للمعالج
- Refund / استرداد
- Reconciliation / مراجعة الحسابات المالية

The cleanup avoids implying that wallets or settlements are the accounting source of truth.

## Currency Formatting and Separation
### What changed
- Added a shared web finance formatter at `src/lib/finance-format.ts`
- Made currency formatting locale-aware and explicit about missing currency
- Removed silent currency fallback behavior from key web and mobile finance surfaces
- Ensured views do not merge EGP and USD into a single trusted total
- Standardized “currency unavailable” fallback behavior where the backend does not provide currency

### Result
- EGP/USD separation is clearer and safer
- Missing currency is now shown explicitly instead of being silently defaulted
- Shared formatting is now the common path for the main finance screens

## Breakdown Components / Utilities
### Web
- Shared finance formatting helper: `src/lib/finance-format.ts`
- Admin dashboard finance formatting cleanup
- Admin accounting dashboard cleanup
- Admin accounting reconciliation cleanup
- Practitioner dashboard wallet/settlement wording cleanup
- Patient payment history formatting cleanup
- Payment checkout display cleanup
- Admin report money formatting now delegates to the shared helper

### Mobile
- Practitioner finance formatting utility updated to accept nullable currency
- Practitioner wallet and settlement views now show projected/ledger-derived wording
- Practitioner promo-code redemption values now use safe currency fallback behavior

## Admin Web Results
### Improved surfaces
- Admin dashboard
- Admin accounting dashboard
- Admin accounting reconciliation page

### What is clearer now
- settlement currency is no longer silently assumed
- recent payment and operational amounts use the shared money formatter
- reconciliation values now use explicit not-available fallback text where needed
- admin users can more easily distinguish collected amounts, settlement snapshots, and reconciliation data

## Practitioner Web Results
### Improved surfaces
- Practitioner dashboard
- Practitioner promo-code management

### What is clearer now
- wallet is presented as a projected balance, not a bank balance
- helper copy explains that the wallet is derived from recorded accounting entries
- settlement values are currency-aware
- promo-code financial effects are easier to understand in context

## Patient Web Results
### Improved surfaces
- Session payment checkout
- Patient payment history

### What is clearer now
- payment amounts are shown using backend-provided currency data
- checkout breakdowns remain backend-driven
- stale local display helpers were removed from payment history
- the UI does not imply it is computing financial truth itself

## Mobile Patient Results
### Improved surfaces
- Session payment checkout
- Payment return

### What is clearer now
- coupon and payment previews remain backend-driven
- stale coupon state is avoided
- mobile formatting is now currency-aware instead of assuming a currency

## Mobile Practitioner Results
### Improved surfaces
- Practitioner wallet
- Practitioner settlements
- Practitioner finance index
- Practitioner promo-code redemptions

### What is clearer now
- wallet copy now says projected / ledger-derived balance
- settlement and wallet values are formatted with explicit currency handling
- promo-code redemption values are rendered safely with currency fallback

## Translations Added / Updated
### Web
- Finance display strings were aligned in existing UI copy where needed

### Mobile
- Arabic and English finance copy was updated for projected wallet balance, ledger-derived wallet helper text, settlements subtitle, currency unavailable fallback, and practitioner finance summary wording

## Tests Added / Updated
No new finance business-logic tests were required for this phase because accounting behavior was not changed.

The important verification coverage came from:
- frontend `npm run lint`
- frontend `npx tsc --noEmit`
- frontend `npm run build`
- mobile `npm run lint`
- mobile `npx tsc --noEmit`
- mobile `npm test -- --runInBand`

## Manual QA Results
Manual browser/device smoke was not performed in this phase.

This phase relied on:
- code review
- typecheck
- build validation
- lint validation

## Verification Results
### Frontend
- `npm audit --audit-level=moderate` passed
- `npm run lint` passed with existing repo warnings only
- `npx tsc --noEmit` passed
- `npm run build` passed

### Mobile
- `npm audit --audit-level=moderate` passed
- `npm run lint` passed with warnings only
- `npx tsc --noEmit` passed
- `npm test -- --runInBand` passed

### Backend
- Backend was not changed in Phase 16E

## Files Changed
### Frontend
- `fayed-frontend-v1/src/lib/finance-format.ts`
- `fayed-frontend-v1/src/features/admin/components/AdminDashboard.tsx`
- `fayed-frontend-v1/src/features/admin/accounting/components/AdminAccountingDashboardScreen.tsx`
- `fayed-frontend-v1/src/features/admin/accounting/components/AdminAccountingReconciliationScreen.tsx`
- `fayed-frontend-v1/src/features/practitioners/components/PractitionerDashboard.tsx`
- `fayed-frontend-v1/src/features/payments/components/PaySessionPanel.tsx`
- `fayed-frontend-v1/src/features/payments/components/PatientPaymentsHistoryPanel.tsx`
- `fayed-frontend-v1/src/features/admin/reports/utils/report-format.ts`

### Mobile
- `fayed-mobile/src/features/practitioner/finance/utils.ts`
- `fayed-mobile/app/(practitioner)/finance/index.tsx`
- `fayed-mobile/app/(practitioner)/finance/wallet.tsx`
- `fayed-mobile/app/(practitioner)/finance/settlements.tsx`
- `fayed-mobile/src/features/practitioner/promo-codes/components/PractitionerPromoCodesScreen.tsx`
- `fayed-mobile/src/i18n/locales/en.json`
- `fayed-mobile/src/i18n/locales/ar.json`

## Remaining Gaps
- Not every finance screen in the repo was rewritten in this phase
- Some older screens may still use local formatting helpers or older wording
- Manual browser and device smoke was not performed in this phase
- Backend financial behavior remains unchanged, which is correct for this phase, but broader end-to-end display smoke is still valuable

## Final Answers
- Are finance labels and breakdowns more consistent? yes
- Is EGP/USD separation clearer and safer? yes
- Does UI avoid being a financial source of truth? yes
- Are wallets labeled as projections / derived views where appropriate? yes
- Are payment / coupon / settlement breakdowns clearer? yes
- Was backend financial logic changed? no
- Is mobile device-tested? no
- What remains before production? broader visual QA across the remaining finance screens and a browser/device smoke pass on any untouched financial surfaces
