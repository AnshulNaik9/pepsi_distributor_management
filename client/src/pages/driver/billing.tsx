import { useState, useEffect } from "react";
import { useCustomers, useCheckout } from "@/hooks/use-sales";
import { useTruckStock } from "@/hooks/use-logistics";
import { useProducts } from "@/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus, ShoppingCart, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SpotBillingPage() {
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const { data: customers = [] } = useCustomers();
  const { data: stock = [] } = useTruckStock(truckId);
  const { data: products = [] } = useProducts();
  const { mutate: checkout, isPending } = useCheckout();
  const { toast } = useToast();

  const [customerId, setCustomerId] = useState<string>("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [step, setStep] = useState(1); // 1: Select Customer & Items, 2: Checkout

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
    if (!customerId) return toast({ title: "Select a customer", variant: "destructive" });
    
    const items = Object.entries(cart).map(([id, qty]) => ({
      productId: parseInt(id),
      quantity: qty
    }));

    checkout({
      customerId: parseInt(customerId),
      truckId,
      paymentMode,
      items
    }, {
      onSuccess: () => {
        toast({ title: "Order successful!" });
        setCart({});
        setCustomerId("");
        setStep(1);
      }
    });
  };

  const total = calculateTotal();
  const cartItemCount = Object.values(cart).reduce((a,b) => a+b, 0);

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
        <button onClick={() => setStep(1)} className="text-sm font-semibold text-primary mb-4">← Back to Cart</button>
        <h2 className="text-2xl font-display font-bold">Checkout Summary</h2>
        
        <Card className="p-5 rounded-2xl space-y-4 shadow-md border-border/50">
          <div className="flex justify-between items-center pb-4 border-b border-border/50">
            <span className="text-muted-foreground font-medium">Customer</span>
            <span className="font-bold text-lg">{customers.find(c => c.id === parseInt(customerId))?.name}</span>
          </div>
          
          <div className="space-y-2 pt-2">
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
          disabled={isPending} 
          className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/30 mt-8"
        >
          {isPending ? "Processing..." : "Complete Order"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4" /> Select Customer
        </label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="h-14 rounded-2xl bg-white border-border/50 shadow-sm text-lg px-4">
            <SelectValue placeholder="Choose a customer..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {customers.map(c => <SelectItem key={c.id} value={c.id.toString()} className="text-lg py-3">{c.name} - {c.address}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Available Products</h3>
        <div className="space-y-3">
          {stock.filter(s => s.casesAvailable > 0).map(s => {
            const p = products.find(p => p.id === s.productId);
            if (!p) return null;
            const qty = cart[p.id] || 0;
            
            return (
              <Card key={s.id} className="p-4 rounded-2xl border-border/50 shadow-sm bg-white overflow-hidden relative">
                {qty > 0 && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-lg leading-tight">{p.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">₹{p.price} • Stock: {s.casesAvailable}</p>
                  </div>
                  
                  {qty === 0 ? (
                    <Button onClick={() => handleQty(p.id, 1, s.casesAvailable)} variant="outline" className="rounded-xl font-bold text-primary border-primary/20 hover:bg-primary/10 h-10 px-6">
                      Add
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-border/50">
                      <button onClick={() => handleQty(p.id, -1, s.casesAvailable)} className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95"><Minus className="w-5 h-5"/></button>
                      <span className="font-bold text-xl w-6 text-center">{qty}</span>
                      <button onClick={() => handleQty(p.id, 1, s.casesAvailable)} className="w-10 h-10 rounded-lg bg-primary text-white shadow-sm flex items-center justify-center active:scale-95"><Plus className="w-5 h-5"/></button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          {stock.length === 0 && <div className="text-center p-8 text-muted-foreground bg-white rounded-2xl border border-dashed">Truck is empty. Load stock from admin.</div>}
        </div>
      </div>

      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 z-30 pointer-events-none flex justify-center">
          <div className="max-w-md w-full pointer-events-auto">
            <Button 
              onClick={() => {
                if(!customerId) toast({title:"Select customer first", variant:"destructive"});
                else setStep(2);
              }}
              className="w-full h-16 rounded-2xl shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] text-lg font-bold flex justify-between px-6 items-center"
            >
              <div className="flex items-center gap-2">
                <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">{cartItemCount} items</div>
              </div>
              <div className="flex items-center gap-2">
                <span>Checkout</span>
                <span className="bg-white text-primary px-3 py-1 rounded-lg">₹{total}</span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
