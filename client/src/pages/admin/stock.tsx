import { useState } from "react";
import { useProducts, useGodownStock, useAddGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PackagePlus, Warehouse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GodownStockPage() {
  const { data: stock = [] } = useGodownStock();
  const { data: products = [] } = useProducts();
  const { mutate: addStock, isPending } = useAddGodownStock();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!productId || !quantity) return;
    
    addStock({ productId: parseInt(productId), quantity: parseInt(quantity) }, {
      onSuccess: () => {
        toast({ title: "Stock updated in Godown" });
        setOpen(false);
        setProductId("");
        setQuantity("");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Godown Stock</h1>
          <p className="text-muted-foreground mt-1">Master inventory storage.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <PackagePlus className="w-4 h-4 mr-2" /> Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Receive Stock at Godown</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Select Product</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Quantity (Cases)</label>
                <Input type="number" required value={quantity} onChange={e => setQuantity(e.target.value)} className="rounded-xl" />
              </div>
              <Button type="submit" disabled={isPending} className="w-full h-12 rounded-xl mt-2">
                Update Stock
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map(product => {
          const s = stock.find(item => item.productId === product.id);
          const cases = s?.casesAvailable || 0;
          return (
            <Card key={product.id} className="p-6 rounded-2xl border-border/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div className="font-bold text-lg">{product.name}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-slate-800">{cases}</div>
                <div className="text-xs font-semibold text-muted-foreground uppercase">Cases</div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
