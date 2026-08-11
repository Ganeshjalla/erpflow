# ERPFlow — Mini ERP + CRM Operations Portal

A full-stack internal operations portal for a wholesale/distribution company: customer CRM, product & inventory management, and a sales challan workflow with atomic stock control — built as a Full Stack Developer case study.

---

## Overview

ERPFlow lets a wholesale company's internal teams (Admin, Sales, Warehouse, Accounts) manage customers, products, stock levels, and sales challans from one dashboard. The core business rule the whole system is built around: **confirming a sales challan must atomically deduct stock, never allow stock to go negative, and never partially apply a failed transaction.**

## Features

- JWT authentication with 4 roles (Admin, Sales, Warehouse, Accounts) and backend-enforced RBAC on every route
- Customer CRM: search/filter/paginate, profile view, CRM follow-up timeline
- Product catalog with SKU uniqueness, category/low-stock filtering
- Inventory: stock IN/OUT movements with full audit history, atomic stock updates, negative-stock protection
- Sales Challans: multi-item draft/confirm/cancel workflow, automatic challan numbering (`CH-2026-000001`), **immutable product snapshots** (challans keep showing the price/name at time of sale even if the product changes later), fully atomic confirm transaction with rollback on insufficient stock
- Dashboard with live aggregates and charts
- Centralized error handling, consistent API response envelope, Zod validation on every write endpoint
- Responsive React admin UI with loading/empty/error states and toast notifications
- Automated tests covering the business-critical paths (auth, RBAC, stock movement, challan confirm/rollback)

## Architecture

