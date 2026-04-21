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

  // === INVENTORY ===
  app.post(api.inventory.damage.path, async (req, res) => {
    try {
      const body = api.inventory.damage.input.parse(req.body);
      await storage.reportDamage(body);
      res.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: e.errors[0].message });
      } else {
        res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
      }
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

  app.delete(api.trucks.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteTruck(id);
      res.json({ success: true, ...result });
    } catch (e) {
      if (e instanceof Error && e.message === "Truck not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: e instanceof Error ? e.message : "Internal Error" });
      }
    }
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

  app.delete(api.routes.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRoute(id);
      res.status(204).end();
    } catch (e) {
      if (e instanceof Error && e.message === "Route not found") {
        res.status(404).json({ message: e.message });
      } else if (e instanceof Error && e.message.includes("Cannot delete")) {
        res.status(400).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
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

  app.delete(api.customers.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id);
      res.status(204).end();
    } catch (e) {
      if (e instanceof Error && e.message === "Customer not found") {
        res.status(404).json({ message: e.message });
      } else {
        res.status(500).json({ message: "Internal Error" });
      }
    }
  });

  app.get(api.customers.orders.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const orders = await storage.getCustomerOrders(id);
      res.json(orders);
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post(api.customers.resetMonthly.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.resetCustomerMonthlyData(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
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

  app.patch(api.orders.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = api.orders.update.input.parse(req.body);
      const order = await storage.updateOrder(id, body);
      res.status(200).json(order);
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  app.delete(api.orders.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOrder(id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
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

  // === REPORTS ===
  app.get("/api/admin/export-report", async (req, res) => {
    try {
      const { filterMode, fromDate, toDate, selectedDate } = req.query as any;

      const orders = await storage.getOrders();
      const expenses = await storage.getExpenses();

      const filterByDate = (date: any) => {
        const d = new Date(date);
        if (filterMode === "all") return true;
        
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

        if (filterMode === "today") return d >= todayStart && d <= todayEnd;
        if (filterMode === "yesterday") {
          const yest = new Date(); yest.setDate(yest.getDate() - 1);
          const s = new Date(yest); s.setHours(0,0,0,0);
          const e = new Date(yest); e.setHours(23,59,59,999);
          return d >= s && d <= e;
        }
        if (filterMode === "selectedDate" && selectedDate) {
          const s = new Date(selectedDate); s.setHours(0,0,0,0);
          const e = new Date(selectedDate); e.setHours(23,59,59,999);
          return d >= s && d <= e;
        }
        if (fromDate) {
           const s = new Date(fromDate); s.setHours(0,0,0,0);
           if (d < s) return false;
        }
        if (toDate) {
           const e = new Date(toDate); e.setHours(23,59,59,999);
           if (d > e) return false;
        }
        return true;
      };

      const filteredOrders = orders.filter(o => filterByDate(o.date));
      const filteredExpenses = expenses.filter(e => filterByDate(e.date));

      if (filteredOrders.length === 0 && filteredExpenses.length === 0) {
        return res.status(200).send("No data found for the selected filter.");
      }

      let csv = "\uFEFFSALES / INVOICES\n";
      csv += "Order ID,Date,Customer Name,Payment Mode,Total Amount,Items\n";

      for (const o of filteredOrders) {
        const itemsStr = (o.items || []).map(item => {
          const qty = item.isFree ? `${item.quantity} (FREE)` : `${item.quantity} cs`;
          return `${item.product?.name || 'Product'} x ${qty}`;
        }).join(" | ");
        
        const row = [
          o.id,
          new Date(o.date as any).toLocaleString(),
          `"${(o.customer?.name || o.customerName || '').replace(/"/g, '""')}"`,
          `"${o.paymentMode.replace(/"/g, '""')}"`,
          o.totalAmount,
          `"${itemsStr.replace(/"/g, '""')}"`
        ];
        csv += row.join(",") + "\n";
      }

      csv += "\n\nEXPENSES\nDate,Description,Amount\n";
      for (const e of filteredExpenses) {
        const row = [
          new Date(e.date as any).toLocaleString(),
          `"${e.description.replace(/"/g, '""')}"`,
          e.amount
        ];
        csv += row.join(",") + "\n";
      }

      const totalSales = filteredOrders.reduce((s,o) => s + o.totalAmount, 0);
      const totalExp = filteredExpenses.reduce((s,e) => s + e.amount, 0);
      csv += `\nSUMMARY\nTotal Sales,,,,,${totalSales}\nTotal Expenses,,,,,${totalExp}\nNet Profit,,,,,${totalSales - totalExp}\n`;

      res.attachment(`delivery-report-${filterMode}.csv`);
      res.status(200).send(csv);
    } catch (e) {
      res.status(500).send("Export failed. Please check your date filter.");
    }
  });

  app.get("/api/admin/export-word", async (req, res) => {
    try {
      const { filterMode, fromDate, toDate, selectedDate } = req.query as any;
      const orders = await storage.getOrders();
      const expenses = await storage.getExpenses();

      const filterByDate = (date: any) => {
        const d = new Date(date);
        if (filterMode === "all") return true;
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        if (filterMode === "today") return d >= todayStart && d <= todayEnd;
        if (filterMode === "yesterday") {
          const yest = new Date(); yest.setDate(yest.getDate() - 1);
          const s = new Date(yest); s.setHours(0,0,0,0);
          const e = new Date(yest); e.setHours(23,59,59,999);
          return d >= s && d <= e;
        }
        if (filterMode === "selectedDate" && selectedDate) {
          const s = new Date(selectedDate); s.setHours(0,0,0,0);
          const e = new Date(selectedDate); e.setHours(23,59,59,999);
          return d >= s && d <= e;
        }
        if (fromDate) {
           const s = new Date(fromDate); s.setHours(0,0,0,0);
           if (d < s) return false;
        }
        if (toDate) {
           const e = new Date(toDate); e.setHours(23,59,59,999);
           if (d > e) return false;
        }
        return true;
      };

      const fo = orders.filter(o => filterByDate(o.date));
      const fe = expenses.filter(e => filterByDate(e.date));

      const totalSales = fo.reduce((s,o) => s + o.totalAmount, 0);
      const totalExp = fe.reduce((s,e) => s + e.amount, 0);

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><style>
          body { font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10pt; }
          th { background-color: #f4f4f4; }
          .summary { font-weight: bold; background-color: #f9f9f9; }
        </style></head>
        <body>
          <h1 style="text-align:center">Delivery Report</h1>
          <p>Filter: ${filterMode} | Date: ${new Date().toLocaleDateString()}</p>
          
          <h3>SALES / INVOICES</h3>
          <table>
            <tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Mode</th><th>Amount</th><th>Items</th></tr>
            ${fo.map(o => `<tr>
              <td>${o.id}</td><td>${new Date(o.date as any).toLocaleString()}</td>
              <td>${o.customer?.name || o.customerName}</td><td>${o.paymentMode}</td>
              <td>${o.totalAmount}</td>
              <td>${(o.items || []).map(i => `${i.product?.name} x ${i.quantity}${i.isFree ? '(F)' : ''}`).join(', ')}</td>
            </tr>`).join('')}
          </table>

          <h3>EXPENSES</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${fe.map(e => `<tr><td>${new Date(e.date as any).toLocaleString()}</td><td>${e.description}</td><td>${e.amount}</td></tr>`).join('')}
          </table>

          <h3>SUMMARY</h3>
          <table>
            <tr class="summary"><td>Total Sales</td><td>${totalSales}</td></tr>
            <tr class="summary"><td>Total Expenses</td><td>${totalExp}</td></tr>
            <tr class="summary" style="background-color:#e6f3ff"><td>Net Profit</td><td>${totalSales - totalExp}</td></tr>
          </table>
        </body>
        </html>
      `;

      res.attachment(`delivery-report-${filterMode}.doc`);
      res.status(200).send(html);
    } catch (e) {
      res.status(500).send("Word export failed.");
    }
  });

  app.get(api.reports.monthlyCSV.path, async (req, res) => {
    try {
      const month = (req.query.month as string) || getCurrentMonth();
      const allOrders = await storage.getOrders();
      const allProducts = await storage.getProducts();
      const allCustomers = await storage.getCustomers();
      const allRoutes = await storage.getRoutes();

      // Filter orders for the requested month
      const monthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.date as any);
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === month;
      });

      // Sheet 1: Monthly metrics
      const totalRevenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalOrders = monthOrders.length;
      const uniqueCustomerIds = new Set(monthOrders.map(o => o.customerId));

      // Product breakdown
      const productSales = new Map<number, { name: string; casesSold: number; revenue: number }>();
      monthOrders.forEach(order => {
        order.items?.forEach(item => {
          if (!item.isFree) {
            const existing = productSales.get(item.productId) || {
              name: item.product?.name || `Product #${item.productId}`,
              casesSold: 0,
              revenue: 0,
            };
            existing.casesSold += item.quantity;
            existing.revenue += item.quantity * (item.product?.price || 0);
            productSales.set(item.productId, existing);
          }
        });
      });

      let csv = `MONTHLY REPORT - ${month}\n\n`;
      csv += `SUMMARY\n`;
      csv += `Total Revenue,₹${totalRevenue}\n`;
      csv += `Total Orders,${totalOrders}\n`;
      csv += `Unique Customers,${uniqueCustomerIds.size}\n`;
      csv += `Products Sold,${productSales.size}\n`;
      csv += `Total Routes,${allRoutes.length}\n\n`;

      csv += `PRODUCT BREAKDOWN\n`;
      csv += `Product Name,Cases Sold,Revenue\n`;
      productSales.forEach((data) => {
        csv += `${data.name},${data.casesSold},₹${data.revenue}\n`;
      });

      csv += `\n---\n\n`;
      csv += `CUSTOMER PURCHASES\n`;
      csv += `Customer Name,Phone,Address,Route,Total Purchases,Order Count\n`;

      for (const customerId of Array.from(uniqueCustomerIds)) {
        const customer = allCustomers.find(c => c.id === customerId);
        if (!customer) continue;
        const route = allRoutes.find(r => r.id === customer.routeId);
        const customerOrders = monthOrders.filter(o => o.customerId === customerId);
        const totalPurchases = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        csv += `"${customer.name}","${customer.phone}","${customer.address}","${route?.name || 'Unknown'}",₹${totalPurchases},${customerOrders.length}\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}.csv"`);
      res.send(csv);
    } catch (e) {
      res.status(500).json({ message: e instanceof Error ? e.message : "Internal Error" });
    }
  });

  // === ADMIN: MONTHLY MANAGEMENT ===
  app.post(api.admin.monthlyReset.path, async (req, res) => {
    try {
      const month = (req.body.month as string) || getCurrentMonth();
      const snapshots = await storage.createMonthlySnapshot(month);
      res.json({ success: true, month, snapshotsCreated: snapshots.length });
    } catch (e) {
      res.status(400).json({ message: e instanceof Error ? e.message : "Bad Request" });
    }
  });

  app.get(api.admin.monthlyHistory.path, async (req, res) => {
    try {
      const month = req.query.month as string;
      if (!month) {
        res.status(400).json({ message: "month query parameter is required (e.g. 2026-04)" });
        return;
      }
      const history = await storage.getMonthlyHistory(month);
      res.json(history);
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get(api.admin.availableMonths.path, async (req, res) => {
    try {
      const months = await storage.getAvailableMonths();
      res.json(months);
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // NOTE: Keep both api-based and literal path registrations.
  // Some dev builds can serve index.html for new API paths if registration fails to execute.
  app.get(api.admin.deletedOrders.path, async (_req, res) => {
    try {
      const deletedOrders = await storage.getDeletedOrderHistory();
      res.json(deletedOrders);
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/admin/deleted-orders", async (_req, res) => {
    try {
      const deletedOrders = await storage.getDeletedOrderHistory();
      res.json(deletedOrders);
    } catch (e) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Optional: Add seed script execution on startup for a nicer initial experience
  await seedDatabase();

  return httpServer;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    const p1 = await storage.createProduct({ name: "Pepsi 2.25L", price: 100, imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e", category: "2_25_ltr" });
    const p2 = await storage.createProduct({ name: "7UP 2.25L", price: 95, imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97", category: "2_25_ltr" });
    const p3 = await storage.createProduct({ name: "Aquafina 1L", price: 20, imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4c", category: "1_ltr" });
    const p4 = await storage.createProduct({ name: "Miranda 750ml", price: 40, imageUrl: "https://images.unsplash.com/photo-1625772290748-390911df2d7c", category: "750_ml" });

    await storage.addGodownStock(p1.id, 120);
    await storage.addGodownStock(p2.id, 80);
    await storage.addGodownStock(p3.id, 250);
    await storage.addGodownStock(p4.id, 100);

    const r1 = await storage.createRoute({ name: "Route A - North City" });
    const r2 = await storage.createRoute({ name: "Route B - South Market" });

    await storage.createCustomer({ name: "Sai Stores", phone: "9876543210", routeId: r1.id, address: "12 Main Street", creditBalance: 0, hasSpecialDiscount: true });
    await storage.createCustomer({ name: "Ganesh Traders", phone: "8765432109", routeId: r1.id, address: "45 Market Road", creditBalance: 1500 });
    await storage.createCustomer({ name: "Krishna Bakery", phone: "7654321098", routeId: r2.id, address: "88 Bakery Lane", creditBalance: 0 });

    const t1 = await storage.createTruck({ vehicleNumber: "KA19 AB 1234", driverName: "Ramesh" });

    // Standard Offer: Buy 1 2.25L or 750ml Get 2 Aquafina 1L Free
    const promoProducts = [p1, p2, p3, p4].filter(p => {
      const name = p.name.toLowerCase();
      const isPromoSize = name.includes("2.25") || name.includes("750") || p.category === "2_25_ltr" || p.category === "750_ml";
      const isExcluded = (name.includes("soda") && name.includes("2.25")) || (name.includes("lehar") && name.includes("soda") && name.includes("750"));
      return isPromoSize && !isExcluded;
    });

    for (const buyProc of promoProducts) {
      await storage.createOffer({
        name: `Buy 1 ${buyProc.name} Get 2 Aquafina Free`,
        buyProductId: buyProc.id,
        buyQuantity: 1,
        freeProductId: p3.id,
        freeQuantity: 2,
        isActive: true
      });
    }
  }
}

