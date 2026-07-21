# Money presentation contract

This contract is shared behavior documentation for the separate Web and Mobile
applications. It is not a runtime dependency and does not select pricing.

## Input

Clients may format only an atomic backend or persisted-snapshot value:

```ts
type Money = { amount: string; currencyCode: "EGP" | "USD" };
```

Missing or invalid money is unavailable; it is never free and never defaults
to a currency. Product pricing selection remains solely on the backend.

## Required output vectors

| locale | money | text |
| --- | --- | --- |
| en | USD 20.00 | `$20 USD` |
| en | USD 20.50 | `$20.50 USD` |
| en | EGP 500.00 | `EGP 500` |
| en | EGP 500.50 | `EGP 500.50` |
| ar | USD 20.00 | `20 دولار أمريكي` |
| ar | USD 20.50 | `20.50 دولار أمريكي` |
| ar | EGP 500.00 | `500 جنيه مصري` |
| ar | EGP 500.50 | `500.50 جنيه مصري` |

Both clients must use these vectors in their central-money tests. They must
not output `$US`, `SUS`, `USD$`, `US$`, `NaN`, `undefined`, or a currency
fallback.
