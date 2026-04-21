import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** Product size / catalog section */
export const productCategoryValues = [
  "2_25_ltr",
  "1_ltr",
  "750_ml",
  "400_ml",
  "others",
] as const;
export type ProductCategory = (typeof productCategoryValues)[number];
export const productCategorySchema = z.enum(productCategoryValues);

export const products = sqliteTable("products", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(), // Per case
  unit: text("unit").notNull().default("ltr"), // 'ltr' or 'ml'
  quantityPerUnit: text("quantity_per_unit").notNull().default("1"), // e.g. "2.25"
  itemsPerCase: integer("items_per_case").notNull().default(1), // 1 case = X items
  category: text("category").notNull().default("others"),
  purchasePrice: integer("purchase_price").notNull().default(0), // Cost price per case
});

export const godownStock = sqliteTable("godown_stock", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  casesAvailable: integer("cases_available").notNull().default(0),
});

export const trucks = sqliteTable("trucks", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehicleNumber: text("vehicle_number").notNull(),
  driverName: text("driver_name").notNull(),
});

export const truckStock = sqliteTable("truck_stock", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  truckId: integer("truck_id").notNull(),
  productId: integer("product_id").notNull(),
  casesAvailable: integer("cases_available").notNull().default(0),
});

export const routes = sqliteTable("routes", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const customers = sqliteTable("customers", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  routeId: integer("route_id").notNull(),
  creditBalance: integer("credit_balance").notNull().default(0),
  address: text("address").notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  hasSpecialDiscount: integer('has_special_discount', { mode: 'boolean' }).default(false),
});


export const monthlySnapshots = sqliteTable("monthly_snapshots", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text("month").notNull(), // "2026-04"
  customerId: integer("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  totalPurchases: integer("total_purchases").notNull().default(0),
  orderCount: integer("order_count").notNull().default(0),
  snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text("action").notNull(), // "DELETE_CUSTOMER", "DELETE_ROUTE", etc.
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  details: text("details"),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const offers = sqliteTable("offers", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  buyProductId: integer("buy_product_id").notNull(),
  buyQuantity: integer("buy_quantity").notNull(),
  freeProductId: integer("free_product_id").notNull(),
  freeQuantity: integer("free_quantity").notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const orders = sqliteTable("orders", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  truckId: integer("truck_id").notNull(),
  date: integer('date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  totalAmount: integer("total_amount").notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, UPI, Credit, Bank Transfer
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
});

export const orderItems = sqliteTable("order_items", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  customPrice: integer("custom_price"),
});

export const expenses = sqliteTable("expenses", {
  id: integer('id').primaryKey({ autoIncrement: true }),
  truckId: integer("truck_id").notNull(),
  date: integer('date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
});

// Relations
export const productRelations = relations(products, ({ many }) => ({
  godownStock: many(godownStock),
  truckStock: many(truckStock),
  orderItems: many(orderItems),
}));

export const godownStockRelations = relations(godownStock, ({ one }) => ({
  product: one(products, { fields: [godownStock.productId], references: [products.id] }),
}));

export const truckRelations = relations(trucks, ({ many }) => ({
  truckStock: many(truckStock),
  orders: many(orders),
  expenses: many(expenses),
}));

export const truckStockRelations = relations(truckStock, ({ one }) => ({
  product: one(products, { fields: [truckStock.productId], references: [products.id] }),
  truck: one(trucks, { fields: [truckStock.truckId], references: [trucks.id] }),
}));

export const routeRelations = relations(routes, ({ many }) => ({
  customers: many(customers),
}));

export const monthlySnapshotRelations = relations(monthlySnapshots, ({ one }) => ({
  customer: one(customers, { fields: [monthlySnapshots.customerId], references: [customers.id] }),
}));

export const customerRelations = relations(customers, ({ one, many }) => ({
  route: one(routes, { fields: [customers.routeId], references: [routes.id] }),
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  truck: one(trucks, { fields: [orders.truckId], references: [trucks.id] }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

// Schemas
export const insertProductSchema = createInsertSchema(products, {
  category: productCategorySchema.optional(),
}).omit({ id: true });

/** PATCH body — all fields optional; category must be a known value when sent */
export const patchProductSchema = insertProductSchema.partial();
export const insertGodownStockSchema = createInsertSchema(godownStock).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true });
export const insertTruckStockSchema = createInsertSchema(truckStock).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const patchCustomerSchema = insertCustomerSchema.partial();
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, date: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, date: true });
export const insertMonthlySnapshotSchema = createInsertSchema(monthlySnapshots).omit({ id: true, snapshotDate: true });

// Custom compound schema for checkout
export const checkoutSchema = z.object({
  customerId: z.number(),
  truckId: z.number(),
  paymentMode: z.string(),
  splitAmounts: z.object({
    cash: z.number(),
    upi: z.number(),
    credit: z.number()
  }).optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
    customPrice: z.number().optional(),
    customFreeQty: z.number().optional(),
  })),
});

export const loadTruckSchema = z.object({
  truckId: z.number(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
  })),
});

export const returnStockSchema = z.object({
  truckId: z.number(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
  })),
});

export const reportDamageSchema = z.object({
  productId: z.number(),
  truckId: z.number(),
  quantity: z.number().positive(),
});

// Types
export type Product = typeof products.$inferSelect;
export type GodownStock = typeof godownStock.$inferSelect & { product?: Product };
export type Truck = typeof trucks.$inferSelect;
export type TruckStock = typeof truckStock.$inferSelect & { product?: Product };
export type Route = typeof routes.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Order = typeof orders.$inferSelect & { customer?: Customer, items?: OrderItem[] };
export type OrderItem = typeof orderItems.$inferSelect & { product?: Product };
export type Expense = typeof expenses.$inferSelect;
export type MonthlySnapshot = typeof monthlySnapshots.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertGodownStock = z.infer<typeof insertGodownStockSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertMonthlySnapshot = z.infer<typeof insertMonthlySnapshotSchema>;
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
export type LoadTruckRequest = z.infer<typeof loadTruckSchema>;
export type ReturnStockRequest = z.infer<typeof returnStockSchema>;
export type ReportDamageRequest = z.infer<typeof reportDamageSchema>;
