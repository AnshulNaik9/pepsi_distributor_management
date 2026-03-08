import { useState } from "react";
import { useTrucks, useCreateTruck, useLoadTruck } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, ArrowRight, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
          <p className="text-muted-foreground mt-1">Manage vehicles and load stock from Godown.</p>
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
          <Card key={truck.id} className="overflow-hidden border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-all">
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
              <LoadTruckDialog truckId={truck.id} vehicleNumber={truck.vehicleNumber} />
            </div>
            <div className="p-4 bg-white text-center text-sm text-muted-foreground py-6">
              Click Load Truck to assign inventory for today's route.
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LoadTruckDialog({ truckId, vehicleNumber }: { truckId: number, vehicleNumber: string }) {
  const [open, setOpen] = useState(false);
  const { data: godownStock = [] } = useGodownStock();
  const { data: products = [] } = useProducts();
  const { mutate: loadTruck, isPending } = useLoadTruck();
  const { toast } = useToast();

  const [loadItems, setLoadItems] = useState<Record<number, number>>({});

  const handleQtyChange = (productId: number, delta: number, max: number) => {
    setLoadItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
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
        toast({ title: "Truck loaded successfully" });
        setOpen(false);
        setLoadItems({});
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">
          Load Truck <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Load Truck: {vehicleNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium">
            Select quantities to transfer from Godown to Truck.
          </div>
          
          <div className="space-y-3">
            {godownStock.filter(s => s.casesAvailable > 0).map(stock => {
              const product = products.find(p => p.id === stock.productId);
              const selectedQty = loadItems[stock.productId] || 0;
              
              if (!product) return null;
              
              return (
                <div key={stock.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-foreground">{product.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">Avail in Godown: <span className="font-bold text-slate-700">{stock.casesAvailable}</span></p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-border/50">
                    <button 
                      type="button"
                      onClick={() => handleQtyChange(product.id, -1, stock.casesAvailable)}
                      className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all text-slate-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{selectedQty}</span>
                    <button 
                      type="button"
                      onClick={() => handleQtyChange(product.id, 1, stock.casesAvailable)}
                      className="w-8 h-8 rounded bg-primary text-white shadow-sm flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 mt-6 border-t border-border/50">
            <Button onClick={handleSubmit} disabled={isPending || Object.keys(loadItems).length === 0} className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/25">
              {isPending ? "Processing Transfer..." : `Confirm Loading (${Object.keys(loadItems).length} items)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
