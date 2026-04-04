import { db, sqlite } from "./server/db.js";
import { godownStock, truckStock } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

try {
  const req = { truckId: 1, items: [{ productId: 10, quantity: 1 }] };

  db.transaction((tx) => {
    for (const item of req.items) {
      const gStock = tx.select().from(godownStock).where(eq(godownStock.productId, item.productId)).all();
      if (gStock.length === 0 || gStock[0].casesAvailable < item.quantity) {
        throw new Error(`Not enough stock in godown for product ${item.productId}`);
      }

      tx.update(godownStock)
        .set({ casesAvailable: sql`${godownStock.casesAvailable} - ${item.quantity}` })
        .where(eq(godownStock.productId, item.productId)).run();

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

  console.log("Success with sync transaction!");
} catch (e) {
  console.log("Error:", e);
}
