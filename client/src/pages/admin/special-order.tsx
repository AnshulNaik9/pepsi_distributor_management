import { useState, useEffect, useCallback } from "react";
import { ArrowUpRight } from "lucide-react";

import useEmblaCarousel from 'embla-carousel-react';
import { useCustomers, useCheckout, useCreateCustomer, useOffers } from "@/hooks/use-sales";
import { useTrucks, useRoutes } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { formatQuantity } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, CheckCircle2, Package, Phone, Store, Zap, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function AdminSpecialOrder() {
  const { data: trucks = [] } = useTrucks();
  const { data: routes = [] } = useRoutes();
  const { data: products = [] } = useProducts();
  const { data: godownStock = [] } = useGodownStock();
  const { data: offers = [] } = useOffers();
  const { data: customers = [] } = useCustomers();

  const categoryOrder: Record<string, number> = {
    "2_25_ltr": 0, "1_ltr": 1, "750_ml": 2, "400_ml": 3, "others": 4,
  };
  const getCategoryOrder = (productId: number) => {
    const p = products.find(p => p.id === productId);
    return categoryOrder[p?.category ?? "others"] ?? 99;
  };
  const categoryLabel: Record<string, string> = {
    "2_25_ltr": "2.25 Ltr", "750_ml": "750 ml", "1_ltr": "1 Ltr", "400_ml": "400 ml", "others": "Others",
  };

  const { mutate: checkout, isPending } = useCheckout();
  const { mutate: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const { toast } = useToast();

  const [customerSearch, setCustomerSearch] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartPrices, setCartPrices] = useState<Record<number, number>>({});
  const [cartCustomFree, setCartCustomFree] = useState<Record<number, number>>({});
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, upi: 0, credit: 0 });
  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const selectedCustomer = customers.find(
    c => c.name.toLowerCase() === customerSearch.trim().toLowerCase(),
  );

  const handleQty = (productId: number, delta: number, max: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        setCartPrices(cp => { const cpCopy = { ...cp }; delete cpCopy[productId]; return cpCopy; });
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handlePriceUpdate = (productId: number, val: number) => {
    setCartPrices(prev => ({ ...prev, [productId]: val }));
    setEditingPrice(null);
    setTempPrice("");
  };

  const calculateTotal = () => {
    let sum = Object.entries(cart).reduce((s, [id, qtyBtls]) => {
      const pId = parseInt(id);
      const p = products.find(p => p.id === pId);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = qtyBtls / itemsPerCase;
      const price = cartPrices[pId] !== undefined ? cartPrices[pId] : (p?.price || 0);
      return s + (price * cases);
    }, 0);

    const exactMatch = customers.find(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase());
    if (exactMatch?.hasSpecialDiscount && sum > 0) {
      sum = Math.max(0, sum - 20);
    }
    return Math.round(sum);
  };

  const isExcludedFromDefaultFree = (productName: string) => {
    const name = productName.toLowerCase();
    return (
      (name.includes("soda") && name.includes("2.25")) ||
      (name.includes("pepsi") && name.includes("1") && (name.includes("ltr") || name.includes("1l"))) ||
      (name.includes("lehar") && name.includes("soda") && name.includes("750"))
    );
  };

  const isPromoEligible = (product: any) => {
    const nameMatch = (product?.name || "").toLowerCase();
    const isPromoSize = nameMatch.includes("2.25") || nameMatch.includes("750") || product?.category === "2_25_ltr" || product?.category === "750_ml";
    if (!isPromoSize) return false;
    if (isExcludedFromDefaultFree(nameMatch)) return false;
    return true;
  };

  const computeFreeItems = () => {
    const freeItems: Record<number, number> = {};
    const fallbackAquafinaId = products.find(p => p.name.toLowerCase().includes("aquafina 1l") || p.name.toLowerCase().includes("aquafina"))?.id || 0;
    let totalPromoCases = 0;

    Object.entries(cart).forEach(([id, qtyBtls]) => {
      const productId = parseInt(id);
      const p = products.find(prod => prod.id === productId);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = qtyBtls / itemsPerCase;
      let pFree = 0;
      let freeProductId = fallbackAquafinaId;

      offers.forEach(offer => {
        if (offer.buyProductId === productId && cases >= offer.buyQuantity) {
          const offerMultiplier = Math.floor(cases / offer.buyQuantity);
          const quantityFromOffer = offerMultiplier * offer.freeQuantity;
          if (quantityFromOffer > pFree) { pFree = quantityFromOffer; }
          freeProductId = offer.freeProductId;
        }
      });

      const customFree = cartCustomFree[productId];
      if (customFree && customFree > 0 && freeProductId > 0) {
        freeItems[freeProductId] = (freeItems[freeProductId] || 0) + customFree;
      }
      if (pFree > 0) {
        if (freeProductId > 0) freeItems[freeProductId] = (freeItems[freeProductId] || 0) + pFree;
      } else if (isPromoEligible(p)) {
        totalPromoCases += cases;
      }
    });

    const globalPromoFreeBottles = Math.floor(totalPromoCases) * 2;
    if (globalPromoFreeBottles > 0 && fallbackAquafinaId > 0) {
      freeItems[fallbackAquafinaId] = (freeItems[fallbackAquafinaId] || 0) + globalPromoFreeBottles;
    }
    return freeItems;
  };

  const handleCheckout = () => {
    const rawSearch = customerSearch.trim();
    if (!rawSearch) return toast({ title: "Enter a shop name", variant: "destructive" });
    const truckId = trucks.length > 0 ? trucks[0].id : 1;

    if (paymentMode === "Split") {
      const splitTotal = Math.round(splitAmounts.cash + splitAmounts.upi + splitAmounts.credit);
      if (splitTotal !== Math.round(total)) {
        return toast({ title: "Split amounts do not match total", description: `Remaining: ₹${Math.round(total - splitTotal)}`, variant: "destructive" });
      }
    }

    const items = Object.entries(cart).map(([id, qtyBtls]) => {
      const pId = parseInt(id);
      const p = products.find(prod => prod.id === pId);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = parseFloat((qtyBtls / itemsPerCase).toFixed(4));
      return {
        productId: pId,
        quantity: cases,
        customPrice: cartPrices[pId] !== undefined ? Number(cartPrices[pId]) : undefined,
        customFreeQty: cartCustomFree[pId] !== undefined ? Number(cartCustomFree[pId]) : undefined,
      };
    });

    const processOrder = (cid: number) => {
      checkout({
        customerId: cid, truckId: truckId, paymentMode,
        splitAmounts: paymentMode === "Split" ? splitAmounts : undefined,
        items
      }, {
        onSuccess: (orderData) => {
          toast({ title: "Special Order Created!" });
          setCompletedOrder(orderData);
          setCart({}); setCartPrices({}); setCartCustomFree({});
          setCustomerSearch(""); setShopPhone("");
          setStep(3);
        }
      });
    };

    const exactMatch = customers.find(c => c.name.toLowerCase() === rawSearch.toLowerCase());
    if (exactMatch) {
      processOrder(exactMatch.id);
    } else {
      createCustomer({
        name: rawSearch,
        phone: shopPhone.trim(),
        address: "Special Order",
        routeId: routes.length > 0 ? routes[0].id : 1,
        creditBalance: 0
      }, {
        onSuccess: (newCust) => processOrder(newCust.id),
        onError: (err: any) => toast({ title: "Failed to create shop", description: err.message, variant: "destructive" })
      });
    }
  };

  const total = calculateTotal();
  const cartItemCount = Object.keys(cart).length;

  // --- Swipe Navigation ---
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const onSelect = useCallback(() => { if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap()); }, [emblaApi]);
  useEffect(() => { if (!emblaApi) return; emblaApi.on('select', onSelect); onSelect(); }, [emblaApi, onSelect]);
  const scrollTo = useCallback((index: number) => { if (emblaApi) emblaApi.scrollTo(index); }, [emblaApi]);

  // --- Order Complete Screen ---
  if (step === 3 && completedOrder) {
    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-300 pb-32 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight text-center">Special Order Complete</h2>

        <Card className="w-full max-w-md p-4 bg-white border shadow-xl rounded-2xl">
          <div className="mx-auto w-[260px] bg-white border border-slate-200 rounded-md p-3 font-mono text-[11px] leading-tight text-black">
            <div className="text-center font-bold text-sm tracking-wide">CS MARKETING</div>
            <div className="mt-1 border-y border-dashed border-slate-300 py-1 text-center">
              <div className="font-semibold">SPECIAL ORDER</div>
              <div>Order #{completedOrder.id}</div>
              <div>{new Date((completedOrder as any).date || Date.now()).toLocaleDateString()}</div>
            </div>
            <div className="mt-1">Shop: {completedOrder?.customer?.name || "Walk-in"}</div>
            <div className="mt-1 border-t border-dashed border-slate-300 pt-1">
              <div className="mb-1 font-semibold">Items</div>
              <div className="space-y-0.5 max-h-[34vh] overflow-y-auto pr-1">
                {completedOrder.items?.map((item: any, i: number) => {
                  const qty = item.isFree
                    ? formatQuantity(item.quantity, item.product?.itemsPerCase || 1)
                    : formatQuantity(item.quantity * (item.product?.itemsPerCase || 1), item.product?.itemsPerCase || 1);
                  const amount = item.isFree ? "FREE" : `₹${Math.round((item.customPrice || item.product?.price || 0) * item.quantity)}`;
                  return (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="truncate">{item.product?.name} x {qty}</span>
                      <span className="whitespace-nowrap">{amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-1 border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold">
              <span>Total</span>
              <span>₹{completedOrder.totalAmount}</span>
            </div>
          </div>
        </Card>

        <div className="w-full max-w-md space-y-3 pt-4">
          <Button onClick={() => { setStep(1); setCompletedOrder(null); }} variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold border-2">
            Create Another Order
          </Button>
        </div>
      </div>
    );
  }

  // --- Checkout Summary Screen ---
  if (step === 2) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 pb-32">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-xl mb-4 hover:bg-primary/20 transition-colors">
          ← Back to Cart
        </button>
        <h2 className="text-2xl font-display font-bold">Checkout Summary</h2>

        <Card className="p-5 rounded-2xl space-y-4 shadow-md border-border/50">
          <div className="flex justify-between items-center pb-4 border-b border-border/50">
            <span className="text-muted-foreground font-medium">Customer</span>
            <span className="font-bold text-lg">{customerSearch.trim()}</span>
          </div>

          <div className="space-y-2 pt-2 max-h-[45vh] overflow-y-auto pr-2">
            {Object.entries(cart).map(([id, qtyBtls]) => {
              const pId = parseInt(id);
              const p = products.find(p => p.id === pId);
              const itemsPerCase = p?.itemsPerCase || 1;
              const cases = qtyBtls / itemsPerCase;
              const price = cartPrices[pId] !== undefined ? cartPrices[pId] : (p?.price || 0);
              return (
                <div key={id} className="flex justify-between text-sm items-center">
                  <div className="flex flex-col">
                    <span>{formatQuantity(qtyBtls, itemsPerCase)} {p?.name}</span>
                    {cartPrices[pId] !== undefined && (
                      <span className="text-[10px] text-amber-600 font-bold">Custom Price: ₹{price}/case</span>
                    )}
                  </div>
                  <span className="font-medium">₹{Math.round(price * cases)}</span>
                </div>
              );
            })}
            {Object.entries(computeFreeItems()).map(([id, qty]) => {
              const p = products.find(p => p.id === parseInt(id));
              if (qty <= 0) return null;
              return (
                <div key={`free-${id}`} className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                  <span>{formatQuantity(qty, p?.itemsPerCase || 1)} {p?.name} (Free)</span>
                  <span>₹0</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <div className="flex flex-col">
              <span className="font-bold text-lg">Total Amount</span>
              {selectedCustomer?.hasSpecialDiscount && (
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1 italic">₹20 Special Discount Applied</span>
              )}
            </div>
            <span className="font-black text-2xl text-primary">₹{total}</span>
          </div>
        </Card>

        <div className="space-y-3">
          <label className="font-semibold text-sm px-1">Payment Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {["Cash", "UPI", "Credit", "Split"].map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setPaymentMode(mode);
                  if (mode === "Split") setSplitAmounts({ cash: total, upi: 0, credit: 0 });
                }}
                className={`p-4 rounded-xl border-2 font-bold transition-all ${paymentMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 bg-white text-muted-foreground'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {paymentMode === "Split" && (() => {
            const currentSplitTotal = Math.round((splitAmounts.cash || 0) + (splitAmounts.upi || 0) + (splitAmounts.credit || 0));
            const remainder = Math.round(total - currentSplitTotal);
            return (
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">CASH</label>
                  <Input type="number" min="0" value={splitAmounts.cash === 0 ? '' : splitAmounts.cash} onChange={e => setSplitAmounts({ ...splitAmounts, cash: parseFloat(e.target.value) || 0 })} className="h-12 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">UPI</label>
                  <Input type="number" min="0" value={splitAmounts.upi === 0 ? '' : splitAmounts.upi} onChange={e => setSplitAmounts({ ...splitAmounts, upi: parseFloat(e.target.value) || 0 })} className="h-12 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">CREDIT</label>
                  <Input type="number" min="0" value={splitAmounts.credit === 0 ? '' : splitAmounts.credit} onChange={e => setSplitAmounts({ ...splitAmounts, credit: parseFloat(e.target.value) || 0 })} className="h-12 font-bold" />
                </div>
                <div className={`col-span-3 text-sm font-bold text-center p-3 rounded-xl mt-1 transition-all ${remainder === 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                  {remainder > 0 ? `Remaining: ₹${remainder}` : remainder < 0 ? `Excess: ₹${Math.abs(remainder)}` : `Amounts match! Ready.`}
                </div>
              </div>
            );
          })()}
        </div>

        <Button onClick={handleCheckout} disabled={isPending || isCreatingCustomer} className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/30 mt-8">
          {isPending || isCreatingCustomer ? "Processing..." : "Complete Special Order"}
        </Button>
      </div>
    );
  }

  // --- Main Billing Screen ---
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.trim().toLowerCase())
  );

  const allAvailableItems = products.map(p => {
    let godownQty = godownStock.find(g => g.productId === p.id)?.casesAvailable ?? 0;
    const totalQty = godownQty;
    if (totalQty === 0) return null;
    return { p, godownQty, totalQty };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const catDiff = getCategoryOrder(a.p.id) - getCategoryOrder(b.p.id);
      if (catDiff !== 0) return catDiff;
      return a.p.name.localeCompare(b.p.name);
    });

  const categoriesPresent = Array.from(new Set(allAvailableItems.map(item => item.p.category)))
    .sort((a, b) => (categoryOrder[a] ?? 99) - (categoryOrder[b] ?? 99));

  return (
    <div className="animate-in fade-in duration-700 pb-32">
      {/* Page Header */}
      <div className="mb-8 p-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Star className="w-7 h-7 fill-white/20" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black tracking-tight text-slate-800">Special Order</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Admin direct billing interface
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Selection (8 cols on large screens) */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
          <Card className="p-6 rounded-[2.5rem] border-border/50 bg-white/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 mb-6 px-1">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Product Catalog</h3>
              <span className="text-xs font-bold text-muted-foreground ml-auto bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">Godown Stock</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar sticky top-0 z-10 py-1">
              {categoriesPresent.map((cat, idx) => (
                <button key={cat} onClick={() => scrollTo(idx)}
                  className={`px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2 flex items-center gap-2 ${selectedIndex === idx
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-primary/20 hover:text-primary'
                    }`}
                >
                  <span className={selectedIndex === idx ? "opacity-100" : "opacity-30"}>•</span>
                  {categoryLabel[cat] ?? cat}
                </button>
              ))}
            </div>

            <div className="overflow-hidden mt-2" ref={emblaRef}>
              <div className="flex">
                {categoriesPresent.map(cat => (
                  <div key={cat} className="flex-[0_0_100%] min-w-0 px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allAvailableItems
                        .filter(item => item.p.category === cat)
                        .map(({ p, godownQty, totalQty }) => {
                          const qty = cart[p.id] || 0;
                          return (
                            <Card key={p.id} className={`p-4 rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden group ${qty > 0 ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-slate-100 bg-white hover:border-primary/20'}`}>
                              <div className="flex gap-4">
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
                                    {p.imageUrl ? (
                                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-2" />
                                    ) : (
                                      <Package className="w-8 h-8 text-slate-200" />
                                    )}
                                  </div>

                                  <div className="relative group/price">
                                    {editingPrice === p.id ? (
                                      <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                                        <Input value={tempPrice} onChange={e => setTempPrice(e.target.value)}
                                          onBlur={() => handlePriceUpdate(p.id, parseInt(tempPrice) || p.price)}
                                          onKeyDown={e => { if (e.key === 'Enter') handlePriceUpdate(p.id, parseInt(tempPrice) || p.price); }}
                                          autoFocus className="h-7 w-16 text-xs font-black p-0.5 bg-white border-primary rounded-lg text-center shadow-lg" />
                                      </div>
                                    ) : (
                                      <button className="text-[11px] font-black text-primary px-3 py-1 rounded-full bg-white border-2 border-primary/10 hover:border-primary transition-all shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); setEditingPrice(p.id); setTempPrice(cartPrices[p.id]?.toString() || p.price.toString()); }}>
                                        ₹{cartPrices[p.id] !== undefined ? cartPrices[p.id] : p.price}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 pt-1 flex flex-col justify-between">
                                  <div>
                                    <h4 className="font-black text-lg leading-tight text-slate-800 tracking-tight line-clamp-2">{p.name}</h4>
                                    <div className="flex items-center gap-2 mt-2">
                                      <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${godownQty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                        STOCK: {formatQuantity(godownQty * (p.itemsPerCase || 1), p.itemsPerCase || 1)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-col gap-2">
                                    {/* Free Tool */}
                                    {((p.name.toLowerCase().includes('aquafina 1l') && p.price > 0) || qty > 0 || (cartCustomFree[p.id] || 0) > 0) && (() => {
                                      const itemsPerCase = p.itemsPerCase || 1;
                                      const cases = qty / itemsPerCase;
                                      let autocalcFree = 0;
                                      offers.forEach(o => {
                                        if (o.buyProductId === p.id && cases >= o.buyQuantity) {
                                          autocalcFree = Math.floor(cases / o.buyQuantity) * o.freeQuantity;
                                        }
                                      });
                                      if (autocalcFree === 0 && isPromoEligible(p)) autocalcFree = Math.floor(cases) * 2;
                                      const totalItemFree = autocalcFree + (cartCustomFree[p.id] || 0);

                                      return (
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center overflow-hidden rounded-xl border-2 border-blue-100 bg-blue-50/50">
                                            <button onClick={() => { const current = cartCustomFree[p.id] || 0; setCartCustomFree(prev => ({ ...prev, [p.id]: Math.max(0, current - 1) })); }}
                                              className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-90 transition-all font-black"><Minus className="w-3.5 h-3.5" /></button>
                                            <div className="w-8 h-8 flex items-center justify-center text-xs font-black text-blue-700 bg-white border-x-2 border-blue-100">{totalItemFree}</div>
                                            <button onClick={() => { const current = cartCustomFree[p.id] || 0; setCartCustomFree(prev => ({ ...prev, [p.id]: current + 1 })); }}
                                              className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-90 transition-all font-black"><Plus className="w-3.5 h-3.5" /></button>
                                          </div>
                                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter flex items-center gap-1">
                                            <Zap className="w-3 h-3 fill-blue-600" /> Free Bottles
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {/* Qty Controls */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between bg-slate-100/80 p-1 rounded-xl">
                                          <span className="text-[9px] font-black text-slate-400 pl-2 uppercase">Cases</span>
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => handleQty(p.id, -(p.itemsPerCase || 1), Math.floor(totalQty * (p.itemsPerCase || 1)))}
                                              className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-primary active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                                            <span className="w-6 text-center font-black text-sm">{Math.floor(qty / (p.itemsPerCase || 1))}</span>
                                            <button onClick={() => handleQty(p.id, p.itemsPerCase || 1, Math.floor(totalQty * (p.itemsPerCase || 1)))}
                                              className="w-7 h-7 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-100/80 p-1 rounded-xl">
                                          <span className="text-[9px] font-black text-slate-400 pl-2 uppercase">Btls</span>
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => handleQty(p.id, -1, Math.floor(totalQty * (p.itemsPerCase || 1)))}
                                              className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-primary active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                                            <span className="w-6 text-center font-black text-sm">{Math.round(qty % (p.itemsPerCase || 1))}</span>
                                            <button onClick={() => handleQty(p.id, 1, Math.floor(totalQty * (p.itemsPerCase || 1)))}
                                              className="w-7 h-7 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Customer & Checkout (4 cols on large screens, or sticky bottom on mobile) */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
          <Card className="p-8 rounded-[2.5rem] border-border/50 bg-white shadow-xl lg:sticky lg:top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Order Details</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Customer Selection</Label>
                <div className="flex items-center gap-2 relative">
                  <Input
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Search shop..."
                    className="h-14 rounded-2xl text-lg px-4 border-slate-200 bg-slate-50 font-bold placeholder:text-slate-300 flex-1"
                  />
                  <Button onClick={() => setIsAddingShop(true)} size="icon" className="h-14 w-14 rounded-2xl shrink-0 shadow-lg active:scale-95">
                    <Plus className="w-6 h-6" />
                  </Button>

                  {showDropdown && customerSearch.length > 0 && (
                    <div className="absolute top-[60px] left-0 right-0 max-h-60 overflow-y-auto bg-white border border-border/50 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                      {filteredCustomers.length > 0 ? (
                        <>
                          {filteredCustomers.map(c => (
                            <div key={c.id} onClick={() => { setCustomerSearch(c.name); setShopPhone(c.phone); }}
                              className="p-4 border-b border-border/50 hover:bg-primary/5 cursor-pointer flex justify-between items-center group">
                              <div>
                                <div className="font-bold text-base group-hover:text-primary">{c.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{c.phone}</div>
                              </div>
                              {customerSearch.toLowerCase() === c.name.toLowerCase() && <CheckCircle2 className="w-5 h-5 text-primary" />}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-5 text-center bg-slate-50/50">
                          <div className="text-sm font-bold text-slate-800">No shop found</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-black text-slate-800">Cart Summary</h4>
                  <span className="text-[11px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500">{cartItemCount} ITEMS</span>
                </div>

                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(cart).length === 0 ? (
                    <div className="text-center py-8 text-slate-300 font-medium italic border-2 border-dashed border-slate-100 rounded-2xl mb-4">Cart is empty</div>
                  ) : (
                    <>
                      {Object.entries(cart).map(([id, qtyBtls]) => {
                        const pId = parseInt(id);
                        const p = products.find(p => p.id === pId);
                        const itemsPerCase = p?.itemsPerCase || 1;
                        const cases = qtyBtls / itemsPerCase;
                        const price = cartPrices[pId] !== undefined ? cartPrices[pId] : (p?.price || 0);
                        return (
                          <div key={id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="text-sm font-bold text-slate-700 truncate">{p?.name}</p>
                              <p className="text-[10px] font-black text-primary uppercase">{formatQuantity(qtyBtls, itemsPerCase)} @ ₹{price}</p>
                            </div>
                            <span className="font-black text-slate-900">₹{Math.round(price * cases)}</span>
                          </div>
                        );
                      })}
                      {Object.entries(computeFreeItems()).map(([id, qty]) => {
                        const p = products.find(p => p.id === parseInt(id));
                        if (qty <= 0) return null;
                        return (
                          <div key={`free-${id}`} className="flex justify-between items-center bg-emerald-50 p-3 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="text-sm font-bold text-emerald-700 truncate">{p?.name}</p>
                              <p className="text-[10px] font-black text-emerald-600 uppercase italic">{formatQuantity(qty, p?.itemsPerCase || 1)} Free Items</p>
                            </div>
                            <span className="font-black text-emerald-700 uppercase tracking-widest text-[10px]">Gift</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t-4 border-double border-slate-200">
                <div className="flex justify-between items-end mb-8">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-4xl font-black text-primary tracking-tighter">₹{total}</span>
                  </div>
                  {selectedCustomer?.hasSpecialDiscount && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full mb-1">₹20 DISCOUNT APPLIED</span>
                  )}
                </div>

                <Button
                  onClick={() => {
                    if (!customerSearch.trim()) toast({ title: "Enter shop name first", variant: "destructive" });
                    else setStep(2);
                  }}
                  disabled={cartItemCount === 0}
                  className="w-full h-20 rounded-[2rem] text-2xl font-black shadow-2xl shadow-primary/30 active:scale-95 transition-all group"
                >
                  Proceed to Payment
                  <ArrowUpRight className="ml-2 w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Custom Dialogs */}
      <Dialog open={isAddingShop} onOpenChange={setIsAddingShop}>
        <DialogContent className="max-w-[400px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-slate-800 text-center tracking-tight mb-4">
              New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Shop Name</Label>
              <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Enter shop name..." className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-slate-100 focus:bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Mobile (Optional)</Label>
              <Input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="00000 00000" type="tel" className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-slate-100 focus:bg-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { if (!customerSearch.trim()) return toast({ title: "Enter shop name", variant: "destructive" }); setIsAddingShop(false); }} className="w-full h-16 rounded-2xl text-xl font-black active:scale-95 shadow-lg shadow-primary/20">
              Set Shop & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper icons needed
