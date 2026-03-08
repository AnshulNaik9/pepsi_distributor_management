import { useState } from "react";
import { useProducts, useCreateProduct } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: "", price: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct({
      name: formData.name,
      price: parseInt(formData.price),
    }, {
      onSuccess: () => {
        toast({ title: "Product created successfully" });
        setOpen(false);
        setFormData({ name: "", price: "" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage master product catalog.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Product Name</label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g. Cola 500ml Case"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Price per Case (₹)</label>
                <Input 
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  required
                  placeholder="e.g. 240"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full rounded-xl mt-2 h-12 text-base">
                {isPending ? "Saving..." : "Save Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/50 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <Card key={product.id} className="p-5 border border-border/40 shadow-sm hover:shadow-lg transition-all hover:border-primary/20 rounded-2xl group">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">₹{product.price}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per Case</div>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground leading-tight">{product.name}</h3>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
