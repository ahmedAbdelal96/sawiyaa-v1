# Corporate Sponsorship — Backend Documentation

> **Source of truth:** This folder (`src/modules/corporate-sponsorship/docs/`) contains the authoritative backend documentation for the corporate sponsorship feature. All other documentation locations are derived from here.

## Quick Navigation

| Role | Start Here |
|------|-----------|
| Frontend developer | [frontend-implementation-guide.md](./frontend-implementation-guide.md) |
| Backend engineer | [backend-overview.md](./backend-overview.md) |
| Security-sensitive work | [security-notes.md](./security-notes.md) |
| State/transition reference | [state-machine.md](./state-machine.md) |
| API details | [api-reference.md](./api-reference.md) |
| Deferred work tracking | [known-deferred-work.md](./known-deferred-work.md) |

## Module Structure

```
corporate-sponsorship/
├── controllers/       # Admin + Patient API endpoints
├── docs/              # This folder — documentation
├── dto/               # Request/response DTOs
├── repositories/     # Data access layer
├── services/          # Business logic services
└── use-cases/        # Application use cases
```

## Key Constraints

- **No codeHash/benefitCode/codeId/codePrefix/codeLast4 in payment metadata**
- **Consume triggered by sponsorshipId only — no code identifier needed**
- **Ledger writes use same transaction client as consume**
- **CSV plain-text codes only available once — at generate response time**
- **INTERNAL_WALLET provider used automatically for zero-amount sponsored sessions**
- **Both EGP and USD sessions supported — currency follows session**
- **Arabic and English translations required for all patient-facing text**

## Security Reminder

Before any UI work, frontend team must read and follow:
- `docs/DESIGN.md` (Fayed Clinical Warmth design system)
- All security rules in [security-notes.md](./security-notes.md)