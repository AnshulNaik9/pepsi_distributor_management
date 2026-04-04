import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === PRODUCTS ===
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const body = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(body);
      res.status(201).json(product);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: e.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.patch(api.products.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(id, body);
      res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: e.errors[0].message });
      } else if (e instanceof Error && e.message === "Product not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).end();
    } catch (e) {
      if (e instanceof Error && e.message === "Product not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  // === GODOWN STOCK ===
  app.get(api.godownStock.list.path, async (req, res) => {
    const stock = await storage.getGodownStock();
    res.json(stock);
  });

  app.post(api.godownStock.add.path, async (req, res) => {
    try {
      const { productId, quantity } = api.godownStock.add.input.parse(req.body);
      await storage.addGodownStock(productId, quantity);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  // === TRUCKS ===
  app.get(api.trucks.list.path, async (req, res) => {
    const trucks = await storage.getTrucks();
    res.json(trucks);
  });

  app.post(api.trucks.create.path, async (req, res) => {
    try {
      const body = api.trucks.create.input.parse(req.body);
      const truck = await storage.createTruck(body);
      res.status(201).json(truck);
    } catch (e) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.post(api.trucks.load.path, async (req, res) => {
    try {
      const body = api.trucks.load.input.parse(req.body);
      await storage.loadTruck(body);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  app.post(api.trucks.returnStock.path, async (req, res) => {
    try {
      const body = api.trucks.returnStock.input.parse(req.body);
      await storage.returnStock(body);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  app.get(api.trucks.stock.path, async (req, res) => {
    const stock = await storage.getTruckStock(parseInt(req.params.id));
    res.json(stock);
  });

  // === ROUTES ===
  app.get(api.routes.list.path, async (req, res) => {
    const routes = await storage.getRoutes();
    res.json(routes);
  });

  app.post(api.routes.create.path, async (req, res) => {
    try {
      const body = api.routes.create.input.parse(req.body);
      const route = await storage.createRoute(body);
      res.status(201).json(route);
    } catch (e) {
      res.status(400).json({ message: "Bad Request" });
    }
  });

  // === CUSTOMERS ===
  app.get(api.customers.list.path, async (req, res) => {
    const routeId = req.query.routeId ? parseInt(req.query.routeId as string) : undefined;
    const customers = await storage.getCustomers(routeId);
    res.json(customers);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const body = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(body);
      res.status(201).json(customer);
    } catch (e) {
      res.status(400).json({ message: "Bad Request" });
    }
  });

  app.post(api.customers.payCredit.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.payCustomerCredit(id);
      res.json({ success: true });
    } catch (e) {
      if (e instanceof Error && e.message === "Customer not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.patch(api.customers.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(id, body);
      res.json(customer);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: e.errors[0].message });
      } else if (e instanceof Error && e.message === "Customer not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  // === OFFERS ===
  app.get(api.offers.list.path, async (req, res) => {
    const offers = await storage.getOffers();
    res.json(offers);
  });

  app.post(api.offers.create.path, async (req, res) => {
    try {
      const body = api.offers.create.input.parse(req.body);
      const offer = await storage.createOffer(body);
      res.status(201).json(offer);
    } catch (e) {
      res.status(400).json({ message: "Bad Request" });
    }
  });

  // === ORDERS ===
  app.get(api.orders.list.path, async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post(api.orders.checkout.path, async (req, res) => {
    try {
      const body = api.orders.checkout.input.parse(req.body);
      const order = await storage.checkout(body);
      res.status(201).json(order);
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  // === EXPENSES ===
  app.get(api.expenses.list.path, async (req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const body = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(body);
      res.status(201).json(expense);
    } catch (e) {
      res.status(400).json({ message: "Bad Request" });
    }
  });

  // Optional: Add seed script execution on startup for a nicer initial experience
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    const p1 = await storage.createProduct({ name: "Pepsi 2.25L", price: 100, imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e", category: "2_25_ltr" });
    const p2 = await storage.createProduct({ name: "7UP 2.25L", price: 95, imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97", category: "2_25_ltr" });
    const p3 = await storage.createProduct({ name: "Aquafina 1L", price: 20, imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4c", category: "1_ltr" });

    await storage.addGodownStock(p1.id, 120);
    await storage.addGodownStock(p2.id, 80);
    await storage.addGodownStock(p3.id, 150);

    const r1 = await storage.createRoute({ name: "Route A - North City" });
    const r2 = await storage.createRoute({ name: "Route B - South Market" });

    await storage.createCustomer({ name: "Sai Stores", phone: "9876543210", routeId: r1.id, address: "12 Main Street", creditBalance: 0 });
    await storage.createCustomer({ name: "Ganesh Traders", phone: "8765432109", routeId: r1.id, address: "45 Market Road", creditBalance: 1500 });
    await storage.createCustomer({ name: "Krishna Bakery", phone: "7654321098", routeId: r2.id, address: "88 Bakery Lane", creditBalance: 0 });

    const t1 = await storage.createTruck({ vehicleNumber: "KA19 AB 1234", driverName: "Ramesh" });

    await storage.createOffer({
      name: "Buy 1 Pepsi Case Get 2 Aquafina Free",
      buyProductId: p1.id,
      buyQuantity: 1,
      freeProductId: p3.id,
      freeQuantity: 2,
      isActive: true
    });
  }
}
