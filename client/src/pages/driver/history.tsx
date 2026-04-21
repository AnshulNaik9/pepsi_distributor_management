import { useState, useEffect } from "react";
import { useOrders, useDeleteOrder, useUpdateOrder } from "@/hooks/use-sales";
import { useBluetoothPrinter } from "@/hooks/use-printer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, User, Package, IndianRupee, Trash2, Calendar, Edit2, Plus, Minus, Save, ChevronDown, ChevronUp, Zap, Filter, Search, ArrowLeft } from "lucide-react";
import { format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function EditOrderDialog({ order, onDelete }: { order: any, onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const { mutate: updateOrder, isPending } = useUpdateOrder();
  const { toast } = useToast();
  
  const [items, setItems] = useState<Record<number, number>>({});
  
  useEffect(() => {
    if (open) {
      const initial: Record<number, number> = {};
      order.items?.forEach((i: any) => {
         if (!i.isFree) initial[i.productId] = i.quantity;
      });
      setItems(initial);
    }
  }, [open, order]);

  const handleQty = (productId: number, delta: number) => {
    setItems(prev => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const handleSave = () => {
    const finalItems = Object.entries(items)
      .filter(([_, qty]) => qty > 0)
      .map(([id, quantity]) => ({ productId: parseInt(id), quantity }));
      
    if (finalItems.length === 0) {
      onDelete(order.id);
      setOpen(false);
      return;
    }

    updateOrder({ id: order.id, data: { ...order, items: finalItems } }, {
      onSuccess: () => {
        toast({ title: "Order Updated!" });
        setOpen(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const currentTotal = Math.round(order.items?.reduce((sum: number, item: any) => {
    if (item.isFree) return sum;
    const price = item.customPrice !== null ? item.customPrice : (item.product?.price || 0);
    return sum + (items[item.productId] || 0) * price;
  }, 0) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={(e) => e.stopPropagation()} variant="ghost" size="sm" className="h-10 rounded-xl text-blue-500 hover:text-blue-600 hover:bg-blue-50 font-bold gap-2 px-4 transition-all">
          <Edit2 className="w-4 h-4" /> Edit Logs
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()} className="rounded-3xl max-w-[95vw] md:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-800 flex justify-between items-center">
            <span>Edit Order</span>
            <span className="text-primary tracking-tight">₹{currentTotal}</span>
          </DialogTitle>
          <p className="text-xs font-bold text-slate-400 mt-1">{order.customer?.name}</p>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[50vh] overflow-y-auto pr-1">
          {order.items?.filter((i: any) => !i.isFree).map((item: any) => {
            const qty = items[item.productId] ?? item.quantity;
            return (
              <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-3">
                 <div>
                   <h4 className="font-bold text-sm text-slate-800">{item.product?.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400">Unit: ₹{item.customPrice !== null ? item.customPrice : item.product?.price}</p>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 self-start sm:self-auto">
                    <button onClick={() => handleQty(item.productId, -1)} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 active:scale-90 transition-all hover:text-red-500">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-black text-[11px] leading-tight flex items-center justify-center">
                      {formatQuantity(qty * (item.product?.itemsPerCase || 1), item.product?.itemsPerCase || 1)}
                    </span>
                    <button onClick={() => handleQty(item.productId, 1)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all hover:bg-primary hover:text-white">
                      <Plus className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
           <Button variant="destructive" className="w-14 rounded-2xl h-14 shadow-lg shrink-0" onClick={() => { onDelete(order.id); setOpen(false); }}>
             <Trash2 className="w-5 h-5" />
           </Button>
           <Button onClick={handleSave} disabled={isPending} className="flex-1 rounded-2xl h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20">
             {isPending ? "Saving..." : "Save Changes"}
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HistoryPage() {
  const { data: orders = [], isLoading } = useOrders();
  const { mutate: deleteOrder } = useDeleteOrder();
  const { toast } = useToast();
  const { printReceipt, isConnecting: isPrinting } = useBluetoothPrinter();
  const truckId = parseInt(localStorage.getItem('driver_truck_id') || "0");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [previewOrder, setPreviewOrder] = useState<any | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = orders.filter(o => {
    if (o.truckId !== truckId) return false;
    
    // Default: Show only today
    const orderDate = new Date(o.date as any);
    
    // Search filter
    if (searchQuery && !o.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (!showHistory) {
      return isToday(orderDate);
    }

    // History mode: Date range filter
    const dStr = format(orderDate, "yyyy-MM-dd");
    return dStr >= startDate && dStr <= endDate;
  });

  const handleDelete = (id: number) => {
    deleteOrder(id, {
      onSuccess: () => toast({ title: "Order deleted" }),
      onError: (err: any) => toast({ title: "Failed to delete", description: err.message, variant: "destructive" })
    });
  };

  const handleBrowserPrint = (order: any) => {
    const doc = window.open("", "_blank", "width=420,height=700");
    if (!doc) {
      toast({ title: "Popup blocked", description: "Please allow popups to print.", variant: "destructive" });
      return;
    }

    const orderDate = new Date((order as any).date || Date.now()).toLocaleDateString();
    const shopName = order?.customer?.name || "Walk-in Shop";
    const shopPhoneNo = order?.customer?.phone || "";
    const items = order?.items || [];
    const totalAmount = order?.totalAmount ?? 0;
    const payMode = order?.paymentMode || "Cash";

    const itemRows = items
      .map((item: any) => {
        const name = item?.product?.name || "Product";
        const qty = item?.isFree
          ? formatQuantity(item.quantity, item?.product?.itemsPerCase || 1)
          : formatQuantity(
              item.quantity * (item?.product?.itemsPerCase || 1),
              item?.product?.itemsPerCase || 1,
            );
        const amt = item?.isFree
          ? "FREE"
          : `Rs ${Math.round((item?.customPrice || item?.product?.price || 0) * item.quantity)}`;
        return `<tr><td>${name} x ${qty}</td><td style="text-align:right;white-space:nowrap;">${amt}</td></tr>`;
      })
      .join("");

    doc.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice #${order?.id || "NA"}</title>
          <style>
            @page { size: 58mm auto; margin: 3mm; }
            body { margin: 0; font-family: "Courier New", monospace; color: #000; }
            .receipt { width: 52mm; margin: 0 auto; font-size: 11px; line-height: 1.25; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 1px 0; vertical-align: top; }
            .total { font-weight: 700; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold" style="font-size:14px;">CS MARKETING</div>
            <div class="line"></div>
            <div class="center bold">INVOICE</div>
            <div class="center">Order #${order?.id || "NA"}</div>
            <div class="center">${orderDate}</div>
            <div class="line"></div>
            <div>Shop Name - ${shopName}</div>
            ${shopPhoneNo ? `<div>Phone - ${shopPhoneNo}</div>` : ""}
            <div class="line"></div>
            <div class="bold">Items</div>
            <table>${itemRows}</table>
            <div class="line"></div>
            <div class="total">Total - Rs ${totalAmount}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    doc.document.close();
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => <Card key={i} className="h-16 animate-pulse bg-muted/50 rounded-2xl border-none" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Logs</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {showHistory ? "Transaction History" : "Today's Transactions"}
            </p>
          </div>
        </div>

        <Button 
          variant={showHistory ? "default" : "outline"} 
          className={`h-11 rounded-2xl gap-2 font-bold transition-all ${showHistory ? 'shadow-lg shadow-primary/20' : 'bg-white'}`}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? (
            <><ArrowLeft className="w-4 h-4" /> Back</>
          ) : (
            <><Filter className="w-4 h-4" /> History</>
          )}
        </Button>
      </div>

      {showHistory && (
        <div className="space-y-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-slate-100 font-bold text-sm"
                  />
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 h-11 rounded-xl border-slate-100 font-bold text-sm"
                  />
                </div>
             </div>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input 
                placeholder="Search shop name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-xl border-slate-100 font-bold text-sm"
             />
          </div>
        </div>
      )}

      <div className="space-y-3 px-1">
        {filteredOrders.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold">No results found.</p>
            {!showHistory && (
               <Button 
                variant="ghost" 
                className="mt-4 text-primary font-bold hover:bg-primary/5 rounded-xl"
                onClick={() => setShowHistory(true)}
               >
                 Check Past History
               </Button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const freeItemsCombined = Object.values(
              (order.items || [])
                .filter((item: any) => item.isFree || item.is_free === 1)
                .reduce((acc: Record<string, any>, item: any) => {
                  const key = String(item.productId ?? item.product?.id ?? item.product?.name ?? "unknown");
                  if (!acc[key]) {
                    acc[key] = {
                      ...item,
                      quantity: item.quantity || 0,
                    };
                  } else {
                    acc[key].quantity = (acc[key].quantity || 0) + (item.quantity || 0);
                  }
                  return acc;
                }, {}),
            );
            return (
              <Card 
                key={order.id} 
                className={`overflow-hidden transition-all duration-300 border-border/50 shadow-sm bg-white cursor-pointer ${isExpanded ? 'p-5 rounded-3xl ring-2 ring-primary/10' : 'p-4 rounded-2xl'}`}
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <h3 className={`font-extrabold text-lg leading-tight transition-colors ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>{order.customer?.name}</h3>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                </div>

                {isExpanded && (
                  <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center py-3 border-y border-slate-50 mb-4 bg-slate-50/50 px-3 rounded-xl">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Total Bill</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-black border border-slate-100 uppercase tracking-tight">
                            <Package className="w-3 h-3" />
                            {order.items?.length} Items
                          </span>
                          {(order.items?.some((i: any) => i.isFree || i.is_free === 1)) && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-100 uppercase tracking-tight">
                              <Zap className="w-3 h-3" />
                              {Math.round(order.items?.filter((i: any) => i.isFree || i.is_free === 1).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0))} Free Btls
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Payment</span>
                        <div className="text-xs font-black text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">{order.paymentMode}</div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {/* Main Items */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Main Purchases</span>
                        {order.items?.filter((item: any) => !(item.isFree || item.is_free === 1)).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50/50 border-slate-100/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="text-sm font-bold text-slate-700">
                                {item.product?.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-800">
                                {formatQuantity(
                                  item.quantity * (item.product?.itemsPerCase || 1),
                                  item.product?.itemsPerCase || 1,
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-emerald-600">
                                ₹{Math.round((item.customPrice !== null ? item.customPrice : item.product?.price || 0) * item.quantity)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bonus Items */}
                      {freeItemsCombined.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest pl-1">Bonus Rewards</span>
                          {freeItemsCombined.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border bg-blue-50/50 border-blue-100/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-blue-100 text-blue-400 shadow-sm">
                                  <Zap className="w-4 h-4" />
                                </div>
                                <div className="text-sm font-bold text-blue-700">
                                  {item.product?.name}
                                  <span className="ml-2 text-[9px] font-black uppercase text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">Free</span>
                                </div>
                              </div>
                              <div className="text-right text-sm font-black text-blue-700">
                                {formatQuantity(Math.round(item.quantity), item.product?.itemsPerCase || 1)}
                                <span className="block text-[8px] font-black uppercase text-blue-400 mt-0.5 tracking-tighter">Inventory Deducted</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewOrder(order);
                        }}
                        variant="outline"
                        className="h-10 rounded-xl font-bold"
                      >
                        Print Bill
                      </Button>
                      <EditOrderDialog order={order} onDelete={handleDelete} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!previewOrder} onOpenChange={(open) => !open && setPreviewOrder(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Receipt Preview</DialogTitle>
          </DialogHeader>

          {previewOrder && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mx-auto w-[240px] bg-white border border-slate-200 rounded-md p-2 font-mono text-[11px] leading-tight text-black">
                <div className="text-center font-bold text-sm tracking-wide">CS MARKETING</div>
                <div className="mt-1 border-y border-dashed border-slate-300 py-1 text-center">
                  <div className="font-semibold">INVOICE</div>
                  <div>Order #{previewOrder.id}</div>
                  <div>{new Date((previewOrder as any).date || Date.now()).toLocaleDateString()}</div>
                </div>
                <div className="mt-1">Shop Name - {previewOrder?.customer?.name || "Walk-in Shop"}</div>
                {previewOrder?.customer?.phone ? <div>Phone - {previewOrder.customer.phone}</div> : null}
                <div className="mt-1 border-t border-dashed border-slate-300 pt-1">
                  <div className="mb-1 font-semibold">Items</div>
                  <div className="space-y-0.5 max-h-[30vh] overflow-y-auto pr-1">
                    {previewOrder.items?.map((item: any, i: number) => {
                      const qty = item.isFree
                        ? formatQuantity(item.quantity, item.product?.itemsPerCase || 1)
                        : formatQuantity(
                            item.quantity * (item.product?.itemsPerCase || 1),
                            item.product?.itemsPerCase || 1,
                          );
                      const amount = item.isFree
                        ? "FREE"
                        : `₹${Math.round((item.customPrice || item.product?.price || 0) * item.quantity)}`;
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
                  <span>₹{previewOrder.totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setPreviewOrder(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl font-bold"
              disabled={isPrinting}
              onClick={async () => {
                if (!previewOrder) return;
                if ((navigator as any).bluetooth) {
                  await printReceipt(previewOrder as any);
                } else {
                  handleBrowserPrint(previewOrder);
                }
                setPreviewOrder(null);
              }}
            >
              {isPrinting ? "Connecting..." : "Confirm Print"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
