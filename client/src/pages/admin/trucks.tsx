import { useState } from "react";
import { useTrucks, useCreateTruck, useLoadTruck, useTruckStock, useReturnStock, useDeleteTruck } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Truck, Plus, ArrowRight, Minus, Package, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils";

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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight text-slate-800">
            Logistics & Fleet
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
            Manage your delivery vehicles and synchronize stock loading
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-lg font-black transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> CREATE NEW VAN
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Register Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Vehicle Number</label>
                <Input required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="KA-01-AB-1234" className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Assigned Driver</label>
                <Input required value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} placeholder="Enter name..." className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-slate-100" />
              </div>
              <Button type="submit" disabled={creating} className="w-full h-16 rounded-2xl text-xl font-black shadow-lg">Save Van Record</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {trucks.map(truck => (
          <TruckCard key={truck.id} truck={truck} />
        ))}
        {trucks.length === 0 && (
          <div className="col-span-full text-center py-24 text-muted-foreground bg-white rounded-[3rem] border-4 border-dashed border-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
               <Truck className="w-10 h-10" />
            </div>
            <div>
               <p className="font-black text-slate-300 uppercase tracking-widest">No Active Fleet Detected</p>
               <p className="text-sm font-medium opacity-50">Register a vehicle to start loading stock</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TruckCard({ truck }: { truck: { id: number; vehicleNumber: string; driverName: string } }) {
  const { data: truckStock = [] } = useTruckStock(truck.id);
  const { mutate: deleteTruck, isPending: isDeleting } = useDeleteTruck();
  const { toast } = useToast();
  const totalCases = truckStock.reduce((sum, s) => sum + s.casesAvailable, 0);

  const handleDelete = () => {
    deleteTruck(truck.id, {
      onSuccess: (result: any) => {
        const reassigned = result?.reassignedItems?.length || 0;
        toast({ 
          title: `Van "${truck.vehicleNumber}" deleted`,
          description: reassigned > 0 
            ? `${result.reassignedItems.reduce((s: number, i: any) => s + i.quantity, 0)} cases returned to godown.`
            : "No load to reassign.",
        });
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to delete truck", 
          description: err?.message, 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <Card className="group relative overflow-hidden border-border/50 rounded-[2.5rem] bg-white shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
         <Truck className="w-24 h-24 text-primary" />
      </div>
      
      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner group-hover:bg-primary group-hover:text-white transition-colors duration-500">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">{truck.vehicleNumber}</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                 <User className="w-3 h-3" /> {truck.driverName}
              </div>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                disabled={isDeleting}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] p-8">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black tracking-tight">Decommission Van?</AlertDialogTitle>
                <AlertDialogDescription className="text-base font-medium">
                  {totalCases > 0 ? (
                    <>
                      This vehicle "{truck.vehicleNumber}" has <span className="text-slate-900 font-black">{Math.round(totalCases)} cases</span> loaded. 
                      They will be <span className="text-emerald-600 font-black">reassigned to godown stock</span> automatically.
                    </>
                  ) : (
                    `Proceed to remove "${truck.vehicleNumber}" from your fleet database. This cannot be undone.`
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel className="h-14 rounded-2xl border-2 font-black">Hold On</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="h-14 bg-red-500 text-white hover:bg-red-600 rounded-2xl font-black px-8"
                >
                  {totalCases > 0 ? "Empty & Delete" : "Confirm Deletion"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="bg-slate-50 rounded-3xl p-6 flex items-center justify-between border border-slate-100 mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payload Status</span>
            <div className="flex items-center gap-2 mt-1">
               <Package className="w-4 h-4 text-primary" />
               <span className="text-xl font-black text-slate-700 tracking-tighter">{Math.round(totalCases)}<span className="text-sm opacity-50 ml-1">Cases Onboard</span></span>
            </div>
          </div>
          <div className="w-1.5 h-12 bg-slate-200 rounded-full overflow-hidden">
             <div className="bg-primary w-full transition-all duration-1000" style={{ height: `${Math.min(100, (totalCases / 500) * 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <UnloadTruckDialog truckId={truck.id} vehicleNumber={truck.vehicleNumber} />
          <LoadTruckDialog truckId={truck.id} vehicleNumber={truck.vehicleNumber} />
        </div>
      </div>
    </Card>
  );
}

// Need User icon
import { User } from "lucide-react";

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

          {["2_25_ltr", "1_ltr", "750_ml", "400_ml", "others"].map(cat => {
            const categoryProducts = products.filter(p => (p.category || "others") === cat).sort((a, b) => {
              const aStock = godownStock.find(s => s.productId === a.id)?.casesAvailable ?? 0;
              const bStock = godownStock.find(s => s.productId === b.id)?.casesAvailable ?? 0;
              if (aStock > 0 && bStock === 0) return -1;
              if (aStock === 0 && bStock > 0) return 1;
              return a.name.localeCompare(b.name);
            });
            
            if (categoryProducts.length === 0) return null;
            
            const catLabel = cat === "2_25_ltr" ? "2.25 Ltr" : cat === "1_ltr" ? "1 Ltr" : cat === "750_ml" ? "750 ml" : cat === "400_ml" ? "400 ml" : "Others";
            
            return (
              <div key={cat} className="space-y-3 mb-6">
                <h3 className="font-bold text-xs text-primary uppercase tracking-widest border-b border-primary/20 pb-1.5 px-1">{catLabel}</h3>
                {categoryProducts.map(product => {
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
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground leading-tight">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            {outOfStock ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" /> No Godown Stock
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Godown: {formatQuantity(available * (product.itemsPerCase || 1), product.itemsPerCase || 1)}
                              </span>
                            )}
                          </div>
                        </div>

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
            if (!product) return null;

            const available = stockEntry.casesAvailable;
            const selected = returnItems[product.id] ?? 0;
            const outOfStock = available === 0;

            if (outOfStock) return null;

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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        In Van: {formatQuantity(available * (product.itemsPerCase || 1), product.itemsPerCase || 1)}
                      </span>
                    </div>
                  </div>

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
