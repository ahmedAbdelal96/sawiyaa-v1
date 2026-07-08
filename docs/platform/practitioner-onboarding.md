# Practitioner Onboarding

This document covers practitioner self-application and admin direct-create behavior.

## Two active flows

### Practitioner self-application

- The practitioner applies for themselves.
- The practitioner uploads documents.
- Uploaded documents stay pending review.
- There is no automatic approval.
- Admin reviews, approves, rejects, or requests changes.

### Admin direct-create

- Admin or onboarding staff creates a practitioner manually.
- Admin can upload documents during the flow.
- The final direct-create submit currently creates an approved, active practitioner package.
- Public visibility is still controlled separately by publication and profile readiness rules.

## Step-up policy

- Step-up should protect final trust-changing actions only.
- Admin direct-create credential upload keeps authentication, roles, permissions, audit logging, and file validation.
- The upload endpoint does not require step-up.
- The final direct-create submit does require step-up.
- Approve, activate, and publish actions also keep step-up.
- Reject and request-changes flows are unchanged unless a later decision changes them.

## Upload and edit rules

- Admin raw fields must stay raw.
- Forms must map Arabic input to `nameAr`.
- Forms must map English input to `nameEn`.
- Do not populate both locale fields from a display helper.
- Do not silently copy Arabic into English during edit mode.

## Security rules

- Permission checks remain in place.
- Audit logging remains in place.
- File validation remains in place.
- Public uploads are not allowed.

## Related docs

- [Security, roles, and permissions](security-roles-and-permissions.md)
- [Production rollout](production-rollout.md)
- [Specialties localization](specialties-localization.md)