```
React (Vite/TS) → REST API (Express) → Controllers → Services → Drizzle ORM → PostgreSQL
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full breakdown, including the challan confirmation transaction diagram.

## Technology Stack

**Backend:** Node.js, TypeScript, Express.js, PostgreSQL, **Drizzle ORM**, JWT, bcrypt, Zod, dotenv, CORS, Helmet, Morgan, Vitest + Supertest

**Frontend:** React 19, TypeScript, Vite, React Router, Axios, Tailwind CSS v4, React Hook Form patterns, Recharts, lucide-react

> **A note on the ORM choice.** The assignment specifies Prisma. This build environment's outbound network is restricted to package registries (npm, PyPI, GitHub, apt) — it does **not** allow `binaries.prisma.sh`, the CDN Prisma's CLI downloads its query/schema-engine binaries from. Every `prisma generate` / `prisma migrate` call failed with a `403 host_not_allowed`. Rather than ship a project that can't actually run, the ORM was swapped for **Drizzle ORM**, which is pure TypeScript with no native binary downloads, targets the same PostgreSQL database, and supports the same relational modeling, migrations, and transactions Prisma would have provided. The data model, indexes, and relationships are unchanged from the original Prisma design — only the ORM library differs. In a normal environment with unrestricted network access, swapping back to Prisma would be a mechanical schema translation.

## Project Structure

```
erpflow/
├── backend/
│   ├── src/
│   │   ├── config/        # env loading
│   │   ├── controllers/    # HTTP layer — thin, calls services
│   │   ├── services/       # business logic, DB transactions
│   │   ├── routes/         # Express routers + RBAC wiring
│   │   ├── middleware/     # authenticateJWT, authorizeRoles, error handler
│   │   ├── validators/     # Zod schemas
│   │   ├── utils/          # ApiError, apiResponse helpers, auth helpers
│   │   ├── db/              # Drizzle schema, client, seed script
│   │   ├── __tests__/       # Vitest + Supertest business logic tests
│   │   └── app.ts
│   ├── drizzle/              # generated SQL migrations
│   ├── drizzle.config.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Badge, Modal, PaginationBar, forms, states
│   │   ├── layouts/         # AppLayout (sidebar + header)
│   │   ├── pages/           # one file per route
│   │   ├── services/        # Axios API clients
│   │   ├── context/         # AuthContext, ToastContext
│   │   ├── routes/          # ProtectedRoute (role-based)
│   │   ├── types/
│   │   └── App.tsx
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── ERPFlow.postman_collection.json
└── README.md   (this file)
```

## Database Design

8 tables: `users`, `customers`, `follow_ups`, `products`, `stock_movements`, `sales_challans`, `sales_challan_items`, `challan_sequences` (backs the atomic `CH-YYYY-NNNNNN` numbering).

Key relationships:
- `User` 1—* `Customer`, `FollowUp`, `StockMovement`, `SalesChallan` (as creator)
- `Customer` 1—* `FollowUp`, `SalesChallan`
- `Product` 1—* `StockMovement`, `SalesChallanItem`
- `SalesChallan` 1—* `SalesChallanItem`

`SalesChallanItem` stores `productNameSnapshot`, `skuSnapshot`, and `unitPriceSnapshot` at creation time — challans never change their displayed values even if the underlying product is edited later. Customers and products use **soft delete** (`isDeleted`) so historical challans/movements always resolve.

## Authentication

`POST /api/auth/login` returns a JWT containing `userId`, `role`, `email`. The frontend stores it in `localStorage` and attaches it via an Axios request interceptor; a response interceptor clears the session and redirects to `/login` on any `401`.

## Role Permissions

| Action | Admin | Sales | Warehouse | Accounts |
|---|---|---|---|---|
| View dashboard | ✅ | ✅ | — | ✅ |
| Manage users | ✅ | — | — | — |
| View / create / edit customers | ✅ | ✅ | — | View only |
| Manage products | ✅ | View only | ✅ | View only |
| Record stock movements | ✅ | — | ✅ | — |
| Create / confirm / cancel challans | ✅ | ✅ | View only | View only |

Enforced server-side via `authorizeRoles(...)` middleware on every route — the frontend also hides/redirects, but the backend is the real boundary.

## Business Logic

**Challan confirmation** (`PATCH /api/challans/:id/confirm`) runs inside a single DB transaction:
1. Row-lock the challan and reject if it isn't `DRAFT`.
2. Row-lock every referenced product and check `currentStock >= quantity` for **every** line item first.
3. If any item is short, throw — the whole transaction rolls back, nothing is written.
4. Only once all items pass validation: deduct stock, insert an `OUT` `StockMovement` per item, flip the challan to `CONFIRMED`, commit.

Draft challans never touch stock. Confirmed challans can't be edited or re-confirmed. See `backend/src/services/challanService.ts`.

## API Documentation

Full endpoint reference: [`docs/API.md`](docs/API.md).

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally (or a hosted instance)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
npm run prisma:generate   # (no-op placeholder script name kept for familiarity — see below)
```

> This project uses Drizzle, not Prisma — see the note above. Use the Drizzle commands instead:

```bash
npx drizzle-kit generate   # generate SQL migration from schema.ts (only needed if you edit the schema)
npx drizzle-kit migrate    # apply migrations to your database
npm run seed                # populate demo users, customers, products, challans
npm run build                # compile TypeScript
npm start                    # run the compiled server (or `npm run dev` for hot-reload)
```

The API listens on `http://localhost:4000` by default. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm run dev
```

Visit `http://localhost:5173`.

### 3. Run tests

```bash
cd backend
npx vitest run
```

15 tests cover: health check, login (valid/invalid), unauthenticated access, role authorization, customer/product creation, stock IN/OUT, insufficient-stock rejection, draft challan creation (no stock change), challan confirm (stock deducted), double-confirm rejection, edit-after-confirm rejection, and full transaction rollback on insufficient stock at confirm time.

## Environment Variables

**Backend (`.env`)**
```
PORT=4000
DATABASE_URL="postgresql://user:password@host:5432/erpflow?schema=public"
JWT_SECRET="a-long-random-secret"
JWT_EXPIRES_IN="8h"
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
```

**Frontend (`.env`)**
```
VITE_API_URL=http://localhost:4000/api
```

## Database Migration

