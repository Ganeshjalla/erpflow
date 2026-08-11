import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ------------------------------
// Enums
// ------------------------------
export const roleEnum = pgEnum("role", ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]);
export const customerTypeEnum = pgEnum("customer_type", ["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export const customerStatusEnum = pgEnum("customer_status", ["LEAD", "ACTIVE", "INACTIVE"]);
export const movementTypeEnum = pgEnum("movement_type", ["IN", "OUT"]);
export const challanStatusEnum = pgEnum("challan_status", ["DRAFT", "CONFIRMED", "CANCELLED"]);

// ------------------------------
// Users
// ------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// ------------------------------
// Customers
// ------------------------------
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  gstNumber: varchar("gst_number", { length: 32 }),
  customerType: customerTypeEnum("customer_type").notNull(),
  address: text("address").notNull(),
  status: customerStatusEnum("status").notNull().default("LEAD"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  nameIdx: index("customers_name_idx").on(t.customerName),
  mobileIdx: index("customers_mobile_idx").on(t.mobileNumber),
  businessIdx: index("customers_business_idx").on(t.businessName),
  statusIdx: index("customers_status_idx").on(t.status),
}));

// ------------------------------
// Follow Ups
// ------------------------------
export const followUps = pgTable("follow_ups", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  note: text("note").notNull(),
  followUpDate: timestamp("follow_up_date").notNull(),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  customerIdx: index("follow_ups_customer_idx").on(t.customerId),
}));

// ------------------------------
// Products
// ------------------------------
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  warehouseLocation: varchar("warehouse_location", { length: 255 }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  skuIdx: uniqueIndex("products_sku_idx").on(t.sku),
  nameIdx: index("products_name_idx").on(t.productName),
  categoryIdx: index("products_category_idx").on(t.category),
}));

// ------------------------------
// Stock Movements
// ------------------------------
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  movementType: movementTypeEnum("movement_type").notNull(),
  reason: text("reason").notNull(),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  productIdx: index("stock_movements_product_idx").on(t.productId),
  typeIdx: index("stock_movements_type_idx").on(t.movementType),
}));

// ------------------------------
// Sales Challans
// ------------------------------
export const salesChallans = pgTable("sales_challans", {
  id: uuid("id").defaultRandom().primaryKey(),
  challanNumber: varchar("challan_number", { length: 32 }).notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  totalQuantity: integer("total_quantity").notNull().default(0),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  status: challanStatusEnum("status").notNull().default("DRAFT"),
  confirmedAt: timestamp("confirmed_at"),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  numberIdx: uniqueIndex("sales_challans_number_idx").on(t.challanNumber),
  statusIdx: index("sales_challans_status_idx").on(t.status),
}));

// ------------------------------
// Sales Challan Items (with snapshots)
// ------------------------------
export const salesChallanItems = pgTable("sales_challan_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  challanId: uuid("challan_id").notNull().references(() => salesChallans.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  productNameSnapshot: varchar("product_name_snapshot", { length: 255 }).notNull(),
  skuSnapshot: varchar("sku_snapshot", { length: 100 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  challanIdx: index("sales_challan_items_challan_idx").on(t.challanId),
}));

// ------------------------------
// Challan number sequence (per year)
// ------------------------------
export const challanSequences = pgTable("challan_sequences", {
  year: integer("year").primaryKey(),
  counter: integer("counter").notNull().default(0),
});

// ------------------------------
// Relations
// ------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  followUps: many(followUps),
  stockMovements: many(stockMovements),
  challans: many(salesChallans),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  createdBy: one(users, { fields: [customers.createdById], references: [users.id] }),
  followUps: many(followUps),
  challans: many(salesChallans),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  customer: one(customers, { fields: [followUps.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [followUps.createdById], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  stockMovements: many(stockMovements),
  challanItems: many(salesChallanItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [stockMovements.createdById], references: [users.id] }),
}));

export const salesChallansRelations = relations(salesChallans, ({ one, many }) => ({
  customer: one(customers, { fields: [salesChallans.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [salesChallans.createdById], references: [users.id] }),
  items: many(salesChallanItems),
}));

export const salesChallanItemsRelations = relations(salesChallanItems, ({ one }) => ({
  challan: one(salesChallans, { fields: [salesChallanItems.challanId], references: [salesChallans.id] }),
  product: one(products, { fields: [salesChallanItems.productId], references: [products.id] }),
}));
