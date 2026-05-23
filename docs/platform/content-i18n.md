# Content and i18n

Fayed is bilingual. English and Arabic must both be treated as first-class product languages.

## Core rules

- Do not surface raw translation keys to users.
- Keep namespaces organized by feature.
- Keep patient-facing copy supportive and short.
- Avoid technical language in user-facing error states whenever possible.
- Make sure RTL and LTR both read naturally.

## Translation structure

Feature-level namespaces are the preferred pattern.
Examples:

- `payments`
- `sessions`
- `help`
- `refund-policies`

## Writing guidance

- Use labels that match the task.
- Avoid sentence duplication across cards and sections.
- Keep status labels human-friendly.
- Keep financial copy short and direct.
- Use consistent terminology across pages.

## Quality checks

- No mojibake in source files.
- No mixed-language UI fragments unless the feature deliberately displays proper nouns or brand names.
- No route leakage in error or unavailable states.
- No fallback that changes the meaning of a payment or session state.

