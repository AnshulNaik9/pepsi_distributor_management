import { useState } from "react";
import { useTrucks, useCreateTruck, useLoadTruck, useTruckStock, useReturnStock } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, ArrowRight, Minus, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TrucksPage() {
  const { data: trucks = [] } = useTrucks();
  const { mutate: createTruck, isPending: creating } = useCreateTruck();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({ vehicleNumber: "", driverName: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTruck(formData, {
      onSuccess: () => {
        toast({ title: "Truck added successfully" });
        setOpen(false);
        setFormData({ vehicleNumber: "", driverName: "" });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Trucks & Loading</h1>
          <p className="text-muted-foreground mt-1">Manage vehicles and load stock from Godown into trucks.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add Truck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>New Truck</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Vehicle Number</label>
                <Input required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="KA-01-AB-1234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Driver Name</label>
                <Input required value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} placeholder="Ramesh" />
              </div>
              <Button type="submit" disabled={creating} className="w-full h-12 rounded-xl">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trucks.map(truck => (
          <TruckCard key={truck.id} truck={truck} />
        ))}
        {trucks.length === 0 && (
          <div className="col-span-2 text-center py-16 text-muted-foreground bg-white rounded-2xl border border-dashed border-border">
            No trucks added yet. Click "Add Truck" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function TruckCard({ truck }: { truck: { id: number; vehicleNumber: string; driverName: string } }) {
  const { data: truckStock = [] } = useTruckStock(truck.id);
  const totalCases = truckStock.reduce((sum, s) => sum + s.casesAvailable, 0);

  return (
    <Card className="overflow-hidden border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="bg-slate-100 p-4 border-b border-border/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{truck.vehicleNumber}</h3>
            <p className="text-sm text-muted-foreground">Driver: {truck.driverName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UnloadTruckDialog truckId={truck.id} vehicleNumber={truck.vehicleNumber} />
          <LoadTruckDialog truckId={truck.id} vehicleNumber={truck.vehicleNumber} />
        </div>
      </div>
      <div className="p-4 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Package className="w-4 h-4" />
          <span>Current Load</span>
        </div>
        <div className="font-bold text-lg text-slate-700">
          {totalCases} <span className="text-xs font-normal text-muted-foreground">cases</span>
        </div>
      </div>
    </Card>
  );
}

function LoadTruckDialog({ truckId, vehicleNumber }: { truckId: number, vehicleNumber: string }) {
  const [open, setOpen] = useState(false);
  const { data: godownStock = [] } = useGodownStock();
  const { data: products = [] } = useProducts();
  const { mutate: loadTruck, isPending } = useLoadTruck();
  const { toast } = useToast();

  const [loadItems, setLoadItems] = useState<Record<number, number>>({});

  const setQty = (productId: number, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, value));
    setLoadItems(prev => {
      if (clamped === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: clamped };
    });
  };

  const handleSubmit = () => {
    const items = Object.entries(loadItems).map(([id, qty]) => ({
      productId: parseInt(id),
      quantity: qty
    }));

    if (items.length === 0) return toast({ title: "No items selected", variant: "destructive" });

    loadTruck({ truckId, items }, {
      onSuccess: () => {
        toast({ title: "✅ Truck loaded successfully!" });
        setOpen(false);
        setLoadItems({});
      },
      onError: (err: any) => {
        toast({ 
          title: "Not enough stock", 
          description: err?.message || "Insufficient stock in Godown.", 
          variant: "destructive" 
        });
      }
    });
  };

  const totalSelected = Object.values(loadItems).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLoadItems({}); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">
          Load Van <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Load Van: {vehicleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground font-medium bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
            Select how many cases of each product to transfer from Godown into this truck.
          </p>

          {products.map(product => {
            const stockEntry = godownStock.find(s => s.productId === product.id);
            const available = stockEntry?.casesAvailable ?? 0;
            const selected = loadItems[product.id] ?? 0;
            const outOfStock = available === 0;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-xl border transition-colors ${
                  outOfStock
                    ? "bg-slate-50 border-border/30 opacity-60"
                    : selected > 0
                    ? "bg-primary/5 border-primary/30"
                    : "bg-white border-border/50 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      {outOfStock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> No Godown Stock
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Godown: {available} cases
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  {outOfStock ? (
                    <div className="text-xs text-muted-foreground italic self-center">–</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, selected - 1, available)}
                        disabled={selected === 0}
                        className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all text-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <Input
                        type="number"
                        min={0}
                        max={available}
                        value={selected === 0 ? "" : selected}
                        onChange={e => setQty(product.id, parseInt(e.target.value) || 0, available)}
                        placeholder="0"
                        className="w-16 h-9 text-center font-bold rounded-lg border-border/50 text-base p-0"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(product.id, selected + 1, available)}
                        disabled={selected >= available}
                        className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No products found. Add products first.</p>
          )}
        </div>

        <div className="pt-5 mt-2 border-t border-border/50">
          <Button
            onClick={handleSubmit}
            disabled={isPending || totalSelected === 0}
            className="w-full h-13 text-base rounded-xl shadow-lg shadow-primary/20"
          >
            {isPending
              ? "Loading..."
              : totalSelected > 0
              ? `Confirm Load — ${totalSelected} cases`
              : "Select items to load"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UnloadTruckDialog({ truckId, vehicleNumber }: { truckId: number, vehicleNumber: string }) {
  const [open, setOpen] = useState(false);
  const { data: truckStock = [] } = useTruckStock(truckId);
  const { mutate: returnStock, isPending } = useReturnStock();
  const { toast } = useToast();

  const [returnItems, setReturnItems] = useState<Record<number, number>>({});

  const setQty = (productId: number, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, value));
    setReturnItems(prev => {
      if (clamped === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: clamped };
    });
  };

  const handleEmptyAll = () => {
    const allItems: Record<number, number> = {};
    truckStock.forEach(stockEntry => {
      if (stockEntry.product && stockEntry.casesAvailable > 0) {
        allItems[stockEntry.product.id] = stockEntry.casesAvailable;
      }
    });
    setReturnItems(allItems);
  };

  const handleSubmit = () => {
    const items = Object.entries(returnItems).map(([id, qty]) => ({
      productId: parseInt(id),
      quantity: qty
    }));

    if (items.length === 0) return toast({ title: "No items selected", variant: "destructive" });

    returnStock({ truckId, items }, {
      onSuccess: () => {
        toast({ title: "✅ Stock returned to godown!" });
        setOpen(false);
        setReturnItems({});
      },
      onError: (err: any) => {
        toast({ 
          title: "Return failed", 
          description: err?.message || "Failed to return stock to Godown.", 
          variant: "destructive" 
        });
      }
    });
  };

  const totalSelected = Object.values(returnItems).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReturnItems({}); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-border/50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <Minus className="w-4 h-4 mr-2" /> Unload Van
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Unload Van: {vehicleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
            <p className="text-sm font-medium text-blue-800">
              Select how many cases to return to Godown.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleEmptyAll} className="h-8 text-xs bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200 rounded-lg shadow-sm">
              Unload All
            </Button>
          </div>

          {truckStock.map(stockEntry => {
            const product = stockEntry.product;
            if (!product) return null; // Should not happen

            const available = stockEntry.casesAvailable;
            const selected = returnItems[product.id] ?? 0;
            const outOfStock = available === 0;

            if (outOfStock) return null; // Only show items currently in van

            return (
              <div
                key={product.id}
                className={`p-4 rounded-xl border transition-colors ${
                  selected > 0
                    ? "bg-primary/5 border-primary/30"
                    : "bg-white border-border/50 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        In Van: {available} cases
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(product.id, selected - 1, available)}
                      disabled={selected === 0}
                      className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 active:scale-95 transition-all text-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <Input
                      type="number"
                      min={0}
                      max={available}
                      value={selected === 0 ? "" : selected}
                      onChange={e => setQty(product.id, parseInt(e.target.value) || 0, available)}
                      placeholder="0"
                      className="w-16 h-9 text-center font-bold rounded-lg border-border/50 text-base p-0"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(product.id, selected + 1, available)}
                      disabled={selected >= available}
                      className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {truckStock.every(s => s.casesAvailable === 0) && (
            <p className="text-center text-muted-foreground py-8">Van is currently empty.</p>
          )}
        </div>

        <div className="pt-5 mt-2 border-t border-border/50">
          <Button
            onClick={handleSubmit}
            disabled={isPending || totalSelected === 0}
            className="w-full h-13 text-base rounded-xl shadow-lg shadow-primary/20"
          >
            {isPending
              ? "Returning Stock..."
              : totalSelected > 0
              ? `Confirm Return — ${totalSelected} cases`
              : "Select items to return"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
