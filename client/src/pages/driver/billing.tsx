import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import { useCustomers, useCheckout, useCreateCustomer } from "@/hooks/use-sales";
import { useTruckStock, useRoutes } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { useBluetoothPrinter } from "@/hooks/use-printer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, User, CheckCircle2, Package, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function SpotBillingPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const { data: customers = [] } = useCustomers();
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();
  const { data: godownStock = [] } = useGodownStock();
  const { data: routes = [] } = useRoutes();

  // Category sort order: 2.25L first, then 750ml, then everything else
  // Category swipe order: 2.25L -> 1L -> 750ml -> 400ml -> Others
  const categoryOrder: Record<string, number> = {
    "2_25_ltr": 0,
    "1_ltr": 1,
    "750_ml": 2,
    "400_ml": 3,
    "others": 4,
  };

  const getCategoryOrder = (productId: number) => {
    const p = products.find(p => p.id === productId);
    return categoryOrder[p?.category ?? "others"] ?? 99;
  };

  const categoryLabel: Record<string, string> = {
    "2_25_ltr": "2.25 Ltr",
    "750_ml": "750 ml",
    "1_ltr": "1 Ltr",
    "400_ml": "400 ml",
    "others": "Others",
  };

  const { mutate: checkout, isPending } = useCheckout();
  const { mutate: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const { toast } = useToast();

  const [customerSearch, setCustomerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const { printReceipt, isConnecting: isPrinting } = useBluetoothPrinter();

  useEffect(() => {
    if (!truckId) window.location.href = "/driver/select";
  }, [truckId]);

  const handleQty = (productId: number, delta: number, max: number) => {
    setCart(prev => {
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

  const calculateTotal = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = products.find(p => p.id === parseInt(id));
      return sum + ((p?.price || 0) * qty);
    }, 0);
  };

  const handleCheckout = () => {
    const rawSearch = customerSearch.trim();
    if (!rawSearch) return toast({ title: "Enter a shop name", variant: "destructive" });

    const items = Object.entries(cart).map(([id, qty]) => ({
      productId: parseInt(id),
      quantity: qty
    }));

    const processOrder = (cid: number) => {
      checkout({
        customerId: cid,
        truckId,
        paymentMode,
        items
      }, {
        onSuccess: (orderData) => {
          toast({ title: "Order successful!" });
          setCompletedOrder(orderData);
          setCart({});
          setCustomerSearch("");
          setStep(3);
        }
      });
    };

    const exactMatch = customers.find(c => c.name.toLowerCase() === rawSearch.toLowerCase());
    if (exactMatch) {
      processOrder(exactMatch.id);
    } else {
      const defaultRouteId = routes.length > 0 ? routes[0].id : 1;
      createCustomer({
        name: rawSearch,
        phone: "0000000000",
        address: "Walk-in Shop",
        routeId: defaultRouteId,
        creditBalance: 0
      }, {
        onSuccess: (newCust) => processOrder(newCust.id),
        onError: (err: any) => toast({ title: "Failed to create shop", description: err.message, variant: "destructive" })
      });
    }
  };

  const total = calculateTotal();
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // --- Swipe Navigation Logic ---
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);
  // -----------------------------

  if (step === 3 && completedOrder) {
    const isWebBLE = !!(navigator as any).bluetooth;

    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-300 pb-32 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-display font-black text-slate-800 tracking-tight text-center">Order Complete!</h2>
        <p className="text-muted-foreground text-center">Order #{completedOrder.id} successfully recorded.</p>

        <Card className="w-full p-6 mt-6 bg-white border-dashed border-2 border-border/50">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Paid ({completedOrder.paymentMode})</span>
            <span className="text-2xl text-primary">₹{completedOrder.totalAmount}</span>
          </div>
        </Card>

        <div className="w-full space-y-4 pt-8">
          {isWebBLE ? (
            <Button onClick={() => printReceipt(completedOrder)} disabled={isPrinting} className="w-full h-16 rounded-2xl text-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
              {isPrinting ? "Connecting Printer..." : "🖨️ Print Receipt via Bluetooth"}
            </Button>
          ) : (
            <Button onClick={() => window.print()} className="w-full h-16 rounded-2xl text-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
              🖨️ Print Receipt
            </Button>
          )}
          <Button onClick={() => { setStep(1); setCompletedOrder(null); }} variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold border-2">
            New Order
          </Button>
        </div>
      </div>
    );
  }

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
            {Object.entries(cart).map(([id, qty]) => {
              const p = products.find(p => p.id === parseInt(id));
              return (
                <div key={id} className="flex justify-between text-sm">
                  <span>{qty}x {p?.name}</span>
                  <span className="font-medium">₹{(p?.price || 0) * qty}</span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <span className="font-bold text-lg">Total Amount</span>
            <span className="font-black text-2xl text-primary">₹{total}</span>
          </div>
        </Card>

        <div className="space-y-3">
          <label className="font-semibold text-sm px-1">Payment Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {["Cash", "UPI", "Credit"].map(mode => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`p-4 rounded-xl border-2 font-bold transition-all ${paymentMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 bg-white text-muted-foreground'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={isPending || isCreatingCustomer}
          className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/30 mt-8"
        >
          {isPending || isCreatingCustomer ? "Processing..." : "Complete Order"}
        </Button>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()));

  // Unified list logic
  const allAvailableItems = products.map(p => {
    const truckQty = stock.find(s => s.productId === p.id)?.casesAvailable ?? 0;
    const godownQty = godownStock.find(g => g.productId === p.id)?.casesAvailable ?? 0;
    const totalQty = truckQty + godownQty;
    if (totalQty === 0) return null;
    return { p, truckQty, godownQty, totalQty };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => getCategoryOrder(a.p.id) - getCategoryOrder(b.p.id));

  const followUpItems = allAvailableItems.filter(item => item.truckQty === 0 && item.godownQty > 0);

  // Group items by category for slides
  const categoriesPresent = Array.from(new Set(allAvailableItems.map(item => item.p.category)))
    .sort((a, b) => (categoryOrder[a] ?? 99) - (categoryOrder[b] ?? 99));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      <div className="space-y-2 relative">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4" /> Enter Shop Name
        </label>

        <Input
          value={customerSearch}
          onChange={e => {
            setCustomerSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Type shop name..."
          className="h-14 rounded-2xl text-lg px-4 border-border/50 shadow-sm bg-white"
        />

        {showDropdown && customerSearch.length > 0 && (
          <div className="absolute top-[80px] left-0 right-0 max-h-60 overflow-y-auto bg-white border border-border/50 rounded-xl shadow-xl z-50">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => setCustomerSearch(c.name)}
                  className="p-3 border-b border-border/50 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="font-bold text-base">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.address}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 bg-slate-50">
                <Plus className="w-4 h-4 text-primary" /> "{customerSearch}" will be added at checkout.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-col h-full overflow-hidden">
        {/* Category Tab Bar (Sticky) */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar sticky top-0 bg-background z-10 px-1">
          {categoriesPresent.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => scrollTo(idx)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border-2 ${
                selectedIndex === idx 
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' 
                  : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
              }`}
            >
              {categoryLabel[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Swipeable Content */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {categoriesPresent.map(cat => (
              <div key={cat} className="flex-[0_0_100%] min-w-0 px-1">
                <div className="space-y-3">
                  {allAvailableItems
                    .filter(item => item.p.category === cat)
                    .map(({ p, truckQty, godownQty, totalQty }) => {
                      const qty = cart[p.id] || 0;
                      return (
                        <Card key={p.id} className="p-4 rounded-2xl border-border/50 shadow-sm bg-white overflow-hidden relative">
                          {qty > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}
                          <div className="flex justify-between items-start pl-1 gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-border/30">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-base leading-tight truncate">{p.name}</h4>
                                <p className="text-sm font-bold text-slate-700 mt-1">Total: {totalQty} cs</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${truckQty > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>🚛 {truckQty}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${godownQty > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400 bg-slate-100'}`}>🏭 {godownQty}</span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 pt-1">
                              {qty === 0 ? (
                                <Button onClick={() => handleQty(p.id, 1, totalQty)} variant="outline" className="rounded-xl font-bold text-primary border-primary/20 hover:bg-primary/10 h-11 px-6">
                                  Add
                                </Button>
                              ) : (
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-border/50">
                                  <button onClick={() => handleQty(p.id, -1, totalQty)} className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95"><Minus className="w-4 h-4" /></button>
                                  <span className="font-black text-lg w-6 text-center">{qty}</span>
                                  <button onClick={() => handleQty(p.id, 1, totalQty)} className="w-9 h-9 rounded-lg bg-primary text-white shadow-sm flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
                                </div>
                              )}
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

        {allAvailableItems.length === 0 && (
          <div className="text-center p-12 text-muted-foreground bg-white rounded-3xl border-2 border-dashed border-slate-100 mx-1 mt-4">
            No stock available in Truck or Godown.
          </div>
        )}

        {/* ── Central Godown Follow-up Reminder Panel ── */}
        {followUpItems.length > 0 && (
          <div className="mt-8 p-6 rounded-3xl border-2 border-amber-200 bg-amber-50/80 flex items-start gap-4 shadow-sm animate-in slide-in-from-bottom-4 duration-700 mx-1">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
               <Bell className="w-7 h-7 text-amber-600" />
            </div>
            <div className="pt-1">
               <h4 className="font-black text-amber-900 text-lg tracking-tight uppercase">Supply Reminder</h4>
               <p className="text-sm text-amber-800 font-medium leading-relaxed mt-2">
                 Additional stock must be supplied from the godown later for items currently missing from the truck.
               </p>
               <div className="mt-4 flex items-center gap-2">
                 <span className="text-xs font-black bg-amber-200 text-amber-900 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                   {followUpItems.length} missing items
                 </span>
               </div>
            </div>
          </div>
        )}
      </div>

      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 z-30 pointer-events-none flex justify-center">
          <div className="max-w-md w-full pointer-events-auto">
            <Button
              onClick={() => {
                if (!customerSearch.trim()) toast({ title: "Enter shop name first", variant: "destructive" });
                else setStep(2);
              }}
              className="w-full h-18 rounded-3xl shadow-[0_10px_50px_-10px_rgba(37,99,235,0.6)] text-xl font-bold flex justify-between px-8 items-center bg-primary"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-1.5 rounded-xl text-sm font-black tracking-tight">{cartItemCount} ITEMS</div>
              </div>
              <div className="flex items-center gap-3">
                <span>CHECKOUT</span>
                <span className="bg-white text-primary px-4 py-1.5 rounded-xl font-black">₹{total}</span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
