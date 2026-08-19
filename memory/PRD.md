# Career Connect — PRD

## Original Problem
Build "Career Connect", a modern job portal (originally requested in PHP/MySQL; delivered as an Expo React Native + FastAPI + MongoDB mobile app per user confirmation). Three roles: Job Seeker, Employer, Admin. Email+password auth, uploads via Emergent Object Storage, seeded demo data, professional UI.

## Architecture
- Frontend: Expo Router (file-based), role-based tab groups: (seeker), (employer), (admin). Shared routes: job/[id], notifications, auth/*.
- Backend: FastAPI, JWT (bcrypt) auth, all routes under /api. MongoDB (motor).
- Storage: Emergent Object Storage for photo/resume/logo; files served via /api/files/{path} (token-gated).
- Design: Royal blue (#2540C0) + navy + gold accent (#F0A028), matches user-supplied reference screenshots.

## Personas
- Job Seeker: searches/applies to jobs, tracks status, saves jobs.
- Employer: posts jobs, reviews applicants, updates their status.
- Admin: oversees platform, manages users/jobs/categories.

## Core Requirements (static)
- Role-selected register/login.
- Job search with filters (keyword, category, job type, experience level, location).
- Apply with cover letter + resume; 5-stage status tracking.
- Save/bookmark jobs; notifications on application events.
- Employer job CRUD + applicant management.
- Admin dashboard stats, user activate/deactivate/approve, job toggle, category management.

## Implemented (2026-06)
- [x] Auth: register/login/me/update, JWT, RBAC (403 enforced) — verified via curl.
- [x] Landing (blue hero, gold accent, search, stat counters, category grid, featured jobs, CTA).
- [x] Seeker: home dashboard, search+filters, applications tracking, saved jobs, profile with photo/resume upload.
- [x] Employer: dashboard, post job, my jobs (close/delete), applicant Kanban with status updates + resume view.
- [x] Admin: stats overview, manage users, manage jobs (toggle), manage categories.
- [x] Job details + apply modal, notifications screen.
- [x] Seed: 8 categories, 8 jobs, 3 employers, 2 seekers, 1 admin.
- [x] Verified end-to-end: post→apply→view applicants→status update→seeker notification→close→delete.

## Backlog / Next
- P1: Contact & About page (FAQ + form).
- P1: Edit existing job (reuse post form).
- P2: Featured/urgent job badge from employer, richer skill tags field.
- P2: In-app resume preview instead of external open on web.

## Test Credentials
See /app/memory/test_credentials.md
