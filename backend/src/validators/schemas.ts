import { z } from "zod";

// ---------- Auth ----------
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// ---------- Customer ----------
export const customerTypeEnum = z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export const customerStatusEnum = z.enum(["LEAD", "ACTIVE", "INACTIVE"]);

export const createCustomerSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  mobileNumber: z.string().min(6, "Mobile number is required"),
  email: z.string().email().optional().or(z.literal("")).optional(),
  businessName: z.string().min(1, "Business name is required"),
  gstNumber: z.string().optional(),
  customerType: customerTypeEnum,
  address: z.string().min(1, "Address is required"),
  status: customerStatusEnum.optional(),
  followUpDate: z.string().datetime().optional().or(z.string().date()).optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createFollowUpSchema = z.object({
  note: z.string().min(1, "Note is required"),
  followUpDate: z.string().min(1, "Follow-up date is required"),
});

// ---------- Product ----------
export const createProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  unitPrice: z.number().nonnegative("Unit price must be >= 0"),
  currentStock: z.number().int().nonnegative("Current stock must be >= 0").optional(),
  minimumStock: z.number().int().nonnegative("Minimum stock must be >= 0").optional(),
  warehouseLocation: z.string().min(1, "Warehouse location is required"),
});

export const updateProductSchema = createProductSchema.partial();

// ---------- Inventory ----------
export const stockMovementSchema = z.object({
  productId: z.string().uuid("Valid productId is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "Reason is required"),
});

// ---------- Challan ----------
export const challanItemSchema = z.object({
  productId: z.string().uuid("Valid productId is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid("Valid customerId is required"),
  items: z.array(challanItemSchema).min(1, "At least one item is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).optional(),
});

export const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1, "At least one item is required").optional(),
});
