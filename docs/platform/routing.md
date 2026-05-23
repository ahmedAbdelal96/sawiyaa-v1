# Routing Map

This document summarizes the main product routes and what they are for.

## Public web

- `/[locale]/` - public home and discovery entry point
- `/[locale]/help` - public help center
- `/[locale]/refund-policies/session` - session refund policy
- `/[locale]/articles` - articles list
- `/[locale]/articles/[slug]` - article detail
- `/[locale]/specialties` - specialties list
- `/[locale]/specialties/[slug]` - specialty detail
- `/[locale]/practitioners` - practitioner directory
- `/[locale]/practitioners/[slug]` - practitioner profile
- `/[locale]/patient/sessions/[id]` - public patient session entry or payment-related session page
- `/[locale]/patient/sessions/[id]/payment-return` - payment return / callback flow

## Patient web

- `/[locale]/patient` - patient dashboard
- `/[locale]/patient/dashboard` - dashboard entry
- `/[locale]/patient/sessions` - sessions list
- `/[locale]/patient/sessions/[id]` - session detail
- `/[locale]/patient/sessions/[id]/chat` - session chat
- `/[locale]/patient/wallet` - wallet
- `/[locale]/patient/payments` - payments history
- `/[locale]/patient/profile` - profile
- `/[locale]/patient/support` - support entry
- `/[locale]/patient/help` - help center
- `/[locale]/patient/care-chat` - care chat hub
- `/[locale]/patient/care-chat/[id]` - care chat detail
- `/[locale]/patient/assessments` - assessments list
- `/[locale]/patient/assessments/[slug]` - assessment detail
- `/[locale]/patient/training` - training list
- `/[locale]/patient/package-purchases` - package purchases

## Practitioner web

- `/[locale]/practitioner/dashboard`
- `/[locale]/practitioner/profile`
- `/[locale]/practitioner/availability`
- `/[locale]/practitioner/sessions`
- `/[locale]/practitioner/sessions/[id]`
- `/[locale]/practitioner/sessions/[id]/chat`
- `/[locale]/practitioner/wallet`
- `/[locale]/practitioner/ledger`
- `/[locale]/practitioner/promo-codes`
- `/[locale]/practitioner/support`
- `/[locale]/practitioner/help`

## Admin web

- `/[locale]/admin/dashboard`
- `/[locale]/admin/users`
- `/[locale]/admin/patients`
- `/[locale]/admin/practitioners`
- `/[locale]/admin/sessions`
- `/[locale]/admin/chat`
- `/[locale]/admin/chat-conversations`
- `/[locale]/admin/payments`
- `/[locale]/admin/settlements`
- `/[locale]/admin/refund-policies`
- `/[locale]/admin/support`
- `/[locale]/admin/reports`
- `/[locale]/admin/articles`
- `/[locale]/admin/training`
- `/[locale]/admin/notifications`
- `/[locale]/admin/settings`

## Route groups

The app uses Next.js route groups to keep the UX consistent by audience:

- `(public)`
- `(patient)`
- `(practitioner)`
- `(admin)`
- `(auth)`

These groups are a layout and organization tool. They should not change the meaning of the URL from the user perspective.

