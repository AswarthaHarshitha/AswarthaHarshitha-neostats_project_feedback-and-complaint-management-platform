# NeoConnect

NeoConnect is a staff feedback and complaint management platform built as a full-stack app for the use case requirements.

## Tech Stack

- Frontend: Next.js (TypeScript), React, Tailwind CSS, shadcn-style UI components
- Backend: Node.js, Express.js, MongoDB (Mongoose)
- Auth: JWT with role-based API access

## Features Implemented

- Staff complaint/feedback submission with:
  - Category, department, location, severity fields
  - Anonymous toggle
  - Photo/PDF upload
  - Unique tracking ID format: `NEO-YYYY-001`
- Case lifecycle management:
  - New, Assigned, In Progress, Pending, Resolved, Escalated
  - Secretariat assignment to Case Manager
  - Case Manager status updates and notes
  - Automatic 7 working-day escalation if no response from Case Manager
- Public hub:
  - Quarterly digest (resolved case summaries)
  - Impact tracking table (raised → action → changed)
  - Searchable minutes archive with PDF uploads
- Polling system:
  - Secretariat creates polls
  - Staff can vote once per poll
  - Results shown immediately in UI
- Analytics dashboard (Secretariat/Admin):
  - Open cases by department chart
  - Case counts by status, category, and department
  - Hotspot flagging when 5+ open cases share department + category
- User roles:
  - `staff`
  - `secretariat`
  - `case_manager`
  - `admin`

## Project Structure

- `frontend/` Next.js app
- `backend/` Express API
- `.env.example` shared required environment variables

## Local Setup

### 1) Configure environment

Copy `.env.example` values into actual env files:

- For backend: create `backend/.env`
- For frontend: create `frontend/.env.local`

Use the same variable names and values as needed.

### 2) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3) Start MongoDB

Run a local MongoDB instance (or provide a MongoDB Atlas URI in `MONGODB_URI`).

### 4) Seed users

```bash
cd backend
npm run seed
```

Seeded login accounts (password for all: `password123`):

- staff@neo.com
- secretariat@neo.com
- manager@neo.com
- admin@neo.com

### 5) Run backend

```bash
cd backend
npm run dev
```

### 6) Run frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Key Backend Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/cases` (staff)
- `GET /api/cases` (role-scoped)
- `PATCH /api/cases/:id/assign` (secretariat)
- `PATCH /api/cases/:id/status` (secretariat/case_manager)
- `POST /api/polls` (secretariat)
- `POST /api/polls/:id/vote` (staff)
- `GET /api/analytics/dashboard` (secretariat/admin)
- `GET /api/public/digest`
- `GET /api/public/impact`
- `GET /api/public/minutes`
- `POST /api/public/minutes` (secretariat)

## Notes

- JWT is required for all protected routes.
- Tokens are stored in localStorage so user sessions persist across refresh.
- Uploaded files are served from backend `uploads/`.
