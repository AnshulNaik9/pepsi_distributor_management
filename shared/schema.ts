import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(), // Amount in rupees
});

export const godownStock = pgTable("godown_stock", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  casesAvailable: integer("cases_available").notNull().default(0),
});

export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  driverName: text("driver_name").notNull(),
});

export const truckStock = pgTable("truck_stock", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  productId: integer("product_id").notNull(),
  casesAvailable: integer("cases_available").notNull().default(0),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  routeId: integer("route_id").notNull(),
  creditBalance: integer("credit_balance").notNull().default(0),
  address: text("address").notNull(),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  buyProductId: integer("buy_product_id").notNull(),
  buyQuantity: integer("buy_quantity").notNull(),
  freeProductId: integer("free_product_id").notNull(),
  freeQuantity: integer("free_quantity").notNull(),
  isActive: boolean("is_active").default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  truckId: integer("truck_id").notNull(),
  date: timestamp("date").defaultNow(),
  totalAmount: integer("total_amount").notNull(),
  paymentMode: text("payment_mode").notNull(), // Cash, UPI, Credit, Bank Transfer
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  isFree: boolean("is_free").default(false),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  date: timestamp("date").defaultNow(),
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
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertGodownStockSchema = createInsertSchema(godownStock).omit({ id: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true });
export const insertTruckStockSchema = createInsertSchema(truckStock).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, date: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, date: true });

// Custom compound schema for checkout
export const checkoutSchema = z.object({
  customerId: z.number(),
  truckId: z.number(),
  paymentMode: z.string(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
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

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
export type LoadTruckRequest = z.infer<typeof loadTruckSchema>;
export type ReturnStockRequest = z.infer<typeof returnStockSchema>;
