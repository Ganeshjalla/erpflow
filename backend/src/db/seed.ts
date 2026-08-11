import "dotenv/config";
import { db, pool } from "./client";
import {
  users,
  customers,
  followUps,
  products,
  stockMovements,
  salesChallans,
  salesChallanItems,
  challanSequences,
} from "./schema";
import { hashPassword } from "../utils/auth";

async function main() {
  console.log("Seeding ERPFlow database...");

  // Clean slate (order matters due to FKs)
  await db.delete(salesChallanItems);
  await db.delete(salesChallans);
  await db.delete(challanSequences);
  await db.delete(stockMovements);
  await db.delete(followUps);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(users);

  // ---------- Users ----------
  const [admin] = await db
    .insert(users)
    .values({
      name: "Aarav Shah",
      email: "admin@erpflow.com",
      passwordHash: await hashPassword("Admin@123"),
      role: "ADMIN",
    })
    .returning();

  const [sales] = await db
    .insert(users)
    .values({
      name: "Priya Mehta",
      email: "sales@erpflow.com",
      passwordHash: await hashPassword("Sales@123"),
      role: "SALES",
    })
    .returning();

  const [warehouse] = await db
    .insert(users)
    .values({
      name: "Rohit Verma",
      email: "warehouse@erpflow.com",
      passwordHash: await hashPassword("Warehouse@123"),
      role: "WAREHOUSE",
    })
    .returning();

  const [accounts] = await db
    .insert(users)
    .values({
      name: "Kavita Nair",
      email: "accounts@erpflow.com",
      passwordHash: await hashPassword("Accounts@123"),
      role: "ACCOUNTS",
    })
    .returning();

  console.log("Users created.");

  // ---------- Customers ----------
  const customerSeed = [
    { customerName: "Rajesh Traders", mobileNumber: "9876500001", businessName: "Rajesh Traders Pvt Ltd", customerType: "WHOLESALE", status: "ACTIVE", city: "Vadodara" },
    { customerName: "Meera Enterprises", mobileNumber: "9876500002", businessName: "Meera Enterprises", customerType: "DISTRIBUTOR", status: "ACTIVE", city: "Ahmedabad" },
    { customerName: "Suresh Kumar", mobileNumber: "9876500003", businessName: "SK General Store", customerType: "RETAIL", status: "LEAD", city: "Surat" },
    { customerName: "Anita Distributors", mobileNumber: "9876500004", businessName: "Anita Distributors", customerType: "DISTRIBUTOR", status: "ACTIVE", city: "Rajkot" },
    { customerName: "Vikram Traders", mobileNumber: "9876500005", businessName: "Vikram Traders", customerType: "WHOLESALE", status: "INACTIVE", city: "Bhavnagar" },
    { customerName: "Neha Wholesale Mart", mobileNumber: "9876500006", businessName: "Neha Wholesale Mart", customerType: "WHOLESALE", status: "ACTIVE", city: "Vadodara" },
    { customerName: "Deepak Retail Corner", mobileNumber: "9876500007", businessName: "Deepak Retail Corner", customerType: "RETAIL", status: "LEAD", city: "Surat" },
    { customerName: "Global Supply Co", mobileNumber: "9876500008", businessName: "Global Supply Co", customerType: "DISTRIBUTOR", status: "ACTIVE", city: "Ahmedabad" },
    { customerName: "Sunrise Merchants", mobileNumber: "9876500009", businessName: "Sunrise Merchants", customerType: "WHOLESALE", status: "ACTIVE", city: "Vadodara" },
    { customerName: "Om Traders", mobileNumber: "9876500010", businessName: "Om Traders", customerType: "RETAIL", status: "ACTIVE", city: "Rajkot" },
    { customerName: "City Retail Hub", mobileNumber: "9876500011", businessName: "City Retail Hub", customerType: "RETAIL", status: "LEAD", city: "Bhavnagar" },
    { customerName: "Prime Distributors", mobileNumber: "9876500012", businessName: "Prime Distributors", customerType: "DISTRIBUTOR", status: "ACTIVE", city: "Ahmedabad" },
  ] as const;

  const createdCustomers: (typeof customers.$inferSelect)[] = [];
  for (const c of customerSeed) {
    const [row] = await db
      .insert(customers)
      .values({
        customerName: c.customerName,
        mobileNumber: c.mobileNumber,
        email: `${c.customerName.split(" ")[0].toLowerCase()}@example.com`,
        businessName: c.businessName,
        gstNumber: `24ABCDE${Math.floor(1000 + Math.random() * 9000)}Z1`,
        customerType: c.customerType,
        address: `${c.city}, Gujarat, India`,
        status: c.status,
        followUpDate: c.status === "LEAD" ? new Date(Date.now() + 5 * 86400000) : null,
        notes: c.status === "LEAD" ? "Awaiting quotation confirmation." : null,
        createdById: sales.id,
      })
      .returning();
    createdCustomers.push(row);
  }
  console.log(`${createdCustomers.length} customers created.`);

  // ---------- Follow-ups ----------
  for (const c of createdCustomers.slice(0, 6)) {
    await db.insert(followUps).values({
      customerId: c.id,
      note: "Called customer to discuss bulk order pricing.",
      followUpDate: new Date(Date.now() + 3 * 86400000),
      createdById: sales.id,
    });
    await db.insert(followUps).values({
      customerId: c.id,
      note: "Sent product catalog via email.",
      followUpDate: new Date(Date.now() - 2 * 86400000),
      createdById: sales.id,
    });
  }
  console.log("Follow-ups created.");

  // ---------- Products ----------
  const productSeed = [
    { productName: "Basmati Rice 25kg", sku: "GRN-RICE-25", category: "Grains", unitPrice: 1450, minimumStock: 20, warehouseLocation: "Warehouse A - Rack 1" },
    { productName: "Sunflower Oil 15L Tin", sku: "OIL-SUN-15", category: "Edible Oil", unitPrice: 2200, minimumStock: 15, warehouseLocation: "Warehouse A - Rack 2" },
    { productName: "Refined Wheat Flour 50kg", sku: "GRN-FLR-50", category: "Grains", unitPrice: 1650, minimumStock: 25, warehouseLocation: "Warehouse A - Rack 1" },
    { productName: "Toor Dal 30kg", sku: "PLS-TOOR-30", category: "Pulses", unitPrice: 3200, minimumStock: 10, warehouseLocation: "Warehouse A - Rack 3" },
    { productName: "Sugar 50kg Bag", sku: "GRC-SUGR-50", category: "Grocery", unitPrice: 2100, minimumStock: 20, warehouseLocation: "Warehouse B - Rack 1" },
    { productName: "Tea Powder 5kg Pack", sku: "BEV-TEA-05", category: "Beverages", unitPrice: 950, minimumStock: 30, warehouseLocation: "Warehouse B - Rack 2" },
    { productName: "Salt 25kg Bag", sku: "GRC-SALT-25", category: "Grocery", unitPrice: 350, minimumStock: 40, warehouseLocation: "Warehouse B - Rack 1" },
    { productName: "Moong Dal 30kg", sku: "PLS-MOONG-30", category: "Pulses", unitPrice: 3450, minimumStock: 10, warehouseLocation: "Warehouse A - Rack 3" },
    { productName: "Mustard Oil 15L Tin", sku: "OIL-MUS-15", category: "Edible Oil", unitPrice: 2450, minimumStock: 15, warehouseLocation: "Warehouse A - Rack 2" },
    { productName: "Chana Dal 30kg", sku: "PLS-CHANA-30", category: "Pulses", unitPrice: 2950, minimumStock: 10, warehouseLocation: "Warehouse A - Rack 3" },
    { productName: "Besan 25kg", sku: "GRN-BESAN-25", category: "Grains", unitPrice: 1850, minimumStock: 15, warehouseLocation: "Warehouse A - Rack 1" },
    { productName: "Coffee Powder 2kg Pack", sku: "BEV-COFF-02", category: "Beverages", unitPrice: 1200, minimumStock: 20, warehouseLocation: "Warehouse B - Rack 2" },
    { productName: "Cooking Vanaspati 15kg", sku: "OIL-VAN-15", category: "Edible Oil", unitPrice: 1950, minimumStock: 15, warehouseLocation: "Warehouse A - Rack 2" },
    { productName: "Poha 20kg", sku: "GRN-POHA-20", category: "Grains", unitPrice: 1100, minimumStock: 20, warehouseLocation: "Warehouse A - Rack 1" },
    { productName: "Red Chilli Powder 10kg", sku: "SPC-CHILI-10", category: "Spices", unitPrice: 2600, minimumStock: 10, warehouseLocation: "Warehouse B - Rack 3" },
  ];

  const createdProducts: (typeof products.$inferSelect)[] = [];
  for (const p of productSeed) {
    const initialStock = Math.floor(p.minimumStock * (1 + Math.random() * 3));
    const [row] = await db
      .insert(products)
      .values({
        productName: p.productName,
        sku: p.sku,
        category: p.category,
        unitPrice: String(p.unitPrice),
        currentStock: initialStock,
        minimumStock: p.minimumStock,
        warehouseLocation: p.warehouseLocation,
      })
      .returning();
    createdProducts.push(row);

    await db.insert(stockMovements).values({
      productId: row.id,
      quantity: initialStock,
      movementType: "IN",
      reason: "Initial stock load",
      createdById: warehouse.id,
    });
  }

  // Push two products into LOW_STOCK / OUT_OF_STOCK for a realistic dashboard
  await db
    .update(products)
    .set({ currentStock: 3 })
    .where(eqId(createdProducts[3].id));
  await db.insert(stockMovements).values({
    productId: createdProducts[3].id,
    quantity: 12,
    movementType: "OUT",
    reason: "Bulk dispatch to distributor",
    createdById: warehouse.id,
  });

  await db
    .update(products)
    .set({ currentStock: 0 })
    .where(eqId(createdProducts[9].id));
  await db.insert(stockMovements).values({
    productId: createdProducts[9].id,
    quantity: 10,
    movementType: "OUT",
    reason: "Cleared for stock audit",
    createdById: warehouse.id,
  });

  console.log(`${createdProducts.length} products created with stock movements.`);

  // ---------- Sales Challans ----------
  const year = new Date().getFullYear();
  let counter = 0;

  async function nextChallanNumber() {
    counter += 1;
    return `CH-${year}-${String(counter).padStart(6, "0")}`;
  }

  async function createSeedChallan(
    customer: (typeof createdCustomers)[number],
    items: { product: (typeof createdProducts)[number]; quantity: number }[],
    status: "DRAFT" | "CONFIRMED" | "CANCELLED"
  ) {
    const challanNumber = await nextChallanNumber();
    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = items.reduce((s, i) => s + i.quantity * Number(i.product.unitPrice), 0);

    const [challan] = await db
      .insert(salesChallans)
      .values({
        challanNumber,
        customerId: customer.id,
        totalQuantity,
        totalAmount: String(totalAmount),
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
        createdById: sales.id,
      })
      .returning();

    await db.insert(salesChallanItems).values(
      items.map((i) => ({
        challanId: challan.id,
        productId: i.product.id,
        productNameSnapshot: i.product.productName,
        skuSnapshot: i.product.sku,
        unitPriceSnapshot: i.product.unitPrice,
        quantity: i.quantity,
        totalPrice: String(i.quantity * Number(i.product.unitPrice)),
      }))
    );

    if (status === "CONFIRMED") {
      for (const i of items) {
        await db.insert(stockMovements).values({
          productId: i.product.id,
          quantity: i.quantity,
          movementType: "OUT",
          reason: `Sales challan ${challanNumber} confirmed`,
          createdById: sales.id,
        });
      }
    }

    return challan;
  }

  await createSeedChallan(
    createdCustomers[0],
    [
      { product: createdProducts[0], quantity: 5 },
      { product: createdProducts[1], quantity: 3 },
    ],
    "CONFIRMED"
  );
  await createSeedChallan(
    createdCustomers[1],
    [{ product: createdProducts[2], quantity: 8 }],
    "CONFIRMED"
  );
  await createSeedChallan(
    createdCustomers[3],
    [
      { product: createdProducts[4], quantity: 4 },
      { product: createdProducts[5], quantity: 6 },
    ],
    "DRAFT"
  );
  await createSeedChallan(
    createdCustomers[5],
    [{ product: createdProducts[6], quantity: 10 }],
    "CONFIRMED"
  );
  await createSeedChallan(
    createdCustomers[7],
    [{ product: createdProducts[8], quantity: 2 }],
    "DRAFT"
  );
  await createSeedChallan(
    createdCustomers[8],
    [{ product: createdProducts[10], quantity: 5 }],
    "CANCELLED"
  );

  await db.insert(challanSequences).values({ year, counter }).onConflictDoUpdate({
    target: challanSequences.year,
    set: { counter },
  });

  console.log("6 sales challans created (2 draft, 3 confirmed, 1 cancelled).");
  console.log("Seeding complete.");
  console.log("");
  console.log("Demo credentials:");
  console.log(`  ADMIN     -> ${admin.email} / Admin@123`);
  console.log(`  SALES     -> ${sales.email} / Sales@123`);
  console.log(`  WAREHOUSE -> ${warehouse.email} / Warehouse@123`);
  console.log(`  ACCOUNTS  -> ${accounts.email} / Accounts@123`);
}

// small helper because drizzle's eq() import isn't in scope above without clutter
function eqId(id: string) {
  const { eq } = require("drizzle-orm");
  return eq(products.id, id);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
