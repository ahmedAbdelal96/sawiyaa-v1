# SDD ledger — plan: D:\Web\full-projects\sawiyaa\docs\superpowers\plans\2026-09-22-pricing-currency-consistency-p1.md

Pre-flight: shared interface — Task 1 proves the quote use-case input; Task 2 consumes it and forwards trusted request country to the existing pricing service. Task 3 consumes the frozen quote/payment contracts. No conflicting interfaces found.

Ruling: preserve the existing participant-country/payment-snapshot policy — the requested fix is propagation of the already-trusted request country to the quote endpoint, not a policy change.

Ruling update: do not change the global participant-country resolver; freeze the trusted booking currency in the Session pricing snapshot so quote/payment cannot silently re-resolve it.

RED proof: selected session currency EGP with patient EG + practitioner SA and request US returned USD before the snapshot-aware service change.

GREEN proof: the same fixture now returns EGP/520.00; scheduled and instant booking tests prove selectedCurrencyCode is persisted; payment test proves gateway receives 12000 minor units and EGP.

Completed: Backend/Web/Mobile targeted verification and closure artifact written.
