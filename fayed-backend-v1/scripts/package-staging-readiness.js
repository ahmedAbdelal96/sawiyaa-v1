"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const client_1 = require("@prisma/client");
function parseArgs(argv) {
    const result = { envFile: null };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--env-file') {
            result.envFile = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg.startsWith('--env-file=')) {
            result.envFile = arg.slice('--env-file='.length);
        }
    }
    return result;
}
function loadEnvFile(filePath) {
    const resolvedPath = node_path_1.default.resolve(filePath);
    const content = node_fs_1.default.readFileSync(resolvedPath, 'utf8');
    const parsed = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
        const eqIndex = normalized.indexOf('=');
        if (eqIndex === -1)
            continue;
        const key = normalized.slice(0, eqIndex).trim();
        let value = normalized.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        parsed[key] = value;
    }
    return { resolvedPath, parsed };
}
function isLocalhostDatabaseUrl(value) {
    if (!value)
        return true;
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return (host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '::1' ||
            host === '[::1]' ||
            host.startsWith('127.'));
    }
    catch {
        return true;
    }
}
function getEnv(env, key) {
    const value = env[key];
    return typeof value === 'string' ? value.trim() : '';
}
function addCheck(results, label, ok, details = '') {
    results.push({ label, ok, details });
}
function printChecklist(results) {
    for (const entry of results) {
        const prefix = entry.ok ? '[OK] ' : '[FAIL] ';
        const suffix = entry.details ? ` - ${entry.details}` : '';
        console.log(`${prefix}${entry.label}${suffix}`);
    }
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const env = { ...process.env };
    if (args.envFile) {
        const { resolvedPath, parsed } = loadEnvFile(args.envFile);
        Object.assign(env, parsed);
        console.log(`[INFO] Loaded env file: ${resolvedPath}`);
    }
    const results = [];
    const paymentChecks = [];
    const appEnv = getEnv(env, 'APP_ENV');
    const databaseUrl = getEnv(env, 'DATABASE_URL');
    const appUrl = getEnv(env, 'APP_URL');
    const appBaseUrl = getEnv(env, 'APP_BASE_URL');
    const paymentSuccessUrl = getEnv(env, 'PAYMENT_SUCCESS_URL');
    const paymentFailedUrl = getEnv(env, 'PAYMENT_FAILED_URL');
    const paymentPendingUrl = getEnv(env, 'PAYMENT_PENDING_URL');
    const stripeEnabled = getEnv(env, 'PAYMENT_STRIPE_ENABLED') === 'true';
    const paymobEnabled = getEnv(env, 'PAYMENT_PAYMOB_ENABLED') === 'true';
    let fatalError = null;
    if (appEnv !== 'staging') {
        fatalError = `APP_ENV must be staging, got ${appEnv || '(missing)'}`;
    }
    else if (!databaseUrl) {
        fatalError = 'DATABASE_URL is required';
    }
    else if (isLocalhostDatabaseUrl(databaseUrl)) {
        fatalError = 'DATABASE_URL must point to staging, not localhost';
    }
    else if (!appUrl ||
        !appBaseUrl ||
        !paymentSuccessUrl ||
        !paymentFailedUrl ||
        !paymentPendingUrl) {
        fatalError = 'Required staging app URLs are missing';
    }
    else if (!stripeEnabled && !paymobEnabled) {
        fatalError =
            'At least one payment provider must be enabled for package staging verification';
    }
    if (fatalError) {
        console.log(`[FAIL] Environment preflight - ${fatalError}`);
        process.exitCode = 1;
        return;
    }
    addCheck(results, 'APP_ENV is staging', true, appEnv);
    addCheck(results, 'DATABASE_URL is not localhost', true, 'staging host detected');
    addCheck(results, 'APP_URL present', true, appUrl);
    addCheck(results, 'APP_BASE_URL present', true, appBaseUrl);
    addCheck(results, 'Payment redirect URLs present', true, 'success / failed / pending set');
    addCheck(results, 'At least one payment provider enabled', true, stripeEnabled ? 'Stripe enabled' : 'Paymob enabled');
    if (stripeEnabled) {
        const stripeMode = getEnv(env, 'STRIPE_MODE');
        const stripeSecretKey = getEnv(env, 'STRIPE_SECRET_KEY');
        const stripeWebhookSecret = getEnv(env, 'STRIPE_WEBHOOK_SECRET');
        const stripeApiBaseUrl = getEnv(env, 'STRIPE_API_BASE_URL');
        addCheck(paymentChecks, 'Stripe sandbox mode is test', stripeMode === 'test', stripeMode || '(missing)');
        addCheck(paymentChecks, 'Stripe secret key present', Boolean(stripeSecretKey));
        addCheck(paymentChecks, 'Stripe webhook secret present', Boolean(stripeWebhookSecret));
        addCheck(paymentChecks, 'Stripe API base URL present', Boolean(stripeApiBaseUrl));
    }
    if (paymobEnabled) {
        const paymobMode = getEnv(env, 'PAYMOB_MODE');
        const paymobBaseUrl = getEnv(env, 'PAYMOB_BASE_URL');
        const paymobApiKey = getEnv(env, 'PAYMOB_API_KEY');
        const paymobHmacSecret = getEnv(env, 'PAYMOB_HMAC_SECRET');
        const paymobCardIntegration = getEnv(env, 'PAYMOB_INTEGRATION_ID_CARD');
        const paymobIntegrationId = getEnv(env, 'PAYMOB_INTEGRATION_ID');
        const paymobCheckoutFlow = getEnv(env, 'PAYMOB_CHECKOUT_FLOW') || 'legacy';
        const paymobIframeId = getEnv(env, 'PAYMOB_IFRAME_ID');
        const paymobPublicKey = getEnv(env, 'PAYMOB_PUBLIC_KEY');
        const paymobCheckoutBaseUrl = getEnv(env, 'PAYMOB_CHECKOUT_BASE_URL');
        const paymobIntentionBaseUrl = getEnv(env, 'PAYMOB_INTENTION_BASE_URL');
        addCheck(paymentChecks, 'Paymob sandbox mode is test', paymobMode === 'test', paymobMode || '(missing)');
        addCheck(paymentChecks, 'Paymob base URL present', Boolean(paymobBaseUrl));
        addCheck(paymentChecks, 'Paymob API key present', Boolean(paymobApiKey));
        addCheck(paymentChecks, 'Paymob HMAC secret present', Boolean(paymobHmacSecret));
        addCheck(paymentChecks, 'Paymob has at least one card integration id', Boolean(paymobCardIntegration || paymobIntegrationId));
        if (paymobCheckoutFlow === 'legacy') {
            addCheck(paymentChecks, 'Paymob iframe ID present for legacy checkout', Boolean(paymobIframeId));
        }
        else {
            addCheck(paymentChecks, 'Paymob public key present for intention checkout', Boolean(paymobPublicKey));
            addCheck(paymentChecks, 'Paymob checkout base URL present for intention checkout', Boolean(paymobCheckoutBaseUrl));
            addCheck(paymentChecks, 'Paymob intention base URL present for intention checkout', Boolean(paymobIntentionBaseUrl));
        }
    }
    const prisma = new client_1.PrismaClient();
    let dbReadSucceeded = false;
    try {
        const planRows = await prisma.packagePlan.findMany({
            orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
            select: {
                code: true,
                sessionCount: true,
                discountPercent: true,
                isActive: true,
            },
        });
        const expectedPlans = [
            { code: 'SESSIONS_4', sessionCount: 4, discountPercent: '10' },
            { code: 'SESSIONS_6', sessionCount: 6, discountPercent: '15' },
            { code: 'SESSIONS_8', sessionCount: 8, discountPercent: '20' },
        ];
        const planSummary = expectedPlans.map((expected) => {
            const found = planRows.find((row) => row.code === expected.code);
            const ok = Boolean(found) &&
                found?.sessionCount === expected.sessionCount &&
                found?.discountPercent?.toString?.() === expected.discountPercent;
            return `${expected.code}:${ok ? 'ok' : 'missing/mismatch'}`;
        });
        addCheck(results, 'PackagePlan rows exist for all three standardized tiers', planSummary.every((item) => item.endsWith('ok')), planSummary.join(', '));
        const configRows = await prisma.configKeyCatalog.findMany({
            where: { key: { in: ['packages.enabled', 'packages.purchaseEnabled'] } },
            select: {
                key: true,
                values: {
                    where: { scopeType: 'GLOBAL', isActive: true },
                    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                    select: { valueBoolean: true, priority: true, createdAt: true },
                },
            },
        });
        const configMap = new Map(configRows.map((row) => [row.key, row]));
        const enabledRow = configMap.get('packages.enabled');
        const purchaseRow = configMap.get('packages.purchaseEnabled');
        addCheck(results, 'packages.enabled exists and is true', Boolean(enabledRow?.values?.[0]?.valueBoolean === true), enabledRow ? `rows=${enabledRow.values.length}` : 'missing');
        addCheck(results, 'packages.purchaseEnabled exists and is true', Boolean(purchaseRow?.values?.[0]?.valueBoolean === true), purchaseRow ? `rows=${purchaseRow.values.length}` : 'missing');
        const practitioner = await prisma.practitionerProfile.findFirst({
            where: {
                acceptsPackages: true,
                isPublicProfilePublished: true,
                sessionPrice30Egp: { not: null },
                sessionPrice30Usd: { not: null },
                sessionPrice60Egp: { not: null },
                sessionPrice60Usd: { not: null },
            },
            select: {
                publicSlug: true,
                status: true,
                acceptsPackages: true,
                sessionPrice30Egp: true,
                sessionPrice30Usd: true,
                sessionPrice60Egp: true,
                sessionPrice60Usd: true,
                _count: { select: { availabilitySlots: true } },
            },
        });
        addCheck(results, 'At least one package-eligible practitioner exists', Boolean(practitioner), practitioner
            ? `${practitioner.publicSlug} | availabilitySlots=${practitioner._count.availabilitySlots}`
            : 'missing');
        if (practitioner) {
            addCheck(results, 'Eligible practitioner has availability slots', practitioner._count.availabilitySlots > 0, `${practitioner.publicSlug} availabilitySlots=${practitioner._count.availabilitySlots}`);
        }
        dbReadSucceeded = true;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addCheck(results, 'Database read checks', false, message);
    }
    finally {
        await prisma.$disconnect().catch(() => { });
    }
    printChecklist([...results, ...paymentChecks]);
    const allOk = !fatalError &&
        dbReadSucceeded &&
        results.every((item) => item.ok) &&
        paymentChecks.every((item) => item.ok);
    if (!allOk) {
        console.log('');
        console.log('[FAIL] Staging package readiness checks did not fully pass.');
        process.exitCode = 1;
        return;
    }
    console.log('');
    console.log('[OK] Staging package readiness checks passed.');
    console.log('Read-only checks only. No data was mutated.');
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[FAIL] Unexpected helper error');
    console.error(message);
    process.exitCode = 1;
});
//# sourceMappingURL=package-staging-readiness.js.map