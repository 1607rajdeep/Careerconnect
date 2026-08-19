# Career Connect — PRD

## Original Problem Statement
Build "Career Connect", a modern job portal. (User requested PHP/MySQL originally; agreed to build on Emergent's supported stack: Expo React Native + FastAPI + MongoDB, keeping all features and the navy/white/teal professional look.)

## Architecture
- **Frontend**: Expo Router (React Native), file-based routing, role-based tab groups: `(seeker)`, `(employer)`, `(admin)`. Auth context in `src/auth.tsx` (JWT stored via SecureStore / localStorage on web). Shared UI kit `src/ui.tsx`, design tokens `src/theme.ts`.
- **Backend**: FastAPI (`/api` prefix), JWT bearer auth (bcrypt hashing), MongoDB (motor). Emergent Object Storage for photo/resume/logo uploads, served via `/api/files/{path}?token=JWT`.
- **DB collections**: users, jobs, applications, saved_jobs, notifications, categories.

## User Personas
1. **Job Seeker** — searches/applies to jobs, tracks status, saves jobs.
2. **Employer** — posts jobs, reviews applicants, updates their status.
3. **Admin** — oversees platform stats, users, jobs, categories.

## Core Requirements (static)
- Email+password auth with role selection (seeker/employer); admin seeded.
- Role-based access control on every protected endpoint.
- Job search with keyword/location/category/type/experience filters.
- Apply flow with optional cover letter; duplicate-apply prevention.
- 5 application statuses: applied, under_review, shortlisted, rejected, hired.
- Notifications on new application (employer) and status change (seeker).
- Admin: stats dashboard, activate/deactivate users, close/reopen jobs, add/delete categories.

## Implemented (2026-06)
- Full auth (register/login/me/update), JWT + bcrypt.
- Landing page: hero, dual search, categories grid, featured jobs, CTA.
- Seeker tabs: Home dashboard, Search+filters, Applications timeline, Saved jobs, Profile (photo + resume upload).
- Employer tabs: Dashboard stats, Post Job, My Jobs (close/delete), Applicants (Kanban chips + status update + resume view), Company profile (logo upload).
- Admin tabs: Overview stats, Users (activate/deactivate + role filter), Jobs (toggle), Categories (add/delete).
- Shared: Job details + apply modal (glass sticky CTA), Notifications.
- Seed data: 8 categories, 8 jobs, admin + 2 seekers + 3 employers.
- **Testing**: 46/46 backend tests pass; frontend role flows verified.

## Backlog / Remaining
- **P1**: Employer edit-job screen (create exists; edit endpoint ready, no dedicated UI), Contact & About page.
- **P2**: Reports collection & admin reports view; pagination UI; recommended-jobs matching.
- **P2**: Push notifications (requires native build).

## Next Tasks
- Add employer "edit job" screen wired to PUT /api/jobs/{id}.
- Add About & Contact pages.
