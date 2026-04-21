import { useState } from "react";
import { useTruckStock } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Package, ChevronLeft, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { formatQuantity } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();
  const { data: godownStock = [] } = useGodownStock();

  const [damageItem, setDamageItem] = useState<any>(null);
  const [damageQuantity, setDamageQuantity] = useState("");

  const damageMutation = useMutation({
    mutationFn: async (payload: { productId: number, truckId: number, quantity: number }) => {
      const res = await fetch(api.inventory.damage.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to report damage");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trucks.stock.path, truckId] });
      queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] });
      setDamageItem(null);
      setDamageQuantity("");
      toast({ title: "Damage Recorded", description: "Inventory has been successfully updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

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

  let totalFullCases = 0;
  let totalLeftoverBottles = 0;

  allAvailableItems.forEach(s => {
    const itemsPerCase = s.p.itemsPerCase || 1;
    const totalBtls = Math.round(s.totalQty * itemsPerCase);
    totalFullCases += Math.floor(totalBtls / itemsPerCase);
    totalLeftoverBottles += Math.round(totalBtls % itemsPerCase);
  });

  let displayTotal = "0cs";
  if (totalFullCases === 0 && totalLeftoverBottles > 0) {
    displayTotal = `${totalLeftoverBottles}btls`;
  } else if (totalLeftoverBottles === 0) {
    displayTotal = `${totalFullCases}cs`;
  } else {
    displayTotal = `${totalFullCases}cs ${totalLeftoverBottles}btls`;
  }

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
        <h2 className="text-4xl font-black text-foreground">{displayTotal}</h2>
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
                        }`}>🚛 Truck: {formatQuantity(truckQty * (p.itemsPerCase || 1), p.itemsPerCase || 1)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          godownQty > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400 bg-slate-100'
                        }`}>🏭 Godown: {formatQuantity(godownQty * (p.itemsPerCase || 1), p.itemsPerCase || 1)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="px-5 py-2.5 rounded-2xl font-black text-lg bg-slate-900 text-white shadow-lg">
                        {formatQuantity(totalQty * (p.itemsPerCase || 1), p.itemsPerCase || 1)}
                      </div>
                      {truckId !== 0 && truckQty > 0 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs font-bold w-full mt-1"
                          onClick={() => {
                            setDamageItem({ ...p, maxTruckBtls: Math.round(truckQty * (p.itemsPerCase || 1)) });
                            setDamageQuantity("");
                          }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Damage
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          });
        })()}
      </div>

      {damageItem && (
        <Dialog open={!!damageItem} onOpenChange={(open) => !open && setDamageItem(null)}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> Report Damaged Stock
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                {damageItem.name}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="damaged-qty">Number of Damaged Bottles (Max: {damageItem.maxTruckBtls})</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="damaged-qty"
                    type="number" 
                    min="1"
                    max={damageItem.maxTruckBtls}
                    placeholder="e.g. 2"
                    className="h-14 text-lg font-bold rounded-2xl border-slate-200 focus-visible:ring-red-500"
                    value={damageQuantity}
                    onChange={(e) => setDamageQuantity(e.target.value)}
                  />
                  <span className="font-bold text-slate-500 w-16 text-center">btls</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-red-500">
                  This will deduct the specified damaged bottles from your van load permanently.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => setDamageItem(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
                disabled={!damageQuantity || Number(damageQuantity) <= 0 || Number(damageQuantity) > damageItem.maxTruckBtls || damageMutation.isPending}
                onClick={async () => {
                  if (!damageItem || !damageQuantity) return;
                  const qtyCases = Number(damageQuantity) / (damageItem.itemsPerCase || 1);
                  await damageMutation.mutateAsync({
                    productId: damageItem.id,
                    truckId,
                    quantity: qtyCases
                  });
                }}
              >
                {damageMutation.isPending ? "Confirming..." : "Confirm Damage"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

