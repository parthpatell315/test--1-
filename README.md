# Trrabb

Internal Operating System and Platform for Trrabb.

## Workspace Structure

```
Trrabb
│
├── frontend/      → Public Website (Next.js 16 + React 19)
├── admin/         → Admin Portal ERP (Vite + React 19 + TypeScript)
└── backend/       → Shared API (Node.js + Express + Prisma ORM + PostgreSQL)
```

## Running Locally

- **Backend API**: `cd backend && npm run dev` (Port 3001)
- **Admin Portal**: `cd admin && npm run dev` (Port 8080 / 5173)
- **Public Website**: `cd frontend && npm run dev` (Port 3000)