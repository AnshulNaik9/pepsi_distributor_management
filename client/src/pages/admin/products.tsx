import { useMemo, useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useGodownStock, useDeleteProduct, useAddGodownStock } from "@/hooks/use-inventory";
import { useCreateOffer } from "@/hooks/use-sales";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Edit, Trash2, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils";
import { productCategoryValues, type Product, type ProductCategory } from "@shared/schema";

const PRODUCT_CATEGORY_OPTIONS: { value: ProductCategory; label: string; sectionTitle: string }[] = [
  { value: "2_25_ltr", label: "2.25 Ltr", sectionTitle: "2.25 Ltr products" },
  { value: "1_ltr", label: "1 Ltr", sectionTitle: "1 Ltr products" },
  { value: "750_ml", label: "750 ml", sectionTitle: "750 ml products" },
  { value: "400_ml", label: "400 ml", sectionTitle: "400 ml products" },
  { value: "others", label: "Others", sectionTitle: "Other products" },
];

function isProductCategory(value: string | null | undefined): value is ProductCategory {
  return !!value && (productCategoryValues as readonly string[]).includes(value);
}

function normalizeCategory(product: Product): ProductCategory {
  const raw =
    typeof product.category === "string" ? product.category.trim() : "";
  return isProductCategory(raw) ? raw : "others";
}

