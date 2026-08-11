import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app";

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let customerId: string;
let productId: string;

describe("Health check", () => {
  it("GET /api/health returns success", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("Authentication", () => {
  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@erpflow.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("logs in valid users and returns a JWT", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@erpflow.com", password: "Admin@123" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe("ADMIN");
    adminToken = res.body.data.token;
  });

  it("rejects unauthenticated requests to protected routes", async () => {
    const res = await request(app).get("/api/customers");
    expect(res.status).toBe(401);
  });
});

describe("Role authorization", () => {
  beforeAll(async () => {
    const sales = await request(app)
      .post("/api/auth/login")
      .send({ email: "sales@erpflow.com", password: "Sales@123" });
    salesToken = sales.body.data.token;

    const warehouse = await request(app)
      .post("/api/auth/login")
      .send({ email: "warehouse@erpflow.com", password: "Warehouse@123" });
    warehouseToken = warehouse.body.data.token;
  });

  it("blocks WAREHOUSE from creating customers", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({
        customerName: "Test",
        mobileNumber: "111",
        businessName: "Test Biz",
        customerType: "RETAIL",
        address: "Nowhere",
      });
    expect(res.status).toBe(403);
  });
});

describe("Customer CRUD", () => {
  it("creates a customer", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        customerName: "Vitest Customer",
        mobileNumber: "9999900000",
        businessName: "Vitest Biz",
        customerType: "RETAIL",
        address: "Test Address",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    customerId = res.body.data.id;
  });
});

describe("Product CRUD", () => {
  it("creates a product", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        productName: "Vitest Product",
        sku: `VITEST-${Date.now()}`,
        category: "Test",
        unitPrice: 100,
        currentStock: 50,
        minimumStock: 5,
        warehouseLocation: "Test Warehouse",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.currentStock).toBe(50);
    productId = res.body.data.id;
  });
});

describe("Inventory stock movement", () => {
  it("increases stock on IN movement", async () => {
    const res = await request(app)
      .post("/api/inventory/movement")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ productId, quantity: 20, movementType: "IN", reason: "Test restock" });
    expect(res.status).toBe(201);
    expect(res.body.data.product.currentStock).toBe(70);
  });

  it("decreases stock on OUT movement", async () => {
    const res = await request(app)
      .post("/api/inventory/movement")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ productId, quantity: 10, movementType: "OUT", reason: "Test dispatch" });
    expect(res.status).toBe(201);
    expect(res.body.data.product.currentStock).toBe(60);
  });

  it("rejects OUT movement that would make stock negative", async () => {
    const res = await request(app)
      .post("/api/inventory/movement")
      .set("Authorization", `Bearer ${warehouseToken}`)
      .send({ productId, quantity: 999999, movementType: "OUT", reason: "Too much" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);
  });
});

describe("Sales Challan business logic", () => {
  let draftChallanId: string;

  it("creates a DRAFT challan without touching stock", async () => {
    const before = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const stockBefore = before.body.data.currentStock;

    const res = await request(app)
      .post("/api/challans")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId, quantity: 5 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.challanNumber).toMatch(/^CH-\d{4}-\d{6}$/);
    draftChallanId = res.body.data.id;

    const after = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(after.body.data.currentStock).toBe(stockBefore);
  });

  it("confirms the challan and reduces stock atomically", async () => {
    const res = await request(app)
      .patch(`/api/challans/${draftChallanId}/confirm`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CONFIRMED");

    const product = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(product.body.data.currentStock).toBe(55); // 60 - 5
  });

  it("does not allow confirming an already-confirmed challan", async () => {
    const res = await request(app)
      .patch(`/api/challans/${draftChallanId}/confirm`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(res.status).toBe(400);
  });

  it("does not allow editing a confirmed challan", async () => {
    const res = await request(app)
      .put(`/api/challans/${draftChallanId}`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ items: [{ productId, quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it("rolls back entirely when confirming with insufficient stock", async () => {
    const draft = await request(app)
      .post("/api/challans")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({ customerId, items: [{ productId, quantity: 999999 }] });
    expect(draft.status).toBe(201);

    const before = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    const confirm = await request(app)
      .patch(`/api/challans/${draft.body.data.id}/confirm`)
      .set("Authorization", `Bearer ${salesToken}`);
    expect(confirm.status).toBe(400);
    expect(confirm.body.message).toMatch(/Insufficient stock/i);

    const after = await request(app)
      .get(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(after.body.data.currentStock).toBe(before.body.data.currentStock);
  });
});
