# Fayed Frontend Architecture

## Purpose

This repository is a clean web frontend base for the Fayed platform. It is not a demo storefront or a generic dashboard sample.

## Product context

The platform roadmap covers:

- Public website
- Patient web experience
- Practitioner dashboard
- Admin dashboard

## Current scope of this codebase

The active frontend base currently keeps the reusable foundation needed to grow those surfaces:

- Shared layout system
- Public shell
- Auth shell
- Patient shell
- Practitioner shell
- Admin shell
- i18n baseline
- Theme and state stores
- API client foundation
- Reusable UI primitives

## Area baseline navigation

- Public: home shell only
- Patient: dashboard, sessions, articles, reviews, settings
- Practitioner: dashboard, sessions, patients, articles, reviews, settings
- Admin: dashboard, payments, articles, chat, reviews, training, settings, admin / operations
- Super admin: isolated platform shell

## Implementation principle

The frontend should stay modular and phase-based, matching the roadmap in `../docs`. Business pages should be added gradually on top of the clean shell rather than reintroducing template demo content.
