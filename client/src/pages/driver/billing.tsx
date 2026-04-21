import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import { useCustomers, useCheckout, useCreateCustomer, useOffers } from "@/hooks/use-sales";
import { useTruckStock, useRoutes } from "@/hooks/use-logistics";
import { useProducts, useGodownStock } from "@/hooks/use-inventory";
import { useBluetoothPrinter } from "@/hooks/use-printer";
import { formatQuantity } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, User, CheckCircle2, Package, Bell, Phone, MapPin, Store, Check, X, Zap, History, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";

export default function SpotBillingPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const routeId = parseInt(localStorage.getItem('driver_route_id') || "0");
  const { data: customers = [] } = useCustomers(routeId);
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();
  const { data: godownStock = [] } = useGodownStock();
  const { data: routes = [] } = useRoutes();
  const { data: offers = [] } = useOffers();
  const [, setLocation] = useLocation();

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
  const [shopPhone, setShopPhone] = useState("");
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const [tempQty, setTempQty] = useState("");
  
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartPrices, setCartPrices] = useState<Record<number, number>>({});
  const [cartCustomFree, setCartCustomFree] = useState<Record<number, number>>({});
  
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, upi: 0, credit: 0 });
  const [step, setStep] = useState(1);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const { printReceipt, isConnecting: isPrinting } = useBluetoothPrinter();

  const handleBrowserPrint = (order: any) => {
    const doc = window.open("", "_blank", "width=420,height=700");
    if (!doc) return toast({ title: "Popup blocked", description: "Please allow popups to print.", variant: "destructive" });

    const orderDate = new Date((order as any).date || Date.now()).toLocaleDateString();
    const shopName = order?.customer?.name || "Walk-in Shop";
    const shopPhoneNo = order?.customer?.phone || "";
    const items = order?.items || [];
    const totalAmount = order?.totalAmount ?? 0;

    const itemRows = items
      .map((item: any) => {
        const name = item?.product?.name || "Product";
        const qty = formatQuantity(item.quantity * (item?.product?.itemsPerCase || 1), item?.product?.itemsPerCase || 1);
        const amt = item?.isFree ? "FREE" : `Rs ${Math.round((item?.customPrice || item?.product?.price || 0) * item.quantity)}`;
        return `<tr><td style="padding: 4px 0;">${name} x ${qty}</td><td style="text-align:right;">${amt}</td></tr>`;
      })
      .join("");

    doc.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice #${order?.id || "NEW"}</title>
          <style>
            @page { size: 58mm auto; margin: 3mm; }
            body { margin: 0; font-family: "Courier New", monospace; color: #000; }
            .receipt { width: 48mm; margin: 0 auto; font-size: 10px; line-height: 1.1; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .line { border-top: 1px dashed #000; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; padding: 1px 0; }
            .total { font-weight: 700; font-size: 11px; margin-top: 3px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold" style="font-size:12px;">CS MARKETING</div>
            <div class="line"></div>
            <div class="center bold">INVOICE</div>
            <div class="center">Order #${order?.orderNumber || order?.id || "NEW"}</div>
            <div class="center">${orderDate}</div>
            <div class="line"></div>
            <div>Shop: ${shopName}</div>
            <div class="line"></div>
            <div class="bold">ITEMS</div>
            <table>${itemRows}</table>
            <div class="line"></div>
            <div class="total">GRAND TOTAL: Rs ${totalAmount}</div>
            <div class="center" style="margin-top:20px; font-size: 10px;">THANK YOU!</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    doc.document.close();
  };

  useEffect(() => {
    if (!truckId) setLocation("/driver/select");
  }, [truckId, setLocation]);

  const handleQty = (productId: number, delta: number, max: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(max * (products.find(p => p.id === productId)?.itemsPerCase || 1), current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        setCartPrices(cp => {
          const cpCopy = { ...cp };
          delete cpCopy[productId];
          return cpCopy;
        });
        return copy;
      }
      return { ...prev, [productId]: next };
    });
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

    const selectedCust = customers.find(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase());
    if (selectedCust?.hasSpecialDiscount && sum > 0) {
      sum = Math.max(0, sum - 20);
    }
    return Math.round(sum);
  };

  const isExcludedFromDefaultFree = (productName: string) => {
    const name = productName.toLowerCase();
    return (
      (name.includes("soda") && name.includes("2.25")) ||
      (name.includes("pepsi") && name.includes("1") && (name.includes("ltr") || name.includes("ltr.") || name.includes("1l"))) ||
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
    const fallbackAquafina = products.find(p => p.name.toLowerCase().includes("aquafina 1l") || p.name.toLowerCase().includes("aquafina"));
    const fallbackId = fallbackAquafina?.id || 0;
    
    let totalPromoCases = 0;

    Object.entries(cart).forEach(([id, qtyBtls]) => {
      const productId = parseInt(id);
      const p = products.find(prod => prod.id === productId);
      const itemsPerCase = p?.itemsPerCase || 1;
      const cases = qtyBtls / itemsPerCase;
      
      let pFree = 0;
      let freeProductId = fallbackId;

      offers.forEach(offer => {
        if (offer.buyProductId === productId && cases >= offer.buyQuantity) {
          const mult = Math.floor(cases / offer.buyQuantity);
          const qty = mult * offer.freeQuantity;
          if (qty > pFree) pFree = qty;
          freeProductId = offer.freeProductId;
        }
      });
      
      const customFree = cartCustomFree[productId] || 0;
      if (customFree > 0 && freeProductId > 0) {
         freeItems[freeProductId] = (freeItems[freeProductId] || 0) + customFree;
      }

      if (pFree > 0) {
         if (freeProductId > 0) freeItems[freeProductId] = (freeItems[freeProductId] || 0) + pFree;
      } else if (isPromoEligible(p)) {
         totalPromoCases += cases;
      }
    });

    const globalFree = Math.floor(totalPromoCases) * 2;
    if (globalFree > 0 && fallbackId > 0) {
      freeItems[fallbackId] = (freeItems[fallbackId] || 0) + globalFree;
    }

    return freeItems;
  };

  const handleCheckout = () => {
    const rawSearch = customerSearch.trim();
    if (!rawSearch) return toast({ title: "Enter shop name", variant: "destructive" });

    const totalVal = calculateTotal();
    if (paymentMode === "Split") {
      const splitTotal = Math.round(splitAmounts.cash + splitAmounts.upi + splitAmounts.credit);
      if (splitTotal !== totalVal) {
        return toast({ title: "Split mismatch", description: `Difference: ₹${Math.round(totalVal - splitTotal)}`, variant: "destructive" });
      }
    }

    const items = Object.entries(cart).map(([id, qtyBtls]) => {
      const pId = parseInt(id);
      const p = products.find(prod => prod.id === pId);
      const itemsPerCase = p?.itemsPerCase || 1;
      return {
        productId: pId,
        quantity: parseFloat((qtyBtls / itemsPerCase).toFixed(4)),
        customPrice: cartPrices[pId],
        customFreeQty: cartCustomFree[pId],
      };
    });

    const processOrder = (cid: number) => {
      checkout({
        customerId: cid,
        truckId,
        paymentMode,
        splitAmounts: paymentMode === "Split" ? splitAmounts : undefined,
        items
      }, {
        onSuccess: (orderData) => {
          toast({ title: "Order saved! ✅" });
          setCompletedOrder(orderData);
          setCart({});
          setCartPrices({});
          setCartCustomFree({});
          setCustomerSearch("");
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
        phone: shopPhone || "0000000000",
        address: "New Business",
        routeId: routeId || 1,
        creditBalance: 0
      }, {
        onSuccess: (newCust) => processOrder(newCust.id)
      });
    }
  };

  const total = calculateTotal();
  const freeItemsMap = computeFreeItems();
  const totalFreeBottles = Object.values(freeItemsMap).reduce((a, b) => a + b, 0);

  // --- Category Tabs ---
  const allAvailableItems = products.map(p => {
    const truckQty = stock.find(s => s.productId === p.id)?.casesAvailable ?? 0;
    const godownQty = godownStock.find(g => g.productId === p.id)?.casesAvailable ?? 0;
    const totalQty = truckQty + godownQty;
    // if (totalQty === 0) return null;
    return { p, truckQty, godownQty, totalQty };
  }) // .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => getCategoryOrder(a.p.id) - getCategoryOrder(b.p.id));

  const categoriesPresent = Array.from(new Set(allAvailableItems.map(item => item.p.category)))
    .sort((a, b) => (categoryOrder[a] ?? 99) - (categoryOrder[b] ?? 99));

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi]);

  if (step === 3 && completedOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner border border-emerald-100">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Bill Generated!</h2>
          <p className="text-slate-500 mt-2 font-medium">Order #{completedOrder.id} successfully recorded.</p>
        </div>
        <Card className="w-full max-w-sm p-6 bg-white border-2 border-emerald-50 rounded-3xl">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Amount Paid</span>
            <Badge className="bg-emerald-500 text-white font-black text-lg px-4 py-1">₹{completedOrder.totalAmount}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <Zap className="w-4 h-4 text-emerald-500" /> {completedOrder.paymentMode}
          </div>
        </Card>
        <div className="w-full max-w-sm space-y-3">
          <Button onClick={() => printReceipt(completedOrder)} disabled={isPrinting} className="w-full h-16 rounded-2xl text-xl font-black bg-slate-900 shadow-2xl hover:bg-slate-800">
            {isPrinting ? "Printer Sync..." : "🖨️ Thermal Print"}
          </Button>
          <Button onClick={() => handleBrowserPrint(completedOrder)} variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold border-2">
            📄 Browse View
          </Button>
          <Button onClick={() => setStep(1)} variant="ghost" className="w-full h-14 font-black text-slate-400">
            Create New Invoice
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-10 duration-500 pb-40">
        <Button onClick={() => setStep(1)} variant="secondary" className="rounded-full px-6 font-bold shadow-sm">
          ← Edit Items
        </Button>
        <h2 className="text-3xl font-black text-slate-800">Review Bill</h2>

        <Card className="overflow-hidden rounded-3xl border-2 border-slate-100 shadow-xl">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-end">
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer</p>
               <h3 className="text-xl font-black tracking-tight">{customerSearch.trim()}</h3>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Finalizing
                </div>
             </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3">
              {Object.entries(cart).map(([id, qty]) => {
                const p = products.find(p => p.id === parseInt(id));
                const price = cartPrices[p?.id || 0] ?? p?.price ?? 0;
                const itemsPerCase = p?.itemsPerCase || 1;
                return (
                  <div key={id} className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-500">{formatQuantity(qty, itemsPerCase)} {p?.name}</span>
                    <span className="text-slate-800">₹{Math.round(price * (qty / itemsPerCase))}</span>
                  </div>
                );
              })}
              {Object.entries(freeItemsMap).map(([id, qty]) => {
                const p = products.find(p => p.id === Number(id));
                return (
                  <div key={`free-${id}`} className="flex justify-between items-center text-sm font-black text-emerald-600 bg-emerald-50/50 p-2 rounded-xl">
                    <span>🎁 {qty} Free {p?.name}</span>
                    <span>FREE</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-6 border-t-2 border-slate-50 flex justify-between items-baseline">
              <span className="text-slate-400 font-bold uppercase text-xs">Grand Total</span>
              <span className="text-4xl font-black text-primary tracking-tighter">₹{total}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Label className="text-sm font-black uppercase text-slate-400 ml-1">Payment Method</Label>
          <div className="grid grid-cols-2 gap-3">
            {["Cash", "UPI", "Credit", "Split"].map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setPaymentMode(mode);
                  if (mode === "Split") setSplitAmounts({ cash: total, upi: 0, credit: 0 });
                }}
                className={`h-16 rounded-2xl border-2 font-black text-lg transition-all shadow-sm ${paymentMode === mode ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {paymentMode === "Split" && (
          <Card className="p-6 rounded-3xl border-2 border-primary/10 shadow-lg space-y-5 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><History className="w-4 h-4 text-primary" /></div>
                <h4 className="font-black text-slate-800">Multi-Channel Payment</h4>
             </div>
             {Object.keys(splitAmounts).map(k => (
               <div key={k} className="flex items-center gap-4">
                 <Label className="w-16 font-black uppercase text-[10px] text-slate-400">{k}</Label>
                 <Input 
                   type="number" 
                   value={(splitAmounts as any)[k] || ""} 
                   onChange={e => setSplitAmounts(prev => ({...prev, [k]: Number(e.target.value) || 0}))} 
                   className="h-12 rounded-xl font-black border-slate-100 focus:border-primary bg-slate-50" 
                 />
               </div>
             ))}
          </Card>
        )}

        <Button
          onClick={handleCheckout}
          disabled={isPending || isCreatingCustomer}
          className="w-full h-20 rounded-[32px] text-2xl font-black shadow-2xl shadow-primary/40 mt-6 active:scale-95 transition-transform"
        >
          {isPending || isCreatingCustomer ? "Recording..." : `Confirm & Pay ₹${total}`}
        </Button>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.trim().toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-40">
      {/* Search & Custom Shop Logic */}
      <div className="space-y-3 relative group">
        <div className="flex justify-between items-center px-1">
          <Label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <Store className="w-3 h-3" /> Billing Terminal
          </Label>
          <Badge variant="outline" className="rounded-lg font-black text-[10px] border-slate-200 text-slate-400">RT-{routeId || '00'}</Badge>
        </div>
        <div className="relative">
          <Input
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search Shop Name..."
            className="h-16 rounded-2xl text-xl font-black pl-14 border-2 border-slate-100 shadow-sm focus:border-primary/50 transition-all bg-white"
          />
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
            <User className="w-6 h-6" />
          </div>
          {customerSearch.length > 0 && (
            <button onClick={() => setCustomerSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
               <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {showDropdown && customerSearch.length > 0 && (
          <div className="absolute top-[84px] left-0 right-0 max-h-80 overflow-y-auto bg-white border-2 border-slate-100 rounded-[32px] shadow-2xl z-50 p-3 space-y-1">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerSearch(c.name); setShowDropdown(false); }}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {c.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800">{c.name}</div>
                    <div className="text-[10px] font-black uppercase text-slate-400 opacity-70 tracking-tight">{c.address} • {c.phone}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <div className="p-4">
                 <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div>
                    <div>
                       <h5 className="font-black text-emerald-900 leading-tight">Create Shop "{customerSearch}"</h5>
                       <p className="text-[10px] font-black text-emerald-700 uppercase opacity-70">Will be saved on checkout</p>
                    </div>
                 </div>
                 <div className="mt-4 px-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Ph Number (Optional)</Label>
                    <Input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="000-000-0000" className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold" />
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Categories */}
      <div className="flex flex-col h-full">
        <div className="flex gap-2 overflow-x-auto pb-6 hide-scrollbar px-1 sticky top-0 bg-background/80 backdrop-blur-lg z-10 pt-2">
          {categoriesPresent.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2 ${
                selectedIndex === idx 
                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30 scale-105' 
                  : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
              }`}
            >
              {categoryLabel[cat] ?? cat}
            </button>
          ))}
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {categoriesPresent.length > 0 ? categoriesPresent.map(cat => (
              <div key={cat} className="flex-[0_0_100%] min-w-0 px-1">
                <div className="grid grid-cols-2 gap-3">
                  {allAvailableItems
                    .filter(item => item.p.category === cat)
                    .map(({ p, truckQty, godownQty, totalQty }) => {
                      const qtyBtls = cart[p.id] || 0;
                      const itemsPerCase = p.itemsPerCase || 1;
                      const currentPrice = cartPrices[p.id] !== undefined ? cartPrices[p.id] : p.price;
                      
                      // Auto-calc free bottles
                      let autocalcFree = 0;
                      offers.forEach(o => {
                        if (o.buyProductId === p.id && (qtyBtls / itemsPerCase) >= o.buyQuantity) {
                          autocalcFree = Math.floor((qtyBtls / itemsPerCase) / o.buyQuantity) * o.freeQuantity;
                        }
                      });
                      if (autocalcFree === 0 && isPromoEligible(p)) {
                        autocalcFree = Math.floor(qtyBtls / itemsPerCase) * 2;
                      }
                      const totalItemFree = autocalcFree + (cartCustomFree[p.id] || 0);

                      return (
                        <Card key={p.id} className={`p-4 rounded-3xl border-2 transition-all relative overflow-hidden group ${qtyBtls > 0 ? 'border-primary bg-primary/[0.02] shadow-xl' : 'border-slate-50 hover:border-slate-100 shadow-sm'}`}>
                          <div className="flex flex-col h-full space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-slate-50 overflow-hidden">
                                 {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-contain p-1" /> : <Package className="w-6 h-6 text-slate-200" />}
                              </div>
                              <div className="text-right">
                                 <span className="text-[10px] font-black text-slate-300 uppercase block tracking-tighter">Stock Available</span>
                                 <span className="text-sm font-black text-slate-800">{Math.round(totalQty)}<span className="text-[10px] opacity-40 ml-0.5">CS</span></span>
                              </div>
                            </div>
                            
                            <div>
                               <h4 className="font-black text-slate-800 leading-tight text-base tracking-tight truncate">{p.name}</h4>
                               <div className="flex items-center gap-1.5 mt-2 bg-slate-50 rounded-lg pr-3 py-1 self-start border border-slate-100">
                                  <div className="bg-primary text-white p-1 rounded-md"><Zap className="w-3 h-3" /></div>
                                  <Input 
                                    type="number" 
                                    className="w-14 h-6 p-0 border-none bg-transparent font-black text-primary text-center focus-visible:ring-0 shadow-none" 
                                    value={currentPrice} 
                                    onChange={e => setCartPrices(prev => ({...prev, [p.id]: Number(e.target.value)}))}
                                  />
                                  <span className="text-[10px] font-black text-slate-400">/CS</span>
                               </div>
                            </div>

                            {/* Promo Logic */}
                            {(totalItemFree > 0 || (p.name.toLowerCase().includes('aquafina 1l') && p.price > 0)) && (
                              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-2 flex items-center justify-between">
                                 <div className="flex items-center gap-1.5">
                                    <Badge className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 h-auto">⚡ {totalItemFree}</Badge>
                                    <span className="text-[9px] font-black text-blue-600 uppercase">Free</span>
                                 </div>
                                 <div className="flex items-center gap-1 bg-white rounded-lg border border-blue-100 p-0.5">
                                    <button onClick={() => setCartCustomFree(pv => ({...pv, [p.id]: Math.max(-(autocalcFree), (pv[p.id] || 0) - 1)}))} className="w-5 h-5 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded"><Minus className="w-3 h-3" /></button>
                                    <span className="text-[10px] font-black w-3 text-center text-blue-800">{totalItemFree}</span>
                                    <button onClick={() => setCartCustomFree(pv => ({...pv, [p.id]: (pv[p.id] || 0) + 1}))} className="w-5 h-5 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded"><Plus className="w-3 h-3" /></button>
                                 </div>
                              </div>
                            )}

                            {/* Controls */}
                            <div className="space-y-2 pt-2 border-t border-slate-50">
                               <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-1">
                                  <span className="text-[9px] font-black uppercase text-slate-300 ml-2">CS</span>
                                  <div className="flex items-center gap-2">
                                     <button onClick={() => handleQty(p.id, -itemsPerCase, totalQty)} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                                     <span className="font-black text-slate-800 w-4 text-center">{Math.floor(qtyBtls / itemsPerCase)}</span>
                                     <button onClick={() => handleQty(p.id, itemsPerCase, totalQty)} className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                                  </div>
                               </div>
                               <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-1">
                                  <span className="text-[9px] font-black uppercase text-slate-300 ml-2">Btl</span>
                                  <div className="flex items-center gap-2">
                                     <button onClick={() => handleQty(p.id, -1, totalQty)} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                                     <span className="font-black text-slate-800 w-4 text-center">{Math.round(qtyBtls % itemsPerCase)}</span>
                                     <button onClick={() => handleQty(p.id, 1, totalQty)} className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                                  </div>
                               </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )) : (
              <div className="w-full py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                   <Package className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold">No products found in catalog.</p>
                <p className="text-[10px] text-slate-300 uppercase font-black">Checking API Connection...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Persistence Bar */}
      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-6 z-40 animate-in slide-in-from-bottom-5 duration-500 pointer-events-none">
          <Button 
            onClick={() => setStep(2)}
            className="w-full h-20 rounded-[32px] shadow-2xl shadow-primary/40 flex justify-between px-10 items-center pointer-events-auto bg-primary hover:bg-primary/95 transition-all group active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 px-5 py-2 rounded-2xl text-xs font-black tracking-widest text-white">{Object.keys(cart).length} LOADED</div>
              {totalFreeBottles > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-xl font-black text-[10px] animate-bounce">
                  <Zap className="w-3 h-3 fill-current" /> {totalFreeBottles} FREE
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-black text-white group-hover:translate-x-1 transition-transform tracking-tight">GO TO BILLING</span>
              <div className="bg-white text-primary px-5 py-2.5 rounded-2xl font-black text-xl shadow-inner">₹{total}</div>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
