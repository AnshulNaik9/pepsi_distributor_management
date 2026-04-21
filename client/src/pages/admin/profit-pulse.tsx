import { useState } from "react";
import { useProducts, useUpdateProduct, useGodownStock } from "@/hooks/use-inventory";
import { useOrders } from "@/hooks/use-sales";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, IndianRupee, Percent,
  Package, ArrowUpRight, ArrowDownRight, Edit, Check, X,
  BarChart3, PieChart, AlertTriangle, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils";
import type { Product, Order } from "@shared/schema";

export default function ProfitPulsePage() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders();
  const { data: stock = [] } = useGodownStock();
  const { mutate: updateProduct } = useUpdateProduct();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Compute per-product financials from orders
  const productFinancials = products.map(product => {
    let totalRevenue = 0;
    let totalCasesSold = 0;

    orders.forEach((order: Order) => {
      if (!order.isArchived && order.items) {
        order.items.forEach(item => {
          if (item.productId === product.id && !item.isFree) {
            totalCasesSold += item.quantity;
            totalRevenue += item.quantity * product.price;
          }
        });
      }
    });

    const totalCost = totalCasesSold * (product.purchasePrice || 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const stockItem = stock.find(s => s.productId === product.id);
    const currentStock = stockItem?.casesAvailable || 0;
    const stockValue = currentStock * (product.purchasePrice || 0);

    return {
      product,
      totalRevenue,
      totalCost,
      profit,
      margin,
      totalCasesSold,
      currentStock,
      stockValue,
      hasPurchasePrice: (product.purchasePrice || 0) > 0,
    };
  });

  // Totals
  const overallRevenue = productFinancials.reduce((s, p) => s + p.totalRevenue, 0);
  const overallCost = productFinancials.reduce((s, p) => s + p.totalCost, 0);
  const overallProfit = overallRevenue - overallCost;
  const overallMargin = overallRevenue > 0 ? (overallProfit / overallRevenue) * 100 : 0;
  const totalStockValue = productFinancials.reduce((s, p) => s + p.stockValue, 0);
  const productsWithoutPurchasePrice = productFinancials.filter(p => !p.hasPurchasePrice).length;

  // Sort by profit (descending)
  const sortedFinancials = [...productFinancials]
    .filter(p => p.totalCasesSold > 0)
    .sort((a, b) => b.profit - a.profit);

  const handleSavePurchasePrice = (productId: number) => {
    const price = parseInt(editPrice, 10);
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    updateProduct(
      { id: productId, data: { purchasePrice: price } },
      {
        onSuccess: () => {
          toast({ title: "Purchase price updated" });
          setEditingId(null);
          setEditPrice("");
        },
      }
    );
  };

  // Get order details for a specific product
  const getProductOrders = (productId: number) => {
    const productOrders: { date: Date; customer: string; qty: number; revenue: number; cost: number }[] = [];
    orders.forEach((order: Order) => {
      if (!order.isArchived && order.items) {
        order.items.forEach(item => {
          if (item.productId === productId && !item.isFree) {
            const product = products.find(p => p.id === productId);
            productOrders.push({
              date: new Date(order.date as any),
              customer: order.customer?.name || "Unknown",
              qty: item.quantity,
              revenue: item.quantity * (product?.price || 0),
              cost: item.quantity * (product?.purchasePrice || 0),
            });
          }
        });
      }
    });
    return productOrders.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Profit Pulse
          </h1>
          <p className="text-muted-foreground font-medium mt-1 italic">
             Deep-dive metrics into your business profitability and margins.
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Live Syncing</span>
        </div>
      </div>

      {/* Alert if products missing purchase price */}
      {productsWithoutPurchasePrice > 0 && (
        <Card className="p-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-[2rem] flex items-center gap-5 shadow-lg shadow-amber-900/5 animate-bounce-subtle">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-black text-amber-900">
              Missing Financial Data
            </p>
            <p className="text-sm text-amber-700/80 font-medium">
              {productsWithoutPurchasePrice} product{productsWithoutPurchasePrice > 1 ? "s" : ""} need purchase prices to calculate accurate ROI.
            </p>
          </div>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialCard
          title="Total Revenue"
          value={`₹${overallRevenue.toLocaleString()}`}
          icon={IndianRupee}
          color="emerald"
          subtitle="Gross sales flow"
        />
        <FinancialCard
          title="Total Cost"
          value={`₹${overallCost.toLocaleString()}`}
          icon={BarChart3}
          color="blue"
          subtitle="Inventory overhead"
        />
        <FinancialCard
          title="Net Profit"
          value={`₹${overallProfit.toLocaleString()}`}
          icon={overallProfit >= 0 ? TrendingUp : TrendingDown}
          color={overallProfit >= 0 ? "emerald" : "red"}
          subtitle={overallProfit >= 0 ? "Net growth yield" : "Deficit trend"}
        />
        <FinancialCard
          title="Profit Margin"
          value={`${overallMargin.toFixed(1)}%`}
          icon={Percent}
          color="indigo"
          subtitle={`Assets: ₹${totalStockValue.toLocaleString()}`}
        />
      </div>

      {/* Per-Product Table */}
      <Card className="border-border/40 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] rounded-[2.5rem] bg-white overflow-hidden relative">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <PieChart className="w-6 h-6 text-primary" />
              Breakdown by Product
            </h3>
            <p className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-tighter">Financial performance of individual SKUs</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left py-5 px-8 text-[11px] uppercase tracking-widest font-black text-slate-400">Inventory SKU</th>
                <th className="text-right py-5 px-4 text-[11px] uppercase tracking-widest font-black text-slate-400">Price Points</th>
                <th className="text-right py-5 px-4 text-[11px] uppercase tracking-widest font-black text-slate-400">Units Sold</th>
                <th className="text-right py-5 px-4 text-[11px] uppercase tracking-widest font-black text-slate-400">Financials</th>
                <th className="text-right py-5 px-8 text-[11px] uppercase tracking-widest font-black text-slate-400">Yield</th>
              </tr>
            </thead>
            <tbody>
              {sortedFinancials.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                     <div className="flex flex-col items-center gap-3 opacity-30">
                        <Package className="w-12 h-12" />
                        <p className="font-black uppercase tracking-widest">No Sales Data Available</p>
                     </div>
                  </td>
                </tr>
              )}
              {sortedFinancials.map((item, idx) => (
                <tr
                  key={item.product.id}
                  className={`group border-b border-slate-50/50 hover:bg-slate-50/80 cursor-pointer transition-all duration-200`}
                  onClick={() => setDetailProduct(item.product)}
                >
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-base">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground font-bold">{formatQuantity(item.currentStock * (item.product.itemsPerCase || 1), item.product.itemsPerCase || 1)} reserve</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-sm font-black text-slate-700">SELL: ₹{item.product.price}</div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {editingId === item.product.id ? (
                           <div className="flex items-center gap-1 animate-in zoom-in-95">
                              <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} 
                                onBlur={() => handleSavePurchasePrice(item.product.id)}
                                onKeyDown={e => e.key === 'Enter' && handleSavePurchasePrice(item.product.id)}
                                className="w-16 h-7 text-center font-bold px-1" autoFocus />
                           </div>
                        ) : (
                           <button className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border-2 flex items-center gap-1 transition-all ${item.hasPurchasePrice ? 'border-emerald-100 text-emerald-600' : 'border-amber-200 text-amber-600 bg-amber-50 animate-pulse'}`}
                             onClick={() => { setEditingId(item.product.id); setEditPrice((item.product.purchasePrice || 0).toString()); }}>
                             BUY: {item.hasPurchasePrice ? `₹${item.product.purchasePrice}` : "MISSING"}
                             <Edit className="w-2.5 h-2.5" />
                           </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-right">
                    <div className="text-base font-black text-slate-700">{formatQuantity(item.totalCasesSold * (item.product.itemsPerCase || 1), item.product.itemsPerCase || 1)}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatched</div>
                  </td>
                  <td className="py-6 px-4 text-right">
                     <div className="flex flex-col items-end">
                        <span className="text-base font-black text-emerald-600">₹{item.totalRevenue.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-300">COST: ₹{item.totalCost.toLocaleString()}</span>
                     </div>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-lg font-black ${item.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        ₹{Math.abs(item.profit).toLocaleString()}
                        {item.profit >= 0 ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                      </span>
                      {item.hasPurchasePrice ? (
                        <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                          item.margin >= 20 ? "bg-emerald-100 text-emerald-700" : item.margin >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>
                          {item.margin.toFixed(1)}% ROI
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 italic uppercase">Undefined</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={o => !o && setDetailProduct(null)}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          {detailProduct && (
            <div className="bg-white">
              <div className="bg-slate-900 p-8 text-white relative">
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
                 <div className="relative z-10 flex items-center justify-between">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                          <Package className="w-6 h-6 text-primary" />
                          <h2 className="text-2xl font-black tracking-tight uppercase">{detailProduct.name}</h2>
                       </div>
                       <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Transaction History & Logistics Analysis</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Yield Score</p>
                       <p className="text-xl font-black text-emerald-400 text-right">{productFinancials.find(p => p.product.id === detailProduct.id)?.margin.toFixed(1)}%</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Visual Stats */}
                <div className="grid grid-cols-3 gap-6">
                   <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform"><IndianRupee className="w-12 h-12" /></div>
                      <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2">Revenue</p>
                      <p className="text-2xl font-black text-emerald-900 tracking-tighter">₹{productFinancials.find(p => p.product.id === detailProduct.id)?.totalRevenue.toLocaleString()}</p>
                   </div>
                   <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform"><BarChart3 className="w-12 h-12" /></div>
                      <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2">Cost (COGS)</p>
                      <p className="text-2xl font-black text-blue-900 tracking-tighter">₹{productFinancials.find(p => p.product.id === detailProduct.id)?.totalCost.toLocaleString()}</p>
                   </div>
                   <div className="p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 opacity-10 scale-150 -rotate-12 group-hover:scale-125 transition-transform"><TrendingUp className="w-12 h-12" /></div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Profit</p>
                      <p className="text-2xl font-black text-white tracking-tighter">₹{productFinancials.find(p => p.product.id === detailProduct.id)?.profit.toLocaleString()}</p>
                   </div>
                </div>

                <div>
                  <h4 className="text-lg font-black mb-4 px-1 text-slate-800 tracking-tight flex items-center gap-2">
                     <History className="w-5 h-5 text-primary" /> Recent Dispatches
                  </h4>
                  <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80">
                          <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Date</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Customer Outlet</th>
                          <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Qty</th>
                          <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Profit Yield</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getProductOrders(detailProduct.id).map((o, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 text-slate-500 font-bold">{o.date.toLocaleDateString()}</td>
                            <td className="py-4 px-6 font-black text-slate-800">{o.customer}</td>
                            <td className="py-4 px-6 text-right font-black text-slate-700">{formatQuantity(o.qty * (detailProduct.itemsPerCase || 1), detailProduct.itemsPerCase || 1)}</td>
                            <td className={`py-4 px-6 text-right font-black ${o.revenue - o.cost >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              ₹{(o.revenue - o.cost).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancialCard({ title, value, icon: Icon, color, subtitle }: any) {
  const themes: any = {
    emerald: "from-emerald-600 to-teal-600 shadow-emerald-900/10",
    blue: "from-blue-600 to-indigo-600 shadow-blue-900/10",
    red: "from-red-600 to-rose-600 shadow-red-900/10",
    indigo: "from-indigo-600 to-violet-600 shadow-indigo-900/10",
  };

  const currentTheme = themes[color] || themes.blue;

  return (
    <Card className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${currentTheme} text-white shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
      <div className="relative z-10 flex flex-col h-full">
         <div className="flex items-center justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
               <Icon className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Insight</span>
         </div>
         <div className="mt-auto">
            <h4 className="text-3xl font-black tracking-tighter mb-1">{value}</h4>
            <div className="flex flex-col">
               <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{title}</span>
               <p className="text-[9px] font-bold opacity-50 uppercase mt-1 tracking-tighter">{subtitle}</p>
            </div>
         </div>
      </div>
    </Card>
  );
}
