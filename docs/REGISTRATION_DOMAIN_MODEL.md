# Registration Domain Model (Phase 6D)

SQL: `public.get_registration_domain(text)` returns `EVENT` / `VOUCHER` / `CONSULTATION` / `OTHER`. `site_tour` maps to `EVENT`.

TS: `getRegistrationDomain` in `src/lib/registrationDomain.ts` mirrors SQL. Constants: `REGISTRATION_DOMAINS`, `REGISTRATION_DOMAIN_LABELS`, `LEAD_STATUSES`, `LEAD_PRIORITIES`, `REGISTRATION_STATUSES`, `TASK_STATUSES`, `ACTIVITY_USER_TYPES`.