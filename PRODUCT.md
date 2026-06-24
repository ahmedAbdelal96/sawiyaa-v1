# Product

## Register

product

## Users

Practitioners managing real bookable availability on the web. This is an operations-critical workflow, not a decorative scheduling surface. Practitioners need to quickly understand what patients can book now, what is still a draft, and what is safely published.

## Product Purpose

The availability workflow lets practitioners manage week-by-week schedules backed by the backend as the source of truth. The frontend only displays and edits backend week plans. It must prevent recurring or infinite availability assumptions, keep current week and next week clearly separated, and make it obvious what patients can actually book.

## Brand Personality

Calm, precise, trustworthy.

The tone should feel clinically competent and operationally safe. The interface should reduce anxiety, avoid ambiguity, and help practitioners make the right scheduling decision without guessing.

## Anti-references

- Do not make this feel like a calendar marketing page.
- Do not make it playful, crowded, or dashboard-heavy.
- Do not hide critical state behind icons only.
- Do not use vague copy like "save schedule" without saying whether the week is Draft or Published.
- Do not make Draft and Published look too similar.
- Do not suggest next week is patient-visible when it is still Draft or Not Set.
- Do not expose raw enums, backend codes, route names, or technical errors.

## Design Principles

1. Backend is the source of truth. The frontend reflects backend week plans only.
2. Current week and next week must always be explicit and visually separated.
3. Published state must be protected and unmistakably different from Draft.
4. Copy must explain consequences clearly, especially patient visibility and booked sessions.
5. Empty, loading, saving, success, and error states must all feel safe and actionable.

## Accessibility & Inclusion

Arabic-first with polished RTL support and English parity. High readability on mobile-sized web screens. Clear focus states, explicit button labels, warnings that do not rely on color alone, human-friendly errors, and disabled states that explain why the action is unavailable.