function categoryLabel(cat: ProductCategory) {
  return PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? "Others";
}

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: stock = [] } = useGodownStock();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const { mutate: addStock } = useAddGodownStock();
  const [open, setOpen] = useState(false);
  const { mutate: createOffer } = useCreateOffer();
  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<Product | null>(null);
  const [showPromoPrompt, setShowPromoPrompt] = useState(false);
  const [promoStep, setPromoStep] = useState(1);
  const [aqFreeQty, setAqFreeQty] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    purchasePrice: "",
    imageUrl: "",
    unit: "ltr",
    quantityPerUnit: "1",
    itemsPerCase: "1",
    initialStock: "0",
    category: "others" as ProductCategory,
  });

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    price: "",
    purchasePrice: "",
    imageUrl: "",
    unit: "ltr",
    quantityPerUnit: "1",
    itemsPerCase: "1",
    category: "others" as ProductCategory,
    addStockQty: "0",
  });


  const getStockForProduct = (productId: number) => {
    const stockItem = stock.find((s) => s.productId === productId);
    return stockItem?.casesAvailable || 0;
  };

  const productsByCategory = useMemo(() => {
    const buckets = new Map<ProductCategory, Product[]>();
    for (const opt of PRODUCT_CATEGORY_OPTIONS) buckets.set(opt.value, []);
    for (const p of products) {
      const cat = normalizeCategory(p);
      buckets.get(cat)!.push(p);
    }
    return PRODUCT_CATEGORY_OPTIONS.map(({ value, sectionTitle }) => ({
      category: value,
      sectionTitle,
      items: buckets.get(value)!,
    }));
  }, [products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const price = parseInt(formData.price, 10);
    const purchasePrice = parseInt(formData.purchasePrice, 10) || 0;
    const itemsPerCase = parseInt(formData.itemsPerCase, 10);
    const stockQty = parseInt(formData.initialStock, 10);

    if (isNaN(price)) return toast({ title: "Error", description: "Invalid selling price", variant: "destructive" });
    if (isNaN(itemsPerCase)) return toast({ title: "Error", description: "Invalid items per case", variant: "destructive" });

    createProduct(
      {
        name: formData.name,
        price,
        purchasePrice,
        imageUrl: formData.imageUrl || undefined,
        unit: formData.unit,
        quantityPerUnit: formData.quantityPerUnit,
        itemsPerCase,
        category: formData.category,
      },
      {
        onSuccess: (newProduct) => {
          if (stockQty > 0) {
            addStock(
              { productId: newProduct.id, quantity: stockQty },
              {
                onSuccess: () => {
                  toast({ title: "Product created with initial stock" });
                },
                onError: (err) => {
                  console.error("Stock add failed:", err);
                  toast({ title: "Product created", description: "But failed to add initial stock.", variant: "destructive" });
                }
              }
            );
          } else {
            toast({ title: "Product created successfully" });
          }
          setNewlyCreatedProduct(newProduct);
          setShowPromoPrompt(true);
          setPromoStep(1);
          setAqFreeQty("");
          setOpen(false);
          setFormData({
            name: "",
            price: "",
            purchasePrice: "",
            imageUrl: "",
            unit: "ltr",
            quantityPerUnit: "1",
            itemsPerCase: "1",
            initialStock: "0",
            category: "others",
          });
        },
        onError: (err: any) => {
          console.error("Product creation error:", err);
          toast({ title: "Error", description: err.message || "Failed to create product", variant: "destructive" });
        }
      }
    );
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      price: product.price.toString(),
      purchasePrice: (product.purchasePrice || 0).toString(),
      imageUrl: product.imageUrl || "",
      unit: product.unit || "ltr",
      quantityPerUnit: product.quantityPerUnit || "1",
      itemsPerCase: product.itemsPerCase.toString(),
      category: normalizeCategory(product),
      addStockQty: "0",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const category: ProductCategory =
      editFormData.category ?? normalizeCategory(editingProduct);

    const stockToAdd = parseInt(editFormData.addStockQty, 10) || 0;

    updateProduct(
      {
        id: editingProduct.id,
        data: {
          name: editFormData.name,
          price: parseInt(editFormData.price, 10),
          purchasePrice: parseInt(editFormData.purchasePrice, 10) || 0,
          imageUrl: editFormData.imageUrl || null,
          unit: editFormData.unit,
          quantityPerUnit: editFormData.quantityPerUnit,
          itemsPerCase: parseInt(editFormData.itemsPerCase, 10),
          category,
        },
      },
      {
        onSuccess: () => {
          if (stockToAdd > 0) {
            addStock(
              { productId: editingProduct.id, quantity: stockToAdd },
              {
                onSuccess: () => {
                  toast({ title: "Product updated and stock added successfully" });
                  setEditingProduct(null);
                }
              }
            );
          } else {
            toast({ title: "Product updated successfully" });
            setEditingProduct(null);
          }
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteProduct(id, {
      onSuccess: () => {
        toast({ title: "Product deleted successfully" });
      },
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Pepsi 2.25L"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                  data-testid="input-product-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ProductCategory })}
                >
                  <SelectTrigger className="rounded-xl border-border/50" data-testid="select-product-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PRODUCT_CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Price per Case (₹) — Selling</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="e.g. 240"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                  data-testid="input-product-price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Purchase Price per Case (₹) — incl. GST</label>
                <Input
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="e.g. 200"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                  data-testid="input-product-purchase-price"
                />
                <p className="text-xs text-muted-foreground">Used to calculate profit in Profit Pulse.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Packing (1 Case = ? items)</label>
                <Input
                  type="number"
                  value={formData.itemsPerCase}
                  onChange={(e) => setFormData({ ...formData, itemsPerCase: e.target.value })}
                  required
                  placeholder="e.g. 12"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Initial Stock (Cases)</label>
                <Input
                  type="number"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  required
                  placeholder="e.g. 50"
                  className="rounded-xl border-border/50 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Image URL (Optional)</label>
                <Input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
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
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-72 animate-pulse bg-muted/50 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {productsByCategory.map(({ category, sectionTitle, items }) => (
            <section key={category} className="space-y-4" aria-labelledby={`category-${category}`}>
              <div className="flex items-center gap-3">
                <h2 id={`category-${category}`} className="text-lg font-display font-bold tracking-tight">
                  {sectionTitle}
                </h2>
                <span className="text-sm text-muted-foreground">({items.length})</span>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No products in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((product) => {
                    const quantity = getStockForProduct(product.id);
                    return (
                      <Card
                        key={product.id}
                        data-testid={`card-product-${product.id}`}
                        className="overflow-hidden border border-border/40 shadow-sm hover:shadow-lg transition-all hover:border-primary/20 rounded-2xl group flex flex-col h-full"
                      >
                        <div className="relative w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain p-2"
                              data-testid={`img-product-${product.id}`}
                            />
                          ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                              <Package className="w-12 h-12 mb-2" />
                              <span className="text-xs text-center text-muted-foreground">No image</span>
                            </div>
                          )}
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h3 className="text-lg font-bold text-foreground leading-tight" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </h3>
                            <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 text-center leading-tight max-w-[5.5rem]">
                              {categoryLabel(normalizeCategory(product))}
                            </div>
                          </div>

                          <div className="space-y-3 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-primary" data-testid={`text-price-${product.id}`}>
                                ₹{product.price}
                              </span>
                              <span className="text-sm text-muted-foreground font-medium">per case</span>
                            </div>

                            <div className="pt-2 border-t border-border/30">
                              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Stock in Godown</p>
                              <div className="flex items-baseline gap-2">
                                <span
                                  className={`text-2xl font-bold ${
                                    quantity > 20 ? "text-emerald-600" : quantity > 5 ? "text-amber-600" : "text-destructive"
                                  }`}
                                  data-testid={`text-stock-${product.id}`}
                                >
                                  {formatQuantity(quantity * (product.itemsPerCase || 1), product.itemsPerCase || 1)}
                                </span>
                              </div>
                              {quantity === 0 && <p className="text-xs text-destructive font-semibold mt-1">Out of stock</p>}
                            </div>

                            <div className="pt-3 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-semibold"
                                onClick={() => startEdit(product)}
                              >
                                <Edit className="w-3.5 h-3.5 mr-2" />
                                Edit
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="px-3 rounded-xl border-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                                    disabled={isDeleting}
                                    data-testid={`button-delete-product-${product.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete <strong>{product.name}</strong>? This will also remove its stock entries.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(product.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Product Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
                placeholder="e.g. Pepsi 2.25L"
                className="rounded-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Category</label>
              <Select
                value={editFormData.category}
                onValueChange={(v) => setEditFormData({ ...editFormData, category: v as ProductCategory })}
              >
                <SelectTrigger className="rounded-xl border-border/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PRODUCT_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Price per Case (₹) — Selling</label>
              <Input
                type="number"
                value={editFormData.price}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                required
                placeholder="e.g. 240"
                className="rounded-xl border-border/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Purchase Price per Case (₹) — incl. GST</label>
              <Input
                type="number"
                value={editFormData.purchasePrice}
                onChange={(e) => setEditFormData({ ...editFormData, purchasePrice: e.target.value })}
                placeholder="e.g. 200"
                className="rounded-xl border-border/50"
              />
              <p className="text-xs text-muted-foreground">Used to calculate profit in Profit Pulse.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Packing (1 Case = ? items)</label>
              <Input
                type="number"
                value={editFormData.itemsPerCase}
                onChange={(e) => setEditFormData({ ...editFormData, itemsPerCase: e.target.value })}
                required
                placeholder="e.g. 12"
                className="rounded-xl border-border/50"
              />
            </div>
            <div className="pt-2">
              <div className="flex items-stretch gap-4 p-4 rounded-xl border border-border/50 bg-slate-50/50 shadow-inner">
                <div className="flex-1 border-r border-border/50 pr-4 flex flex-col justify-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Current Stock</label>
                  <div className="text-3xl font-black text-slate-800">
                    {editingProduct ? getStockForProduct(editingProduct.id) : 0} <span className="text-sm font-medium text-muted-foreground">cases</span>
                  </div>
                </div>
                <div className="flex-1 pl-2">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 block">Add New Cases</label>
                  <div className="flex items-center shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, addStockQty: Math.max(0, parseInt(editFormData.addStockQty || '0') - 1).toString() })}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-l border border-slate-300 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all outline-none focus:bg-slate-100"
                    ><Minus className="w-5 h-5" /></button>
                    <Input
                      type="number"
                      value={editFormData.addStockQty}
                      onChange={(e) => setEditFormData({ ...editFormData, addStockQty: e.target.value })}
                      className="w-16 h-10 border-y border-x-0 border-slate-300 text-center text-lg font-black p-0 bg-white rounded-none focus-visible:ring-0 shadow-none z-10 relative"
                    />
                    <button 
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, addStockQty: (parseInt(editFormData.addStockQty || '0') + 1).toString() })}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-r border border-slate-300 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all outline-none focus:bg-slate-100"
                    ><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Image URL (Optional)</label>
              <Input
                type="url"
                value={editFormData.imageUrl}
                onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                placeholder="https://..."
                className="rounded-xl border-border/50"
              />
            </div>
            <Button type="submit" disabled={isUpdating} className="w-full rounded-xl mt-2 h-12 text-base">
              {isUpdating ? "Updating..." : "Update Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Promotion Setup Prompt */}
      <Dialog open={showPromoPrompt} onOpenChange={setShowPromoPrompt}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight text-center">
              New Product Promotion
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-6">
            {promoStep === 1 && (
              <div className="space-y-6">
                <p className="text-slate-600 font-bold text-center text-lg leading-relaxed">
                  Does <span className="text-primary font-black uppercase underline decoration-primary/20 decoration-4 underline-offset-4">{newlyCreatedProduct?.name}</span> qualify for a free bottle promotion?
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    className="h-16 rounded-[1.5rem] text-lg font-black uppercase text-slate-400 border-slate-100 hover:bg-slate-50 transition-all font-display"
                    onClick={() => setShowPromoPrompt(false)}
                  >
                    No
                  </Button>
                  <Button 
                    variant="default" 
                    className="h-16 rounded-[1.5rem] text-lg font-black uppercase shadow-xl shadow-primary/20 transition-all font-display"
                    onClick={() => setPromoStep(2)}
                  >
                    Yes
                  </Button>
                </div>
              </div>
            )}

            {promoStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <p className="text-slate-800 font-black text-center text-xl leading-snug">
                  Is the free promotional bottle <span className="text-primary">Aquafina 1 Liter</span>?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-16 rounded-[1.5rem] text-lg font-black uppercase text-slate-400 border-slate-100 hover:bg-slate-50 transition-all font-display"
                    onClick={() => {
                        toast({ title: "Product Added", description: "You can set up custom promotions in the Offers section later." });
                        setShowPromoPrompt(false);
                    }}
                  >
                    No
                  </Button>
                  <Button 
                    variant="default" 
                    className="h-16 rounded-[1.5rem] text-lg font-black uppercase shadow-xl shadow-primary/20 transition-all font-display"
                    onClick={() => setPromoStep(3)}
                  >
                    Yes
                  </Button>
                </div>
              </div>
            )}

            {promoStep === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="text-center">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Quantity Config</p>
                  <p className="text-slate-800 font-black text-xl leading-snug">
                    How many free bottles of <span className="text-primary">Aquafina 1L</span> should be applied per case?
                  </p>
                </div>
                
                <div className="relative">
                  <Input 
                    type="number"
                    autoFocus
                    placeholder="0"
                    value={aqFreeQty}
                    onChange={(e) => setAqFreeQty(e.target.value)}
                    className="h-20 rounded-3xl text-3xl font-black text-center bg-slate-50 border-slate-100 text-primary shadow-inner focus:bg-white transition-all"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-base uppercase">Btls</div>
                </div>

                <Button 
                  className="w-full h-16 rounded-[1.5rem] text-xl font-black uppercase shadow-xl shadow-primary/30 active:scale-[0.98] transition-all font-display"
                  onClick={() => {
                    const qty = parseInt(aqFreeQty) || 0;
                    const aquafina = products.find(p => p.name.toLowerCase().includes("aquafina 1l") || p.name.toLowerCase().includes("aquafina"));
                    
                    if (qty > 0 && newlyCreatedProduct && aquafina) {
                      createOffer({
                        name: `Buy 1 ${newlyCreatedProduct.name} Get ${qty} Aquafina 1L Free`,
                        buyProductId: newlyCreatedProduct.id,
                        buyQuantity: 1,
                        freeProductId: aquafina.id,
                        freeQuantity: qty,
                        isActive: true
                      }, {
                        onSuccess: () => {
                          toast({ title: "Promotion setup complete!" });
                          setShowPromoPrompt(false);
                        }
                      });
                    } else {
                      if (!aquafina) {
                         toast({ title: "Error", description: "Aquafina 1L not found in catalog.", variant: "destructive" });
                      }
                      setShowPromoPrompt(false);
                    }
                  }}
                >
                  Confirm Promotion
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
