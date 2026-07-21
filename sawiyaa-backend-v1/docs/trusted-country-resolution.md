# Trusted country resolution

Customer pricing uses `resolvePaymentRegionalResolution` as its only country-to-currency authority:

- normalized `EG` resolves to EGP;
- every other value, including unknown, resolves to USD.

`TrustedCountryResolutionMiddleware` resolves the request country once. It accepts Cloudflare country metadata only when both of these are explicitly configured:

```text
TRUSTED_PROXY_MODE=cloudflare
CLOUDFLARE_COUNTRY_HEADER_ENABLED=true
```

Those settings are an operator declaration that the application origin cannot be reached directly and traffic arrives through the approved Cloudflare path. Application code alone cannot prove Cloudflare origin authenticity when direct-origin traffic is allowed.

For a conventional single reverse-proxy hop, use `TRUSTED_PROXY_MODE=single`, and ensure the application origin is reachable only through that proxy. The default is `none`, which uses only the server-observed socket address. `GEOIP_ENABLED=true` additionally requires `GEOIP_DATABASE_PATH` to point to a locally mounted GeoLite2 Country MMDB file. A missing or unreadable database is non-fatal and returns unknown, which safely maps to USD.

`maxmind@5.0.6` loads the MMDB into an in-memory reader and exposes no reader
`close` or `dispose` method. The service initializes it once during Nest module
startup, does not open files per request, and releases its reference during
application shutdown; this is the cleanup supported by the library API.

The resolver never logs full client IPs, never reads client country or currency fields, and never chooses product amounts.
