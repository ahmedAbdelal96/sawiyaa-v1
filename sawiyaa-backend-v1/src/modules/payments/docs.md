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
provider confirmation. Configure the typed
`payment.provider.paymob.methodRegistry` database setting with separate enabled
`CARD` entries whose `currencyCodes` are `['EGP']` and `['USD']` respectively.
Provider credentials and integration identifiers remain ENV-owned; the method
registry itself is not read from ENV.

The existing `PaymentProviderResolverService` remains the single provider
selection point. Currency/method routes are configured only by the
payment-gateway-control database value. `PAYMENT_PROVIDER_ROUTES_JSON` is not a
runtime authority and must not be used. The route contract is `{ currencyCode,
paymentMethod, provider, integrationKey, environment, enabled, priority,
source }`. An unavailable route does not fall back to another database row;
equal-priority active routes are reported as `PAYMENT_ROUTING_AMBIGUOUS`.

The Paymob aliases `paymob-egp-card` and `paymob-usd-card` resolve to the
currency-specific integration settings. A payment stores the selected provider
and route snapshot in `metadataJson`; webhook and refund processing continues
to use that persisted payment provider. Session-payment creation uses a
PostgreSQL transaction advisory lock keyed by session id and rechecks active
payments inside the transaction to prevent concurrent duplicate creation.
