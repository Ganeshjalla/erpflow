# ERPFlow API Documentation

Base URL: `http://localhost:4000/api`

All responses follow one of these envelopes:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": true, "message": "...", "data": [], "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 } }
{ "success": false, "message": "...", "errors": [] }
```

Authenticated routes require `Authorization: Bearer <token>`.

---

## Health

### `GET /health`
- **Auth:** none
- **Response 200:** `{ "success": true, "message": "ERPFlow API is running" }`

---

## Auth

### `POST /auth/login`
- **Auth:** none
- **Body:** `{ "email": string, "password": string }`
- **Response 200:** `{ token, user: { id, name, email, role } }`
- **Response 401:** invalid credentials

### `GET /auth/me`
- **Auth:** any authenticated user
- **Response 200:** current user profile

---

## Customers

### `GET /customers`
- **Auth:** ADMIN, SALES, ACCOUNTS
- **Query:** `page, limit, search, status (LEAD|ACTIVE|INACTIVE), customerType (RETAIL|WHOLESALE|DISTRIBUTOR)`
- **Response 200:** paginated customer list

### `POST /customers`
- **Auth:** ADMIN, SALES
- **Body:** `{ customerName, mobileNumber, businessName, address, customerType, email?, gstNumber?, status?, followUpDate?, notes? }`
- **Response 201:** created customer
- **Response 400:** validation error

### `GET /customers/:id`
- **Auth:** ADMIN, SALES, ACCOUNTS
- **Response 200:** customer + `followUps[]` + `recentChallans[]`
- **Response 404:** not found

### `PUT /customers/:id`
- **Auth:** ADMIN, SALES
- **Body:** any subset of the create fields
- **Response 200:** updated customer

### `DELETE /customers/:id`
- **Auth:** ADMIN
- **Effect:** soft delete (sets `isDeleted=true`, `status=INACTIVE`)
- **Response 200:** null

### `POST /customers/:id/follow-ups`
- **Auth:** ADMIN, SALES
- **Body:** `{ "note": string, "followUpDate": "YYYY-MM-DD" }`
- **Response 201:** created follow-up

### `GET /customers/:id/follow-ups`
- **Auth:** ADMIN, SALES, ACCOUNTS
- **Response 200:** follow-up list, newest first

---

## Products

### `GET /products`
- **Auth:** any authenticated user
- **Query:** `page, limit, search, category, lowStock=true`
- **Response 200:** paginated products, each with a computed `stockStatus`: `IN_STOCK | LOW_STOCK | OUT_OF_STOCK`

### `POST /products`
- **Auth:** ADMIN, WAREHOUSE
- **Body:** `{ productName, sku, category, unitPrice, warehouseLocation, currentStock?, minimumStock? }`
- **Response 201:** created product
- **Response 409:** SKU already exists

### `GET /products/:id`
- **Auth:** any authenticated user
- **Response 200:** product detail

### `PUT /products/:id`
- **Auth:** ADMIN, WAREHOUSE
- **Response 200:** updated product
- **Response 409:** SKU conflict with another product

### `DELETE /products/:id`
- **Auth:** ADMIN
- **Effect:** soft delete

---

## Inventory

### `GET /inventory`
- **Auth:** any authenticated user
- **Response 200:** every product with `currentStock`, `minimumStock`, `warehouseLocation`, `stockStatus`

### `POST /inventory/movement`
- **Auth:** ADMIN, WAREHOUSE
- **Body:** `{ "productId": uuid, "quantity": number > 0, "movementType": "IN"|"OUT", "reason": string }`
- **Behavior:** runs inside a DB transaction; row-locks the product; `OUT` is rejected with **400** if it would take stock below zero; always creates a `StockMovement` record; `createdBy` comes from the JWT, never the request body.
- **Response 201:** `{ movement, product }`
- **Response 400:** `Insufficient stock for product <SKU>. Available: X, Requested: Y`

### `GET /inventory/movements`
- **Auth:** any authenticated user
- **Query:** `page, limit, productId, movementType`
- **Response 200:** paginated movement history, newest first

---

## Sales Challans

### `GET /challans`
- **Auth:** any authenticated user
- **Query:** `page, limit, status (DRAFT|CONFIRMED|CANCELLED), search (matches challan number)`
- **Response 200:** paginated challan list

### `POST /challans`
- **Auth:** ADMIN, SALES
- **Body:**
  ```json
  {
    "customerId": "uuid",
    "items": [{ "productId": "uuid", "quantity": 5 }],
    "status": "DRAFT"   // optional; omit or "DRAFT" saves a draft, "CONFIRMED" creates-and-confirms in one call
  }
  ```
- **Behavior:** generates a unique `CH-<year>-NNNNNN` challan number atomically; snapshots `productName`, `sku`, `unitPrice` onto each line item at creation time; a `DRAFT` challan never touches stock.
- **Response 201:** created challan with items
- **Response 400:** empty items array, invalid product/customer, or (if `status: "CONFIRMED"`) insufficient stock — in which case *nothing* is persisted, not even the draft.

### `GET /challans/:id`
- **Auth:** any authenticated user
- **Response 200:** challan detail including customer, items (with snapshots), createdBy, status, totals

### `PUT /challans/:id`
- **Auth:** ADMIN, SALES
- **Behavior:** only `DRAFT` challans can be edited; replaces items and recomputes totals inside a transaction
- **Response 400:** if the challan is not `DRAFT`

### `PATCH /challans/:id/confirm`
- **Auth:** ADMIN, SALES
- **Behavior:** the critical atomic operation — see `docs/ARCHITECTURE.md` for the full transaction flow. Validates stock for **every** item before mutating **any** of them; on any shortfall the entire transaction rolls back and nothing changes.
- **Response 200:** confirmed challan
- **Response 400:**
  - `Challan is already confirmed`
  - `Cancelled challan cannot be confirmed`
  - `Insufficient stock for product <SKU>. Available: X, Requested: Y`

### `PATCH /challans/:id/cancel`
- **Auth:** ADMIN, SALES
- **Behavior:** only `DRAFT` challans can be cancelled in this version (confirmed challans are not reversible here — documented limitation, see README)
- **Response 400:** if already cancelled or already confirmed

---

## Users (Admin)

### `GET /users`
- **Auth:** ADMIN
- **Response 200:** all users (id, name, email, role, isActive, createdAt) — password hashes never returned

### `POST /users`
- **Auth:** ADMIN
- **Body:** `{ name, email, password (min 6 chars), role }`
- **Response 201:** created user
- **Response 409:** email already exists

### `PATCH /users/:id/active`
- **Auth:** ADMIN
- **Body:** `{ "isActive": boolean }`
- **Response 200:** updated user

---

## Dashboard

### `GET /dashboard`
- **Auth:** any authenticated user
- **Response 200:**
  ```json
  {
    "customers": { "total": 12, "active": 8, "leads": 3 },
    "products": { "total": 15, "lowStock": 1, "outOfStock": 1 },
    "challans": { "total": 6, "draft": 2, "confirmed": 3, "cancelled": 1 },
    "totalStockQuantity": 412,
    "recentChallans": [...],
    "recentStockMovements": [...],
    "upcomingFollowUps": [...]
  }
  ```

---

## Standard HTTP status codes used throughout

| Code | Meaning |
|---|---|
| 200 | success |
| 201 | created |
| 400 | validation error / business rule violation |
| 401 | missing/invalid/expired JWT |
| 403 | authenticated but role not permitted |
| 404 | resource not found |
| 409 | duplicate (email, SKU, challan number) |
| 500 | unexpected server error (stack trace hidden in production) |
