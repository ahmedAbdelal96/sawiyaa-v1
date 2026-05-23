# Roles and Permissions

Fayed uses role-based access control with permission checks on both the backend and frontend.

## Primary roles

| Role | Purpose |
| --- | --- |
| Patient | Uses the platform to discover practitioners, book and manage sessions, pay, chat, and track care. |
| Practitioner | Manages profile, availability, sessions, chat, earnings, and practice-related operations. |
| Admin | Operates the platform across users, content, finance, moderation, and support. |
| Super Admin | Has the broadest operational access and can manage sensitive settings and cross-system actions. |
| Support | Helps patients and practitioners with access to selected read-only and support-related tools. |
| Content Reviewer | Reviews articles and other content moderation workflows where applicable. |

## Permission families

The exact permission keys live in code, but the product organizes them into families:

- identity and user management
- patient management
- practitioner management
- sessions and scheduling
- chat and moderation
- payments and wallet
- settlements and accounting
- support and ticket handling
- content and training
- reports and diagnostics
- notifications and system settings

## Access model

- Sensitive pages should be protected by both route guards and backend authorization.
- Admin surfaces should never be available to patient users.
- Read access and action access should be treated separately when possible.
- Chat attachments, moderation actions, and financial tools should have explicit permissions.

## UX rule

If a page is visible but an action is blocked, the interface should explain why in human language.
This is especially important for:

- session chat availability
- cancellation availability
- financial operations
- moderation actions

