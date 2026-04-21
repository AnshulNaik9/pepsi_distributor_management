import { db } from "./db";
import {
  products, godownStock, trucks, truckStock, routes, customers, offers, orders, orderItems, expenses,
  monthlySnapshots, auditLog,
  type Product, type InsertProduct, type GodownStock, type InsertGodownStock,
  type Truck, type InsertTruck, type TruckStock, type Route, type InsertRoute,
  type Customer, type InsertCustomer, type Offer, type InsertOffer,
  type Order, type OrderItem, type Expense, type InsertExpense,
  type CheckoutRequest, type LoadTruckRequest, type ReturnStockRequest,
  type MonthlySnapshot, type ReportDamageRequest
} from "@shared/schema";
import { eq, and, or, desc, sql, ne, inArray, gte, lt } from "drizzle-orm";
import { MongoClient, ObjectId, type Collection } from "mongodb";

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/distrisys";
const DB_NAME = "distrisys";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Godown Stock
  getGodownStock(): Promise<GodownStock[]>;
  addGodownStock(productId: number, quantity: number): Promise<void>;

  // Trucks
  getTrucks(): Promise<Truck[]>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  deleteTruck(id: number): Promise<{ reassignedItems: { productId: number; quantity: number }[] }>;
  
  // Truck Stock
  getTruckStock(truckId: number): Promise<TruckStock[]>;
  loadTruck(req: LoadTruckRequest): Promise<void>;
  returnStock(req: ReturnStockRequest): Promise<void>;
  reportDamage(req: ReportDamageRequest): Promise<void>;

  // Routes
  getRoutes(): Promise<Route[]>;
  createRoute(route: InsertRoute): Promise<Route>;
  deleteRoute(id: number): Promise<void>;

  // Customers
  getCustomers(routeId?: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  payCustomerCredit(id: number): Promise<void>;
  deleteCustomer(id: number): Promise<void>;
  getCustomerOrders(customerId: number): Promise<Order[]>;

  // Offers
  getOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;

  // Orders
  getOrders(): Promise<Order[]>;
  getDeletedOrderHistory(): Promise<any[]>;
  checkout(req: CheckoutRequest): Promise<Order>;
  updateOrder(id: number, req: CheckoutRequest): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  // Monthly
  createMonthlySnapshot(month: string): Promise<MonthlySnapshot[]>;
  getMonthlyHistory(month: string): Promise<MonthlySnapshot[]>;
  getAvailableMonths(): Promise<string[]>;
  resetCustomerMonthlyData(customerId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [p] = await db.insert(products).values(product).returning();
    return p;
  }
  
  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    // Only set defined fields so Drizzle/SQLite don't receive undefined (and category PATCH is kept)
    const patch = Object.fromEntries(
      Object.entries(product).filter(([, v]) => v !== undefined)
    ) as Partial<InsertProduct>;
    if (Object.keys(patch).length === 0) {
      const existing = await db.select().from(products).where(eq(products.id, id));
      if (existing.length === 0) throw new Error("Product not found");
      return existing[0];
    }
    const [p] = await db.update(products).set(patch).where(eq(products.id, id)).returning();
    if (!p) throw new Error("Product not found");
    return p;
  }

  async deleteProduct(id: number): Promise<void> {
    // Check if product exists first
    const existing = await db.select().from(products).where(eq(products.id, id));
    if (existing.length === 0) throw new Error("Product not found");

    // Delete associated entries to avoid constraint violations
    await db.delete(godownStock).where(eq(godownStock.productId, id));
    await db.delete(truckStock).where(eq(truckStock.productId, id));
    await db.delete(offers).where(or(eq(offers.buyProductId, id), eq(offers.freeProductId, id)));
    await db.delete(orderItems).where(eq(orderItems.productId, id));
    
    // Delete the product
    await db.delete(products).where(eq(products.id, id));
  }

  // Godown Stock
  async getGodownStock(): Promise<GodownStock[]> {
    return await db.query.godownStock.findMany({
      with: {
        product: true
      }
    });
  }

  async addGodownStock(productId: number, quantity: number): Promise<void> {
    const existing = await db.select().from(godownStock).where(eq(godownStock.productId, productId));
    
    if (existing.length > 0) {
      await db.update(godownStock)
        .set({ casesAvailable: sql`${godownStock.casesAvailable} + ${quantity}` })
        .where(eq(godownStock.productId, productId));
    } else {
      await db.insert(godownStock).values({
        productId,
        casesAvailable: quantity
      });
    }
  }

  // Trucks
  async getTrucks(): Promise<Truck[]> {
    return await db.select().from(trucks);
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [t] = await db.insert(trucks).values(truck).returning();
    return t;
  }

  async deleteTruck(id: number): Promise<{ reassignedItems: { productId: number; quantity: number }[] }> {
    const existing = await db.select().from(trucks).where(eq(trucks.id, id));
    if (existing.length === 0) throw new Error("Truck not found");

    const reassignedItems: { productId: number; quantity: number }[] = [];

    db.transaction((tx) => {
      // Get all truck stock
      const stock = tx.select().from(truckStock).where(eq(truckStock.truckId, id)).all();
      
      // Return each item to godown
      for (const item of stock) {
        if (item.casesAvailable > 0) {
          reassignedItems.push({ productId: item.productId, quantity: item.casesAvailable });
          
          const gStock = tx.select().from(godownStock).where(eq(godownStock.productId, item.productId)).all();
          if (gStock.length > 0) {
            tx.update(godownStock)
              .set({ casesAvailable: sql`${godownStock.casesAvailable} + ${item.casesAvailable}` })
              .where(eq(godownStock.productId, item.productId)).run();
          } else {
            tx.insert(godownStock).values({
              productId: item.productId,
              casesAvailable: item.casesAvailable
            }).run();
          }
        }
      }

      // Delete truck stock entries
      tx.delete(truckStock).where(eq(truckStock.truckId, id)).run();
      
      // Delete the truck
      tx.delete(trucks).where(eq(trucks.id, id)).run();

      // Audit log
      tx.insert(auditLog).values({
        action: "DELETE_TRUCK",
        entityType: "truck",
        entityId: id,
        entityName: existing[0].vehicleNumber,
        details: reassignedItems.length > 0 
          ? `Reassigned ${reassignedItems.reduce((s, i) => s + i.quantity, 0)} cases back to godown`
          : "No load to reassign"
      }).run();
    });

    return { reassignedItems };
  }

  // Truck Stock
  async getTruckStock(truckId: number): Promise<TruckStock[]> {
    return await db.query.truckStock.findMany({
      where: eq(truckStock.truckId, truckId),
      with: {
        product: true
      }
    });
  }

  async loadTruck(req: LoadTruckRequest): Promise<void> {
    db.transaction((tx) => {
      for (const item of req.items) {
        // Decrease godown stock
        const gStock = tx.select().from(godownStock).where(eq(godownStock.productId, item.productId)).all();
        if (gStock.length === 0 || gStock[0].casesAvailable < item.quantity) {
          throw new Error(`Not enough stock in godown for product ${item.productId}`);
        }

        tx.update(godownStock)
          .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${item.quantity}` })
          .where(eq(godownStock.productId, item.productId)).run();

        // Increase truck stock
        const tStock = tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))
        ).all();

        if (tStock.length > 0) {
          tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} + ${item.quantity}` })
            .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))).run();
        } else {
          tx.insert(truckStock).values({
            truckId: req.truckId,
            productId: item.productId,
            casesAvailable: item.quantity
          }).run();
        }
      }
    });
  }

  async returnStock(req: ReturnStockRequest): Promise<void> {
    db.transaction((tx) => {
      for (const item of req.items) {
        // Decrease truck stock
        const tStock = tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))
        ).all();
        
        if (tStock.length === 0 || tStock[0].casesAvailable < item.quantity) {
          throw new Error(`Not enough stock in truck for product ${item.productId}`);
        }

        tx.update(truckStock)
          .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${item.quantity}` })
          .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))).run();

        // Increase godown stock
        const gStock = tx.select().from(godownStock).where(eq(godownStock.productId, item.productId)).all();
        if (gStock.length > 0) {
          tx.update(godownStock)
            .set({ casesAvailable: sql`${godownStock.casesAvailable} + ${item.quantity}` })
            .where(eq(godownStock.productId, item.productId)).run();
        } else {
          tx.insert(godownStock).values({
            productId: item.productId,
            casesAvailable: item.quantity
          }).run();
        }
      }
    });
  }

  async reportDamage(req: ReportDamageRequest): Promise<void> {
    const { productId, truckId, quantity } = req;
    db.transaction((tx) => {
      if (truckId === 0) {
        // Damage in godown
        const gStock = tx.select().from(godownStock).where(eq(godownStock.productId, productId)).get();
        if (!gStock || gStock.casesAvailable < quantity) {
          throw new Error(`Not enough stock in godown to register damage. Available: ${gStock?.casesAvailable || 0}, Damaged: ${quantity}`);
        }
        tx.update(godownStock)
          .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${quantity}` })
          .where(eq(godownStock.productId, productId)).run();
      } else {
        // Damage in truck
        const tStock = tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, truckId), eq(truckStock.productId, productId))
        ).get();
        
        if (!tStock || tStock.casesAvailable < quantity - 0.000001) {
          throw new Error(`Not enough stock in truck to register damage. Available: ${tStock?.casesAvailable || 0}, Damaged: ${quantity}`);
        }
        tx.update(truckStock)
          .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${quantity}` })
          .where(and(eq(truckStock.truckId, truckId), eq(truckStock.productId, productId))).run();
      }

      // Add to audit log
      const product = tx.select().from(products).where(eq(products.id, productId)).get();
      tx.insert(auditLog).values({
        action: "DAMAGE_STOCK",
        entityType: "inventory",
        entityId: productId,
        entityName: product?.name || `Product #${productId}`,
        details: JSON.stringify({ truckId, quantity }),
      }).run();
    });
  }

  // Routes
  async getRoutes(): Promise<Route[]> {
    return await db.select().from(routes);
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const [r] = await db.insert(routes).values(route).returning();
    return r;
  }

  async deleteRoute(id: number): Promise<void> {
    const existing = await db.select().from(routes).where(eq(routes.id, id));
    if (existing.length === 0) throw new Error("Route not found");

    // Check if route has active (non-deleted) customers
    const activeCustomers = await db.select().from(customers).where(
      and(eq(customers.routeId, id), eq(customers.isDeleted, false))
    );
    if (activeCustomers.length > 0) {
      throw new Error(`Cannot delete route with ${activeCustomers.length} active customer(s). Reassign or delete them first.`);
    }

    // Delete the route
    await db.delete(routes).where(eq(routes.id, id));

    // Audit log
    await db.insert(auditLog).values({
      action: "DELETE_ROUTE",
      entityType: "route",
      entityId: id,
      entityName: existing[0].name,
      details: null,
    });
  }

  // Customers
  async getCustomers(routeId?: number): Promise<Customer[]> {
    if (routeId !== undefined) {
      return await db.select().from(customers).where(
        and(eq(customers.routeId, routeId), eq(customers.isDeleted, false))
      );
    }
    return await db.select().from(customers).where(eq(customers.isDeleted, false));
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(customer).returning();
    return c;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const existing = await db.select().from(customers).where(eq(customers.id, id));
    if (existing.length === 0) throw new Error("Customer not found");

    const [updated] = await db.update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async payCustomerCredit(id: number): Promise<void> {
    const existing = await db.select().from(customers).where(eq(customers.id, id));
    if (existing.length === 0) throw new Error("Customer not found");

    await db.update(customers)
      .set({ creditBalance: 0 })
      .where(eq(customers.id, id));
  }

  async deleteCustomer(id: number): Promise<void> {
    const existing = await db.select().from(customers).where(eq(customers.id, id));
    if (existing.length === 0) throw new Error("Customer not found");

    // Soft-delete: mark as deleted but preserve all order history
    await db.update(customers)
      .set({ isDeleted: true })
      .where(eq(customers.id, id));

    // Audit log
    await db.insert(auditLog).values({
      action: "DELETE_CUSTOMER",
      entityType: "customer",
      entityId: id,
      entityName: existing[0].name,
      details: `Credit balance at deletion: ₹${existing[0].creditBalance}`,
    });
  }

  async getCustomerOrders(customerId: number): Promise<Order[]> {
    return await db.query.orders.findMany({
      where: eq(orders.customerId, customerId),
      orderBy: [desc(orders.date)],
      with: {
        customer: true,
        items: {
          with: { product: true }
        }
      }
    });
  }

  // Offers
  async getOffers(): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.isActive, true));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [o] = await db.insert(offers).values(offer).returning();
    return o;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return await db.query.orders.findMany({
      orderBy: [desc(orders.date)],
      with: {
        customer: true,
        items: {
          with: { product: true }
        }
      }
    });
  }

  async getDeletedOrderHistory(): Promise<any[]> {
    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "DELETE_ORDER"))
      .orderBy(desc(auditLog.timestamp));

    return rows.map((row) => {
      let parsedDetails: any = {};
      try {
        parsedDetails = row.details ? JSON.parse(row.details) : {};
      } catch {
        parsedDetails = {};
      }
      return {
        id: row.id,
        deletedAt: row.timestamp,
        action: row.action,
        ...parsedDetails,
      };
    });
  }

  // Hot reload trigger for bug fix
  async checkout(req: CheckoutRequest): Promise<Order> {
    console.log(`[DEBUG_CHECKOUT] Starting Checkout. CustomerID=${req.customerId}, Items:`, JSON.stringify(req.items));
    const orderId = db.transaction((tx) => {
      // 1. Fetch products and offers
      const allProducts = tx.select().from(products).all();
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const activeOffers = tx.select().from(offers).where(eq(offers.isActive, true)).all();

      let totalAmount = 0;
      const finalItems: { productId: number, quantity: number, isFree: boolean, customPrice?: number }[] = [];
      const stockDeductions = new Map<number, number>();

      // Pre-calculate Global Promo Cases for mixed cases across different products (2.25L and 750ml)
      let globalPromoCases = 0;
      for (const item of req.items) {
          if (item.customFreeQty !== undefined) continue;
          const product = productMap.get(item.productId);
          if (!product) continue;
          
          let hasExplicitOffer = false;
          for (const offer of activeOffers) {
              if (offer.buyProductId === item.productId && item.quantity >= offer.buyQuantity) {
                  hasExplicitOffer = true; break;
              }
          }
          if (hasExplicitOffer) continue;

          const prodName = product.name.toLowerCase();
          const promoCat = (product.category || "others").toLowerCase().trim();
          const isPromo = prodName.includes("2.25") || prodName.includes("750") || promoCat === '2_25_ltr' || promoCat === '750_ml';
          const isExcluded = (prodName.includes("soda") && prodName.includes("2.25")) ||
                             (prodName.includes("pepsi") && prodName.includes("1") && (prodName.includes("ltr") || prodName.includes("1l"))) ||
                             (prodName.includes("lehar") && prodName.includes("soda") && prodName.includes("750"));

          if (isPromo && !isExcluded) {
              globalPromoCases += item.quantity;
          }
      }
      let globalFreeBottlesToAward = Math.floor(globalPromoCases) * 2;

      for (const item of req.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const actualPrice = item.customPrice ?? product.price;
        totalAmount += actualPrice * item.quantity;
        
        finalItems.push({ 
          productId: item.productId, 
          quantity: item.quantity, 
          isFree: false,
          customPrice: item.customPrice
        });
        
        stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) + item.quantity);

        // If this is a zero-price "free" duplicate product, redirect stock deduction to the parent product
        const productForStock = product;
        if (productForStock.price === 0 && productForStock.name.toLowerCase().includes('free')) {
          const baseName = productForStock.name.replace(/\s*\(free\)\s*/i, '').trim().toLowerCase();
          const parentProduct = allProducts.find(pp => pp.id !== productForStock.id && pp.name.trim().toLowerCase() === baseName && pp.category === productForStock.category);
          if (parentProduct) {
            // Remove deduction from the free product, add to the parent
            stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) - item.quantity);
            if (stockDeductions.get(item.productId)! <= 0) stockDeductions.delete(item.productId);
            stockDeductions.set(parentProduct.id, (stockDeductions.get(parentProduct.id) || 0) + item.quantity);
          }
        }

        let freeQtyFromOffers = 0;
        let freeProductId: number | null = null;
        
        for (const offer of activeOffers) {
          if (offer.buyProductId === item.productId && item.quantity >= offer.buyQuantity) {
            const offerMultiplier = Math.floor(item.quantity / offer.buyQuantity);
            const quantityFromOffer = offerMultiplier * offer.freeQuantity;
            if (quantityFromOffer > freeQtyFromOffers) {
              freeQtyFromOffers = quantityFromOffer;
            }
            freeProductId = offer.freeProductId;
          }
        }
        
        let totalFreeQty = 0;
        if (item.customFreeQty !== undefined) {
             totalFreeQty = item.customFreeQty;
        } else if (freeQtyFromOffers > 0) {
             totalFreeQty = freeQtyFromOffers;
        } else {
             const prodName = (product?.name || "").toLowerCase();
             const promoCat = (product?.category || "others").toLowerCase().trim();
             const isPromo = prodName.includes("2.25") || prodName.includes("750") || promoCat === '2_25_ltr' || promoCat === '750_ml';
             const isExcluded = (prodName.includes("soda") && prodName.includes("2.25")) ||
                                (prodName.includes("pepsi") && prodName.includes("1") && (prodName.includes("ltr") || prodName.includes("1l"))) ||
                                (prodName.includes("lehar") && prodName.includes("soda") && prodName.includes("750"));
             if (isPromo && !isExcluded) {
                 if (globalFreeBottlesToAward > 0) {
                     totalFreeQty = globalFreeBottlesToAward;
                     globalFreeBottlesToAward = 0; // Prevent duplicate awards
                 }
             }
        }

        if (totalFreeQty > 0) {
          if (!freeProductId) {
             const aquafinaMatch = allProducts
               .filter(p => p.name.toLowerCase().includes("aquafina"))
               .sort((a, b) => b.id - a.id)[0];
             freeProductId = aquafinaMatch?.id || 22; 
          }
          if (freeProductId) {
            const fProduct = allProducts.find(p => p.id === freeProductId);
            const packing = fProduct?.itemsPerCase && fProduct.itemsPerCase > 0 ? fProduct.itemsPerCase : 1;
            const casesToDeduct = totalFreeQty / packing;
            
            console.log(`[DEBUG_CHECKOUT] Final Free Result: PID=${freeProductId}, Qty=${totalFreeQty}, Cases=${casesToDeduct}`);
            finalItems.push({ productId: freeProductId, quantity: Math.round(totalFreeQty), isFree: true });
            stockDeductions.set(freeProductId, (stockDeductions.get(freeProductId) || 0) + casesToDeduct);
          }
        }
      }

      // 2. Deduct from combined stock (Truck first, then Godown)
      for (const [productId, quantity] of Array.from(stockDeductions.entries())) {
        const tStock = tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId))
        ).get();
        
        const gStock = tx.select().from(godownStock).where(
          eq(godownStock.productId, productId)
        ).get();

        const truckAvailable = tStock?.casesAvailable ?? 0;
        const godownAvailable = gStock?.casesAvailable ?? 0;
        
        if (truckAvailable + godownAvailable < quantity) {
          throw new Error(`Not enough total stock for product ${productId}. Combined: ${truckAvailable + godownAvailable}, Required: ${quantity}`);
        }

        const fromTruck = Math.min(truckAvailable, quantity);
        const fromGodown = quantity - fromTruck;

        // Deduct from truck
        if (fromTruck > 0) {
          tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${fromTruck}` })
            .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId))).run();
        }

        // Deduct from godown
        if (fromGodown > 0) {
          tx.update(godownStock)
            .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${fromGodown}` })
            .where(eq(godownStock.productId, productId)).run();
        }
      }

      // Fetch customer for special discount check
      const customer = tx.select().from(customers).where(eq(customers.id, req.customerId)).get();
      if (customer?.hasSpecialDiscount) {
        totalAmount = Math.max(0, totalAmount - 20);
      }

      // 3. Create order
      let finalPaymentMode = req.paymentMode;
      if (req.paymentMode === "Split" && req.splitAmounts) {
        const parts = [];
        if (req.splitAmounts.cash > 0) parts.push(`Cash: ${req.splitAmounts.cash}`);
        if (req.splitAmounts.upi > 0) parts.push(`UPI: ${req.splitAmounts.upi}`);
        if (req.splitAmounts.credit > 0) parts.push(`Credit: ${req.splitAmounts.credit}`);
        finalPaymentMode = "Split (" + parts.join(", ") + ")";
      }

      const order = tx.insert(orders).values({
        customerId: req.customerId,
        truckId: req.truckId,
        paymentMode: finalPaymentMode,
        totalAmount,
      }).returning().get();


      // 4. Create items
      console.log(`[DEBUG_CHECKOUT] Inserting ${finalItems.length} items for Order ${order.id}`);
      for (const item of finalItems) {
        tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          isFree: item.isFree,
          customPrice: item.customPrice,
        }).run();
      }
      
      // Credit
      if (req.paymentMode === "Credit") {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} + ${totalAmount}` })
          .where(eq(customers.id, req.customerId)).run();
      } else if (req.paymentMode === "Split" && req.splitAmounts && req.splitAmounts.credit > 0) {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} + ${req.splitAmounts.credit}` })
          .where(eq(customers.id, req.customerId)).run();
      }

      return order.id;
    });

    const populated = await db.query.orders.findFirst({
      where: eq(orders.id, orderId as number),
      with: {
        customer: true,
        items: { with: { product: true } }
      }
    });
    if (!populated) throw new Error("Failed to populate order after creation");
    return populated as Order;
  }

  async updateOrder(id: number, req: CheckoutRequest): Promise<Order> {
    const orderId = db.transaction((tx) => {
      // 1. Rollback old order
      const oldOrder = tx.select().from(orders).where(eq(orders.id, id)).get();
      if (!oldOrder) throw new Error("Order not found");

      const oldItems = tx.select().from(orderItems).where(eq(orderItems.orderId, id)).all();
      
      const allProductsForRollback = tx.select().from(products).all();
      
      // Restore truck stock (Rollback)
      for (const item of oldItems) {
        const prod = allProductsForRollback.find(p => p.id === item.productId);
        const packing = (item.isFree && prod?.itemsPerCase && prod.itemsPerCase > 0) ? prod.itemsPerCase : 1;
        const qtyToReturn = item.isFree ? item.quantity / packing : item.quantity;
        
        const existing = tx.select()
          .from(truckStock)
          .where(and(eq(truckStock.truckId, oldOrder.truckId), eq(truckStock.productId, item.productId)))
          .get();

        if (existing) {
          tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} + ${qtyToReturn}` })
            .where(and(eq(truckStock.truckId, oldOrder.truckId), eq(truckStock.productId, item.productId)))
            .run();
        } else {
          tx.insert(truckStock).values({
            truckId: oldOrder.truckId,
            productId: item.productId,
            casesAvailable: qtyToReturn
          }).run();
        }
      }


      // Revert customer credit if it was credit
      let creditRevert = 0;
      if (oldOrder.paymentMode === "Credit") creditRevert = oldOrder.totalAmount;
      else if (oldOrder.paymentMode.startsWith("Split")) {
        const match = oldOrder.paymentMode.match(/Credit:\s*(\d+)/);
        if (match) creditRevert = parseInt(match[1], 10);
      }

      if (creditRevert > 0) {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} - ${creditRevert}` })
          .where(eq(customers.id, oldOrder.customerId)).run();
      }

      // Delete old items
      tx.delete(orderItems).where(eq(orderItems.orderId, id)).run();

      // 2. Fetch products and offers for new items
      const allProducts = tx.select().from(products).all();
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const activeOffers = tx.select().from(offers).where(eq(offers.isActive, true)).all();

      let totalAmount = 0;
      const finalItems: { productId: number, quantity: number, isFree: boolean, customPrice?: number }[] = [];
      const stockDeductions = new Map<number, number>();

      let globalPromoCases = 0;
      for (const item of req.items) {
          if (item.customFreeQty !== undefined) continue;
          const product = productMap.get(item.productId);
          if (!product) continue;
          
          let hasExplicitOffer = false;
          for (const offer of activeOffers) {
              if (offer.buyProductId === item.productId && item.quantity >= offer.buyQuantity) {
                  hasExplicitOffer = true; break;
              }
          }
          if (hasExplicitOffer) continue;

          const prodName = product.name.toLowerCase();
          const promoCat = (product.category || "others").toLowerCase().trim();
          const isPromo = prodName.includes("2.25") || prodName.includes("750") || promoCat === '2_25_ltr' || promoCat === '750_ml';
          const isExcluded = (prodName.includes("soda") && prodName.includes("2.25")) ||
                             (prodName.includes("pepsi") && prodName.includes("1") && (prodName.includes("ltr") || prodName.includes("1l"))) ||
                             (prodName.includes("lehar") && prodName.includes("soda") && prodName.includes("750"));

          if (isPromo && !isExcluded) {
              globalPromoCases += item.quantity;
          }
      }
      let globalFreeBottlesToAward = Math.floor(globalPromoCases) * 2;

      for (const item of req.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const actualPrice = item.customPrice ?? product.price;
        totalAmount += actualPrice * item.quantity;
        
        finalItems.push({ 
          productId: item.productId, 
          quantity: item.quantity, 
          isFree: false,
          customPrice: item.customPrice
        });
        
        stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) + item.quantity);

        let freeQtyFromOffers = 0;
        let freeProductId: number | null = null;
        
        for (const offer of activeOffers) {
          if (offer.buyProductId === item.productId && item.quantity >= offer.buyQuantity) {
            const offerMultiplier = Math.floor(item.quantity / offer.buyQuantity);
            const quantityFromOffer = offerMultiplier * offer.freeQuantity;
            if (quantityFromOffer > freeQtyFromOffers) {
              freeQtyFromOffers = quantityFromOffer;
            }
            freeProductId = offer.freeProductId;
          }
        }
        
        let totalFreeQty = 0;
        if (item.customFreeQty !== undefined) {
             totalFreeQty = item.customFreeQty;
        } else if (freeQtyFromOffers > 0) {
             totalFreeQty = freeQtyFromOffers;
        } else {
             const prodName = (product?.name || "").toLowerCase();
             const promoCat = (product?.category || "others").toLowerCase().trim();
             const isPromo = prodName.includes("2.25") || prodName.includes("750") || promoCat === '2_25_ltr' || promoCat === '750_ml';
             const isExcluded = (prodName.includes("soda") && prodName.includes("2.25")) ||
                                (prodName.includes("pepsi") && prodName.includes("1") && (prodName.includes("ltr") || prodName.includes("1l"))) ||
                                (prodName.includes("lehar") && prodName.includes("soda") && prodName.includes("750"));
             if (isPromo && !isExcluded) {
                 if (globalFreeBottlesToAward > 0) {
                     totalFreeQty = globalFreeBottlesToAward;
                     globalFreeBottlesToAward = 0; // Prevent duplicate awards
                 }
             }
        }

        if (totalFreeQty > 0) {
          if (!freeProductId) {
             const aquafinaMatch = allProducts
               .filter(p => p.name.toLowerCase().includes("aquafina"))
               .sort((a, b) => b.id - a.id)[0];
             freeProductId = aquafinaMatch?.id || 22; 
          }
          if (freeProductId) {
            const fProduct = allProducts.find(p => p.id === freeProductId);
            const packing = fProduct?.itemsPerCase && fProduct.itemsPerCase > 0 ? fProduct.itemsPerCase : 1;
            const casesToDeduct = totalFreeQty / packing;
            
            console.log(`[DEBUG_UPDATE] Final Free Result: PID=${freeProductId}, Qty=${totalFreeQty}, Cases=${casesToDeduct}`);
            finalItems.push({ productId: freeProductId, quantity: Math.round(totalFreeQty), isFree: true });
            stockDeductions.set(freeProductId, (stockDeductions.get(freeProductId) || 0) + casesToDeduct);
          }
        }
      }

      // 3. Deduct stock for new items
      for (const [productId, quantity] of Array.from(stockDeductions.entries())) {
        const tStock = tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId))
        ).get();
        
        const gStock = tx.select().from(godownStock).where(
          eq(godownStock.productId, productId)
        ).get();

        const truckAvailable = tStock?.casesAvailable ?? 0;
        const godownAvailable = gStock?.casesAvailable ?? 0;
        
        if (truckAvailable + godownAvailable < quantity) {
          throw new Error(`Not enough total stock for product ${productId}. Combined: ${truckAvailable + godownAvailable}, Required: ${quantity}`);
        }

        const fromTruck = Math.min(truckAvailable, quantity);
        const fromGodown = quantity - fromTruck;

        if (fromTruck > 0) {
          tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${fromTruck}` })
            .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId))).run();
        }

        if (fromGodown > 0) {
          tx.update(godownStock)
            .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${fromGodown}` })
            .where(eq(godownStock.productId, productId)).run();
        }
      }

      // Fetch customer for special discount check
      const customer = tx.select().from(customers).where(eq(customers.id, req.customerId)).get();
      if (customer?.hasSpecialDiscount) {
        totalAmount = Math.max(0, totalAmount - 20);
      }

      let finalPaymentMode = req.paymentMode;
      if (req.paymentMode === "Split" && req.splitAmounts) {
        const parts = [];
        if (req.splitAmounts.cash > 0) parts.push(`Cash: ${req.splitAmounts.cash}`);
        if (req.splitAmounts.upi > 0) parts.push(`UPI: ${req.splitAmounts.upi}`);
        if (req.splitAmounts.credit > 0) parts.push(`Credit: ${req.splitAmounts.credit}`);
        finalPaymentMode = "Split (" + parts.join(", ") + ")";
      }

      // 4. Update the existing order record
      tx.update(orders)
        .set({
          customerId: req.customerId,
          truckId: req.truckId,
          paymentMode: finalPaymentMode,
          totalAmount
        })
        .where(eq(orders.id, id))
        .run();


      // 5. Insert new items
      for (const item of finalItems) {
        tx.insert(orderItems).values({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          isFree: item.isFree,
          customPrice: item.customPrice,
        }).run();
      }
      
      // 6. Add new credit if required
      if (req.paymentMode === "Credit") {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} + ${totalAmount}` })
          .where(eq(customers.id, req.customerId)).run();
      } else if (req.paymentMode === "Split" && req.splitAmounts && req.splitAmounts.credit > 0) {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} + ${req.splitAmounts.credit}` })
          .where(eq(customers.id, req.customerId)).run();
      }

      return id;
    });

    const populated = await db.query.orders.findFirst({
      where: eq(orders.id, orderId as number),
      with: {
        customer: true,
        items: { with: { product: true } }
      }
    });
    if (!populated) throw new Error("Failed to populate order after update");
    return populated as Order;
  }

  async deleteOrder(id: number): Promise<void> {
    db.transaction((tx) => {
      const order = tx.select().from(orders).where(eq(orders.id, id)).get();
      if (!order) return;

      const items = tx.select().from(orderItems).where(eq(orderItems.orderId, id)).all();
      const customer = tx.select().from(customers).where(eq(customers.id, order.customerId)).get();

      tx.insert(auditLog).values({
        action: "DELETE_ORDER",
        entityType: "order",
        entityId: order.id,
        entityName: customer?.name || `Order #${order.id}`,
        details: JSON.stringify({
          orderId: order.id,
          orderDate: order.date,
          totalAmount: order.totalAmount,
          paymentMode: order.paymentMode,
          customerName: customer?.name || "Unknown",
          customerPhone: customer?.phone || "",
          customerId: order.customerId,
          truckId: order.truckId,
          deletedBy: "driver",
          items,
        }),
      }).run();
      
      // 1. Restore truck stock
      for (const item of items) {
        // Find if this product is already in the truck stock
        const existing = tx.select()
          .from(truckStock)
          .where(and(eq(truckStock.truckId, order.truckId), eq(truckStock.productId, item.productId)))
          .get();

        if (existing) {
          // Add back to existing truck stock
          tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} + ${item.quantity}` })
            .where(and(eq(truckStock.truckId, order.truckId), eq(truckStock.productId, item.productId)))
            .run();
        } else {
          // If not in truck stock, create it
          tx.insert(truckStock).values({
            truckId: order.truckId,
            productId: item.productId,
            casesAvailable: item.quantity
          }).run();
        }
      }

      // 2. Revert customer credit if it was a credit sale
      let creditRevert = 0;
      if (order.paymentMode === "Credit") creditRevert = order.totalAmount;
      else if (order.paymentMode.startsWith("Split")) {
        const match = order.paymentMode.match(/Credit:\s*(\d+)/);
        if (match) creditRevert = parseInt(match[1], 10);
      }

      if (creditRevert > 0) {
        tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} - ${creditRevert}` })
          .where(eq(customers.id, order.customerId))
          .run();
      }

      // 3. Delete items and finally the order itself
      tx.delete(orderItems).where(eq(orderItems.orderId, id)).run();
      tx.delete(orders).where(eq(orders.id, id)).run();
    });
  }


  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [e] = await db.insert(expenses).values(expense).returning();
    return e;
  }

  // Monthly Snapshots
  async createMonthlySnapshot(month: string): Promise<MonthlySnapshot[]> {
    // Check if snapshot already exists for this month
    const existing = await db.select().from(monthlySnapshots).where(eq(monthlySnapshots.month, month));
    if (existing.length > 0) {
      throw new Error(`Snapshot for ${month} already exists`);
    }

    // Get all active customers and their orders for this month
    const allCustomers = await db.select().from(customers).where(eq(customers.isDeleted, false));
    const allOrders = await db.query.orders.findMany({
      with: { items: { with: { product: true } } }
    });

    const snapshots: MonthlySnapshot[] = [];

    for (const customer of allCustomers) {
      // Filter orders for this customer in the given month
      const customerOrders = allOrders.filter(o => {
        if (o.customerId !== customer.id) return false;
        const orderDate = new Date(o.date as any);
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === month;
      });

      const totalPurchases = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const orderCount = customerOrders.length;

      if (totalPurchases > 0 || orderCount > 0) {
        const [snapshot] = await db.insert(monthlySnapshots).values({
          month,
          customerId: customer.id,
          customerName: customer.name,
          totalPurchases,
          orderCount,
        }).returning();
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  async getMonthlyHistory(month: string): Promise<MonthlySnapshot[]> {
    return await db.select().from(monthlySnapshots).where(eq(monthlySnapshots.month, month));
  }

  async getAvailableMonths(): Promise<string[]> {
    const result = await db.selectDistinct({ month: monthlySnapshots.month }).from(monthlySnapshots);
    return result.map(r => r.month).sort().reverse();
  }

  async resetCustomerMonthlyData(customerId: number): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

    await db.update(orders)
      .set({ isArchived: true })
      .where(
        and(
          eq(orders.customerId, customerId),
          gte(orders.date, firstOfMonth),
          lt(orders.date, firstOfNextMonth),
          eq(orders.isArchived, false)
        )
      ).run();

    // Audit log
    await db.insert(auditLog).values({
      action: "ARCHIVE_CUSTOMER_MONTHLY_DATA",
      entityType: "customer",
      entityId: customerId,
      entityName: "N/A",
      details: `Archived orders for the current month.`,
    }).run();
  }
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private dbName: string;

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
    this.dbName = DB_NAME;
    this.client.connect().then(() => console.log("✅ Admin Server connected to MongoDB")).catch(err => console.error("❌ MongoDB Connection Error:", err));
  }

  private get col() {
    const db = this.client.db(this.dbName);
    return {
      products: db.collection("products"),
      godownStock: db.collection("godownstocks"),
      trucks: db.collection("trucks"),
      truckStock: db.collection("truckstocks"),
      routes: db.collection("routes"),
      customers: db.collection("customers"),
      offers: db.collection("offers"),
      orders: db.collection("orders"),
      expenses: db.collection("expenses"),
      monthlySnapshots: db.collection("monthlysnapshots"),
      auditLog: db.collection("auditlogs"),
    };
  }

  // Helper to map Mongo _id to numeric id or string for IStorage compatibility
  private mapId(doc: any): any {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toString(), _id };
  }

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    const prods = await this.col.products.find().toArray();
    return prods.map(p => this.mapId(p));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const res = await this.col.products.insertOne({ ...product, createdAt: new Date(), updatedAt: new Date() });
    const p = await this.col.products.findOne({ _id: res.insertedId });
    return this.mapId(p);
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const objId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.col.products.updateOne({ _id: new ObjectId(id as any) }, { $set: { ...product, updatedAt: new Date() } });
    return this.mapId(await this.col.products.findOne({ _id: new ObjectId(id as any) }));
  }

  async deleteProduct(id: number): Promise<void> {
    const oid = new ObjectId(id as any);
    await this.col.godownStock.deleteMany({ productId: oid });
    await this.col.truckStock.deleteMany({ productId: oid });
    await this.col.products.deleteOne({ _id: oid });
  }

  // === GODOWN STOCK ===
  async getGodownStock(): Promise<GodownStock[]> {
    const stocks = await this.col.godownStock.aggregate([
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' }
    ]).toArray();
    return stocks.map(s => ({ ...this.mapId(s), product: this.mapId(s.product) }));
  }

  async addGodownStock(productId: number, quantity: number): Promise<void> {
    const pid = new ObjectId(productId as any);
    await this.col.godownStock.updateOne(
      { productId: pid },
      { $inc: { casesAvailable: quantity }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }

  // === TRUCKS ===
  async getTrucks(): Promise<Truck[]> {
    const t = await this.col.trucks.find().toArray();
    return t.map(x => this.mapId(x));
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const res = await this.col.trucks.insertOne({ ...truck, createdAt: new Date(), updatedAt: new Date() });
    return this.mapId(await this.col.trucks.findOne({ _id: res.insertedId }));
  }

  async deleteTruck(id: number): Promise<{ reassignedItems: { productId: number; quantity: number }[] }> {
    const oid = new ObjectId(id as any);
    const truck = await this.col.trucks.findOne({ _id: oid });
    if (!truck) throw new Error("Truck not found");

    const stock = await this.col.truckStock.find({ truckId: oid }).toArray();
    const reassignedItems: any[] = [];

    for (const item of stock) {
      if (item.casesAvailable > 0) {
        reassignedItems.push({ productId: item.productId.toString(), quantity: item.casesAvailable });
        await this.addGodownStock(item.productId as any, item.casesAvailable);
      }
    }

    await this.col.truckStock.deleteMany({ truckId: oid });
    await this.col.trucks.deleteOne({ _id: oid });
    
    await this.col.auditLog.insertOne({
      action: "DELETE_TRUCK",
      entityType: "truck",
      entityId: id.toString(),
      entityName: truck.vehicleNumber,
      details: reassignedItems.length > 0 ? `Reassigned ${reassignedItems.length} items` : "No load",
      timestamp: new Date()
    });

    return { reassignedItems };
  }

  // === TRUCK STOCK ===
  async getTruckStock(truckId: number): Promise<TruckStock[]> {
    const stocks = await this.col.truckStock.aggregate([
      { $match: { truckId: new ObjectId(truckId as any) } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' }
    ]).toArray();
    return stocks.map(s => ({ ...this.mapId(s), product: this.mapId(s.product) }));
  }

  async loadTruck(req: LoadTruckRequest): Promise<void> {
    const tid = new ObjectId(req.truckId as any);
    for (const item of req.items) {
      const pid = new ObjectId(item.productId as any);
      const gStock = await this.col.godownStock.findOne({ productId: pid });
      if (!gStock || gStock.casesAvailable < item.quantity) throw new Error(`Insufficient Godown Stock for ${item.productId}`);
      
      await this.col.godownStock.updateOne({ productId: pid }, { $inc: { casesAvailable: -item.quantity } });
      await this.col.truckStock.updateOne(
        { truckId: tid, productId: pid },
        { $inc: { casesAvailable: item.quantity }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }
  }

  async returnStock(req: ReturnStockRequest): Promise<void> {
    const tid = new ObjectId(req.truckId as any);
    for (const item of req.items) {
      const pid = new ObjectId(item.productId as any);
      await this.col.truckStock.updateOne({ truckId: tid, productId: pid }, { $inc: { casesAvailable: -item.quantity } });
      await this.addGodownStock(pid as any, item.quantity);
    }
  }

  async reportDamage(req: ReportDamageRequest): Promise<void> {
    const pid = new ObjectId(req.productId as any);
    if (req.truckId === 0) {
      await this.col.godownStock.updateOne({ productId: pid }, { $inc: { casesAvailable: -req.quantity } });
    } else {
      await this.col.truckStock.updateOne({ truckId: new ObjectId(req.truckId as any), productId: pid }, { $inc: { casesAvailable: -req.quantity } });
    }
  }

  // === ROUTES ===
  async getRoutes(): Promise<Route[]> {
    const r = await this.col.routes.find().toArray();
    return r.map(x => this.mapId(x));
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const res = await this.col.routes.insertOne({ ...route, createdAt: new Date(), updatedAt: new Date() });
    return this.mapId(await this.col.routes.findOne({ _id: res.insertedId }));
  }

  async deleteRoute(id: number): Promise<void> {
    await this.col.routes.deleteOne({ _id: new ObjectId(id as any) });
  }

  // === CUSTOMERS ===
  async getCustomers(routeId?: number): Promise<Customer[]> {
    const filter: any = { isDeleted: false };
    if (routeId) filter.routeId = new ObjectId(routeId as any);
    const c = await this.col.customers.find(filter).toArray();
    return c.map(x => this.mapId(x));
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const res = await this.col.customers.insertOne({ 
      ...customer, 
      routeId: new ObjectId(customer.routeId as any),
      isDeleted: false,
      createdAt: new Date(), 
      updatedAt: new Date() 
    });
    return this.mapId(await this.col.customers.findOne({ _id: res.insertedId }));
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const oid = new ObjectId(id as any);
    if (customer.routeId) customer.routeId = new ObjectId(customer.routeId as any) as any;
    await this.col.customers.updateOne({ _id: oid }, { $set: { ...customer, updatedAt: new Date() } });
    return this.mapId(await this.col.customers.findOne({ _id: oid }));
  }

  async payCustomerCredit(id: number): Promise<void> {
    await this.col.customers.updateOne({ _id: new ObjectId(id as any) }, { $set: { creditBalance: 0 } });
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.col.customers.updateOne({ _id: new ObjectId(id as any) }, { $set: { isDeleted: true } });
  }

  async getCustomerOrders(customerId: number): Promise<Order[]> {
    const orders = await this.col.orders.aggregate([
      { $match: { customerId: new ObjectId(customerId as any) } },
      { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $sort: { date: -1 } }
    ]).toArray();
    return orders.map(o => ({ ...this.mapId(o), customer: this.mapId(o.customer) }));
  }

  // === OFFERS ===
  async getOffers(): Promise<Offer[]> {
    const o = await this.col.offers.find({ isActive: true }).toArray();
    return o.map(x => this.mapId(x));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const res = await this.col.offers.insertOne({ 
      ...offer, 
      buyProductId: new ObjectId(offer.buyProductId as any),
      freeProductId: new ObjectId(offer.freeProductId as any),
      createdAt: new Date(), 
      updatedAt: new Date() 
    });
    return this.mapId(await this.col.offers.findOne({ _id: res.insertedId }));
  }

  // === ORDERS ===
  async getOrders(): Promise<Order[]> {
    const orders = await this.col.orders.aggregate([
      { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } }
    ]).toArray();
    return orders.map(o => ({ ...this.mapId(o), customer: this.mapId(o.customer) }));
  }

  async getDeletedOrderHistory(): Promise<any[]> {
    const logs = await this.col.auditLog.find({ action: "DELETE_ORDER" }).sort({ timestamp: -1 }).toArray();
    return logs.map(l => this.mapId(l));
  }

  async checkout(req: CheckoutRequest): Promise<Order> {
    const cid = new ObjectId(req.customerId as any);
    const tid = new ObjectId(req.truckId as any);
    
    const items = req.items.map(i => ({
      productId: new ObjectId(i.productId as any),
      quantity: i.quantity,
      isFree: false,
      customPrice: i.customPrice
    }));

    const orderDoc = {
      customerId: cid,
      truckId: tid,
      date: new Date(),
      totalAmount: 0, // Simplified for now, should calculate properly
      paymentMode: req.paymentMode,
      items,
      createdAt: new Date()
    };

    // Calculate total
    for (const item of req.items) {
      const prod = await this.col.products.findOne({ _id: new ObjectId(item.productId as any) });
      orderDoc.totalAmount += (item.customPrice || prod?.price || 0) * item.quantity;
      // Deduct stock (simplified)
      await this.col.truckStock.updateOne({ truckId: tid, productId: new ObjectId(item.productId as any) }, { $inc: { casesAvailable: -item.quantity } });
    }

    if (req.paymentMode === "Credit") {
      await this.col.customers.updateOne({ _id: cid }, { $inc: { creditBalance: orderDoc.totalAmount } });
    }

    const res = await this.col.orders.insertOne(orderDoc);
    const o = await this.col.orders.findOne({ _id: res.insertedId });
    return this.mapId(o);
  }

  async updateOrder(id: number, req: CheckoutRequest): Promise<Order> {
    throw new Error("Update order not implemented in Mongo yet");
  }

  async deleteOrder(id: number): Promise<void> {
    const oid = new ObjectId(id as any);
    await this.col.orders.deleteOne({ _id: oid });
  }

  // === EXPENSES ===
  async getExpenses(): Promise<Expense[]> {
    const e = await this.col.expenses.find().toArray();
    return e.map(x => this.mapId(x));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const res = await this.col.expenses.insertOne({ 
      ...expense, 
      truckId: new ObjectId(expense.truckId as any),
      date: new Date(),
      createdAt: new Date() 
    });
    return this.mapId(await this.col.expenses.findOne({ _id: res.insertedId }));
  }

  // === MONTHLY ===
  async createMonthlySnapshot(month: string): Promise<MonthlySnapshot[]> {
    return [];
  }

  async getMonthlyHistory(month: string): Promise<MonthlySnapshot[]> {
    return [];
  }

  async getAvailableMonths(): Promise<string[]> {
    return [];
  }

  async resetCustomerMonthlyData(customerId: number): Promise<void> {}
}

export const storage = new MongoStorage();
