import { useTruckStock } from "@/hooks/use-logistics";
import { useProducts } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function TruckInventoryPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();

  const totalCases = stock.reduce((sum, s) => sum + s.casesAvailable, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-border/50 shadow-sm text-center">
        <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-foreground">{totalCases}</h2>
        <p className="text-muted-foreground font-medium mt-1">Total Cases in Truck</p>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold px-2 text-slate-700">Detailed Stock</h3>
        {stock.filter(s => s.casesAvailable > 0).map(s => {
          const p = products.find(p => p.id === s.productId);
          return (
            <Card key={s.id} className="p-4 rounded-2xl flex items-center justify-between border-border/50 shadow-sm bg-white">
              <div className="font-bold text-lg">{p?.name}</div>
              <div className="bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-700 text-lg">
                {s.casesAvailable} <span className="text-xs font-normal text-muted-foreground ml-1">cs</span>
              </div>
            </Card>
          )
        })}
        {stock.filter(s => s.casesAvailable > 0).length === 0 && (
          <p className="text-center text-muted-foreground mt-8">No inventory available.</p>
        )}
      </div>
    </div>
  );
}
