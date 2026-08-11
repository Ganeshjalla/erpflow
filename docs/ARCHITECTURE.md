# ERPFlow — Architecture

## High-level flow

```
React frontend (Vite, TS)
        │  Axios (JWT attached via interceptor)
        ▼
Express REST API  (helmet, cors, morgan, json body parsing)
        │
        ▼
Route layer        — maps HTTP verb+path to a controller, applies
                      authenticateJWT + authorizeRoles(...) middleware
        │
        ▼
Controller layer    — thin: parses/validates request (Zod), calls a
                      service function, shapes the response envelope.
                      Contains no business logic.
        │
        ▼
Service layer        — all business logic and DB transactions live
                      here (customerService, productService,
                      inventoryService, challanService, dashboardService,
                      authService, userService)
        │
        ▼
Drizzle ORM (node-postgres driver)
        │
        ▼
PostgreSQL
```

Each layer only calls the layer directly below it. Routes never touch Drizzle directly; controllers never write raw SQL; services never format HTTP responses.

## Authentication

1. `POST /api/auth/login` verifies the email/password (bcrypt compare against `passwordHash`) and, on success, signs a JWT with `{ userId, role, email }` using `JWT_SECRET` / `JWT_EXPIRES_IN`.
2. The frontend stores the token in `localStorage` and an Axios request interceptor (`src/services/api.ts`) attaches `Authorization: Bearer <token>` to every call.
3. `authenticateJWT` middleware verifies the token on the backend and populates `req.user`; any failure (missing header, expired/invalid token) returns `401` before the request reaches a controller.
4. An Axios response interceptor watches for `401` responses anywhere in the app, clears the stored session, and redirects to `/login` — this is what makes "expired token → logged out automatically" work without every page having to handle it.

## Role authorization

`authorizeRoles("ADMIN", "SALES")` is a small middleware factory used per-route (see `src/routes/*.ts`). It checks `req.user.role` (set by `authenticateJWT`, which always runs first) against the allowed list and returns `403` if the role isn't permitted. This is enforced identically for every module — customers, products, inventory, challans, users.

The frontend mirrors these rules with `<ProtectedRoute roles={[...]}>` (redirects to `/dashboard` if the logged-in user's role isn't allowed) purely for UX — **the backend check is the actual security boundary**, since a determined user could always call the API directly.

## The challan confirmation transaction

This is the single most important piece of business logic in the system, so it gets its own section.

```
PATCH /challans/:id/confirm
        │
        ▼
BEGIN TRANSACTION
        │
        ├─ SELECT challan FOR UPDATE
        │     → 404 if missing
        │     → 400 if status is already CONFIRMED or CANCELLED
        │
        ├─ SELECT all challan items
        │
        ├─ For EVERY item (validation pass — nothing written yet):
        │     SELECT product FOR UPDATE
        │     if product.currentStock < item.quantity:
        │         THROW → transaction rolls back automatically,
        │                  zero rows changed, HTTP 400 returned
        │
        ├─ Only if every single item passed validation
        │  (mutation pass):
        │     for each item:
        │         UPDATE product SET currentStock -= quantity
        │         INSERT stock_movement (type=OUT, reason="Sales challan CH-... confirmed")
        │
        ├─ UPDATE challan SET status=CONFIRMED, confirmedAt=now()
        │
        ▼
COMMIT
```

Because the validation pass happens for *every* item before any mutation happens for *any* item, a challan with 5 items where only the 5th is short on stock still results in **zero** stock changes for items 1–4 — the whole thing is all-or-nothing. This is verified by an automated test (`src/__tests__/business-logic.test.ts`) that creates a challan requesting an enormous quantity, confirms the 400 response, and asserts the product's `currentStock` is byte-for-byte unchanged afterward.

`SELECT ... FOR UPDATE` row-locks are used on both the challan row and every referenced product row so concurrent confirm attempts (or a concurrent manual stock movement) can't race past each other and produce negative stock.

Draft challans intentionally never touch `stock_movements` or `products` at all — only `confirm` does.

## Inventory consistency

The same pattern (transaction + row lock + validate-then-mutate) is used for manual stock movements (`POST /inventory/movement`): an `OUT` movement that would drop `currentStock` below zero is rejected with a descriptive 400 and no partial write occurs. Every movement — whether from a manual adjustment or a challan confirmation — creates a `StockMovement` audit row, so `GET /inventory/movements` is a complete, queryable history of every stock change and who made it.

## Data model notes

- **Snapshots, not just foreign keys.** `SalesChallanItem` stores `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot` at the moment the challan line is created. If a product's price changes next week, last week's challans still display what the customer was actually charged.
- **Soft delete.** `customers.isDeleted` and `products.isDeleted` are booleans, never a hard `DELETE`. This means old challans and stock movements always resolve their foreign keys to a real row, even for a product or customer that's since been retired.
- **Atomic challan numbering.** `challan_sequences` has one row per year with a `counter` column; `generateChallanNumber()` row-locks that row inside the same transaction as the challan insert, so two simultaneous challan creations can never collide on the same number.

## Why Drizzle instead of Prisma

The assignment brief specifies Prisma. This build environment's network egress allowlist covers package registries (npm, PyPI, GitHub, apt mirrors) but not `binaries.prisma.sh`, which is where Prisma's CLI fetches its native query-engine/schema-engine binaries from on every `generate`/`migrate` call — every attempt returned `403 host_not_allowed`. Drizzle ORM ships as pure TypeScript with no native binary step, targets the same PostgreSQL instance, and provides the same relational schema definition, generated SQL migrations, and `db.transaction()` API used throughout this codebase. The relational model (tables, enums, indexes, foreign keys) is unchanged from the original Prisma design in the brief — only the client library differs.