Migrations live in `backend/drizzle/`, generated by `drizzle-kit generate` from `src/db/schema.ts` and applied with `drizzle-kit migrate`. This is the direct equivalent of `prisma migrate dev` / `prisma migrate deploy`.

## Seed Data

`npm run seed` (runs `src/db/seed.ts`) creates:
- 4 users (one per role, credentials below)
- 12 customers across all statuses/types
- 15 products across 6 categories, with realistic stock levels (including one LOW_STOCK and one OUT_OF_STOCK for a realistic dashboard)
- Initial stock-IN movements for every product
- 6 sales challans (2 draft, 3 confirmed, 1 cancelled) with proper snapshots and challan numbers

## Running Backend / Frontend

See **Local Setup** above. In short: `npm run dev` in `backend/` and `frontend/` respectively for hot-reload development, or `npm run build && npm start` / `npm run build && npm run preview` for production-style runs.

## Postman Collection

[`docs/ERPFlow.postman_collection.json`](docs/ERPFlow.postman_collection.json) — import into Postman, set the `baseUrl` variable (defaults to `http://localhost:4000/api`), run **Auth → Login**, and the `token` collection variable is captured automatically for all subsequent requests via a test script.

## Deployment

This was built and fully verified in a local/sandboxed environment. For a real deployment:

- **Frontend:** Vercel or Netlify — set `VITE_API_URL` to your deployed backend URL.
- **Backend:** Render or Railway — set all backend env vars from `.env.example`; the server already reads `process.env.PORT` and never hardcodes `localhost`.
- **Database:** Neon or Supabase Postgres — point `DATABASE_URL` at it and run `npx drizzle-kit migrate` once, then `npm run seed` if you want demo data.
- CORS is driven by `FRONTEND_URL`, so update it to your deployed frontend origin.

No live URLs are included here since this was built and tested in a local sandbox rather than deployed to a public host — see **Known Limitations**.

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@erpflow.com | Admin@123 |
| Sales | sales@erpflow.com | Sales@123 |
| Warehouse | warehouse@erpflow.com | Warehouse@123 |
| Accounts | accounts@erpflow.com | Accounts@123 |

## Known Limitations

- **ORM substitution:** Prisma → Drizzle, forced by this sandbox's network allowlist (see above). Functionally equivalent; not a scope cut.
- **No live deployment:** built and verified locally end-to-end (migrations, seed, API tests, frontend build) rather than deployed to Vercel/Render, since this environment has no outbound access to those platforms either. All deployment configuration is documented and the app is deploy-ready.
- **Confirmed challans cannot be cancelled/reversed.** The spec allows either implementing a reversal or documenting the limitation — this build takes the documented-limitation path: only `DRAFT` challans can be cancelled. A reversal would insert a compensating `IN` stock movement and is a natural next step.
- **Draft challan editing via UI:** the `PUT /api/challans/:id` endpoint fully supports editing draft line items and is tested, but the "Edit Draft" button on the Challan Detail page is currently a placeholder — the Create Challan flow is the primary editing surface in this build.
- **No Docker/CI bonus files** were prioritized in this session in favor of getting core business logic, the full API surface, and the full frontend genuinely working end-to-end — a reasonable trade given the 48-hour framing and the instruction to prioritize correctness of auth, relationships, inventory, and challan transactions over bonus features.
- **Product images / S3 upload, invoice PDF export** (bonus items) — not implemented.

## Future Improvements

- Confirmed-challan cancellation with compensating stock-IN reversal
- Full draft-challan edit UI (line-item add/remove) on the detail page
- Docker Compose + GitHub Actions CI
- PDF challan export
- Refresh tokens / shorter-lived access tokens
- Product image upload

## Screenshots

Not included in this submission — run the app locally (see **Local Setup**) to explore the UI; every page (Dashboard, Customers, Products, Inventory, Challans, Create Challan, Challan Detail, Follow-ups, Users) was manually exercised during development.

## Author

Built as a Full Stack Developer case study submission.
