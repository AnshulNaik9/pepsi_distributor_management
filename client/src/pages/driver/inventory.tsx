import { useTruckStock } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Package, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

const categoryOrder: Record<string, number> = {
  "2_25_ltr": 0,
  "1_ltr": 1,
  "750_ml": 2,
  "400_ml": 3,
  "others": 4,
};

const categoryLabel: Record<string, string> = {
  "2_25_ltr": "2.25 Ltr",
  "750_ml": "750 ml",
  "1_ltr": "1 Ltr",
  "400_ml": "400 ml",
  "others": "Others",
};

export default function TruckInventoryPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();
  const { data: godownStock = [] } = useGodownStock();

  const allAvailableItems = products.map(p => {
    const truckEntry = stock.find(s => s.productId === p.id);
    const godownEntry = godownStock.find(g => g.productId === p.id);
    const truckQty = truckEntry?.casesAvailable ?? 0;
    const godownQty = godownEntry?.casesAvailable ?? 0;
    const totalQty = truckQty + godownQty;
    if (totalQty === 0) return null;
    return { p, truckQty, godownQty, totalQty };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => (categoryOrder[a.p.category] ?? 99) - (categoryOrder[b.p.category] ?? 99));

  const totalCases = allAvailableItems.reduce((sum, s) => sum + s.totalQty, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Back button */}
      <Link href="/driver/billing">
        <button className="flex items-center gap-1 text-sm font-semibold text-primary px-1">
          <ChevronLeft className="w-4 h-4" /> Back to Billing
        </button>
      </Link>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-display font-bold">Route Inventory</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Total availability from Truck & Godown</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-3xl border border-border/50 shadow-sm text-center">
        <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-4xl font-black text-foreground">{totalCases}</h2>
        <p className="text-muted-foreground font-bold mt-1 uppercase tracking-wider text-xs">Total Available Cases</p>
      </div>

      {/* Detailed list */}
      <div className="space-y-3 pb-8">
        <h3 className="font-bold px-2 text-slate-700 uppercase text-[10px] tracking-widest">Product Breakdown</h3>
        {allAvailableItems.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">No inventory available. Load stock from admin.</p>
        )}
        {(() => {
          let lastCategory: string | null = null;
          return allAvailableItems.map(({ p, truckQty, godownQty, totalQty }) => {
            const showHeader = p.category !== lastCategory;
            if (p.category) lastCategory = p.category;

            return (
              <div key={p.id}>
                {showHeader && (
                  <div className="flex items-center gap-3 mb-2 mt-3 first:mt-0">
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                      {categoryLabel[p.category] ?? p.category}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}
                <Card className="p-4 rounded-2xl border-border/50 shadow-sm bg-white">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-lg leading-tight truncate">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          truckQty > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'
                        }`}>🚛 Truck: {truckQty}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          godownQty > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400 bg-slate-100'
                        }`}>🏭 Godown: {godownQty}</span>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 rounded-2xl font-black text-xl bg-slate-900 text-white shadow-lg shrink-0">
                      {totalQty} <span className="text-[10px] font-bold text-slate-400 ml-0.5 uppercase">cs</span>
                    </div>
                  </div>
                </Card>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

