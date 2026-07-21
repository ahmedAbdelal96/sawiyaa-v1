## paymob

API Key → Settings
HMAC Secret → Settings
Card ID → Developers → Payment Integrations
Iframe ID → Developers → Iframes
Wallet ID → Developers → Payment Integrations → wallet method

### Currency-specific card integrations

The current payment contract routes both supported currencies to Paymob, but
each currency is independently capability-checked:

- `PAYMOB_EGP_CARD_INTEGRATION_ID`: EGP card route.
- `PAYMOB_USD_CARD_INTEGRATION_ID`: USD card route.

`PAYMOB_USD_CARD_INTEGRATION_ID` must be a Paymob integration that is approved
for USD. It must not be copied from the EGP integration without explicit
provider confirmation. Alternatively, configure
`PAYMOB_METHOD_REGISTRY_JSON` with separate enabled `CARD` entries whose
`currencyCodes` are `['EGP']` and `['USD']` respectively; do not configure both
the explicit integration variables and the method registry at the same time.

The existing `PaymentProviderResolverService` remains the single provider
selection point. Currency/method routes are configured by
`PAYMENT_PROVIDER_ROUTES_JSON` or the existing payment-gateway-control
database override. The route contract is `{ currencyCode, paymentMethod,
provider, integrationKey, environment, enabled, priority, source }`. Database
overrides take precedence over environment defaults; an unavailable route does
not fall back to the first database row. Equal-priority active routes are
reported as `PAYMENT_ROUTING_AMBIGUOUS`.

The Paymob aliases `paymob-egp-card` and `paymob-usd-card` resolve to the
currency-specific integration settings. A payment stores the selected provider
and route snapshot in `metadataJson`; webhook and refund processing continues
to use that persisted payment provider. Session-payment creation uses a
PostgreSQL transaction advisory lock keyed by session id and rechecks active
payments inside the transaction to prevent concurrent duplicate creation.
