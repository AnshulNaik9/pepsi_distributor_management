import { useState } from "react";
import { useProducts, useCreateProduct, useGodownStock } from "@/hooks/use-inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: stock = [] } = useGodownStock();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: "", price: "", imageUrl: "" });

  const getStockForProduct = (productId: number) => {
    const stockItem = stock.find(s => s.productId === productId);
    return stockItem?.casesAvailable || 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct({
      name: formData.name,
      price: parseInt(formData.price),
      imageUrl: formData.imageUrl || undefined,
    }, {
      onSuccess: () => {
        toast({ title: "Product created successfully" });
        setOpen(false);
        setFormData({ name: "", price: "", imageUrl: "" });
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
                  placeholder="e.g. Pepsi 2.25L"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                  data-testid="input-product-name"
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
                  data-testid="input-product-price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Image URL (Optional)</label>
                <Input 
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://..."
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                  data-testid="input-product-image"
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full rounded-xl mt-2 h-12 text-base" data-testid="button-save-product">
                {isPending ? "Saving..." : "Save Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i} className="h-72 animate-pulse bg-muted/50 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => {
            const quantity = getStockForProduct(product.id);
            return (
              <Card key={product.id} data-testid={`card-product-${product.id}`} className="overflow-hidden border border-border/40 shadow-sm hover:shadow-lg transition-all hover:border-primary/20 rounded-2xl group flex flex-col h-full">
                {/* Image Section */}
                <div className="relative w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-product-${product.id}`}
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <Package className="w-12 h-12 mb-2" />
                      <span className="text-xs text-center text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-foreground leading-tight mb-3" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
                  
                  <div className="space-y-3 flex-1">
                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary" data-testid={`text-price-${product.id}`}>₹{product.price}</span>
                      <span className="text-sm text-muted-foreground font-medium">per case</span>
                    </div>

                    {/* Stock Status */}
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Stock in Godown</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${quantity > 20 ? 'text-emerald-600' : quantity > 5 ? 'text-amber-600' : 'text-destructive'}`} data-testid={`text-stock-${product.id}`}>
                          {quantity}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">cases</span>
                      </div>
                      {quantity === 0 && (
                        <p className="text-xs text-destructive font-semibold mt-1">Out of stock</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
