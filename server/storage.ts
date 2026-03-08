import { db } from "./db";
import {
  products, godownStock, trucks, truckStock, routes, customers, offers, orders, orderItems, expenses,
  type Product, type InsertProduct, type GodownStock, type InsertGodownStock,
  type Truck, type InsertTruck, type TruckStock, type Route, type InsertRoute,
  type Customer, type InsertCustomer, type Offer, type InsertOffer,
  type Order, type OrderItem, type Expense, type InsertExpense,
  type CheckoutRequest, type LoadTruckRequest, type ReturnStockRequest
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Godown Stock
  getGodownStock(): Promise<GodownStock[]>;
  addGodownStock(productId: number, quantity: number): Promise<void>;

  // Trucks
  getTrucks(): Promise<Truck[]>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  
  // Truck Stock
  getTruckStock(truckId: number): Promise<TruckStock[]>;
  loadTruck(req: LoadTruckRequest): Promise<void>;
  returnStock(req: ReturnStockRequest): Promise<void>;

  // Routes
  getRoutes(): Promise<Route[]>;
  createRoute(route: InsertRoute): Promise<Route>;

  // Customers
  getCustomers(routeId?: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Offers
  getOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;

  // Orders
  getOrders(): Promise<Order[]>;
  checkout(req: CheckoutRequest): Promise<Order>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
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
    await db.transaction(async (tx) => {
      for (const item of req.items) {
        // Decrease godown stock
        const gStock = await tx.select().from(godownStock).where(eq(godownStock.productId, item.productId));
        if (gStock.length === 0 || gStock[0].casesAvailable < item.quantity) {
          throw new Error(`Not enough stock in godown for product ${item.productId}`);
        }

        await tx.update(godownStock)
          .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${item.quantity}` })
          .where(eq(godownStock.productId, item.productId));

        // Increase truck stock
        const tStock = await tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))
        );

        if (tStock.length > 0) {
          await tx.update(truckStock)
            .set({ casesAvailable: sql`${truckStock.casesAvailable} + ${item.quantity}` })
            .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId)));
        } else {
          await tx.insert(truckStock).values({
            truckId: req.truckId,
            productId: item.productId,
            casesAvailable: item.quantity
          });
        }
      }
    });
  }

  async returnStock(req: ReturnStockRequest): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of req.items) {
        // Decrease truck stock
        const tStock = await tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId))
        );
        
        if (tStock.length === 0 || tStock[0].casesAvailable < item.quantity) {
          throw new Error(`Not enough stock in truck for product ${item.productId}`);
        }

        await tx.update(truckStock)
          .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${item.quantity}` })
          .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, item.productId)));

        // Increase godown stock
        const gStock = await tx.select().from(godownStock).where(eq(godownStock.productId, item.productId));
        if (gStock.length > 0) {
          await tx.update(godownStock)
            .set({ casesAvailable: sql`${godownStock.casesAvailable} + ${item.quantity}` })
            .where(eq(godownStock.productId, item.productId));
        } else {
          await tx.insert(godownStock).values({
            productId: item.productId,
            casesAvailable: item.quantity
          });
        }
      }
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

  // Customers
  async getCustomers(routeId?: number): Promise<Customer[]> {
    if (routeId !== undefined) {
      return await db.select().from(customers).where(eq(customers.routeId, routeId));
    }
    return await db.select().from(customers);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(customer).returning();
    return c;
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

  async checkout(req: CheckoutRequest): Promise<Order> {
    let finalOrder: Order;
    
    await db.transaction(async (tx) => {
      // 1. Fetch products and offers
      const allProducts = await tx.select().from(products);
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const activeOffers = await tx.select().from(offers).where(eq(offers.isActive, true));

      let totalAmount = 0;
      const finalItems: { productId: number, quantity: number, isFree: boolean }[] = [];
      const stockDeductions = new Map<number, number>();

      for (const item of req.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        totalAmount += product.price * item.quantity;
        finalItems.push({ productId: item.productId, quantity: item.quantity, isFree: false });
        
        stockDeductions.set(item.productId, (stockDeductions.get(item.productId) || 0) + item.quantity);

        // Check for offers
        for (const offer of activeOffers) {
          if (offer.buyProductId === item.productId && item.quantity >= offer.buyQuantity) {
            const offerMultiplier = Math.floor(item.quantity / offer.buyQuantity);
            const freeQty = offerMultiplier * offer.freeQuantity;
            
            finalItems.push({ productId: offer.freeProductId, quantity: freeQty, isFree: true });
            stockDeductions.set(offer.freeProductId, (stockDeductions.get(offer.freeProductId) || 0) + freeQty);
          }
        }
      }

      // 2. Deduct from truck stock
      for (const [productId, quantity] of stockDeductions.entries()) {
        const tStock = await tx.select().from(truckStock).where(
          and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId))
        );

        if (tStock.length === 0 || tStock[0].casesAvailable < quantity) {
          throw new Error(`Not enough stock in truck for product ${productId}`);
        }

        await tx.update(truckStock)
          .set({ casesAvailable: sql`${truckStock.casesAvailable} - ${quantity}` })
          .where(and(eq(truckStock.truckId, req.truckId), eq(truckStock.productId, productId)));
      }

      // 3. Create order
      const [order] = await tx.insert(orders).values({
        customerId: req.customerId,
        truckId: req.truckId,
        paymentMode: req.paymentMode,
        totalAmount,
      }).returning();

      // 4. Create order items
      for (const item of finalItems) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          isFree: item.isFree,
        });
      }
      
      // Update customer credit if payment mode is credit
      if (req.paymentMode === "Credit") {
        await tx.update(customers)
          .set({ creditBalance: sql`${customers.creditBalance} + ${totalAmount}` })
          .where(eq(customers.id, req.customerId));
      }

      // 5. Fetch fully populated order to return
      const populated = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          customer: true,
          items: { with: { product: true } }
        }
      });
      if (!populated) throw new Error("Failed to populate order after creation");
      finalOrder = populated as Order;
    });

    return finalOrder!;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [e] = await db.insert(expenses).values(expense).returning();
    return e;
  }
}

export const storage = new DatabaseStorage();
